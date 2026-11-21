import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const { count: activeClients, error: clientsError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      if (clientsError) throw clientsError;

      // Count clients added this month with total_fees > 0
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { count: serviceSales, error: salesError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstOfMonth)
        .gt('total_fees', 0);

      if (salesError) throw salesError;

      return {
        totalActiveClients: activeClients || 0,
        serviceSalesThisMonth: serviceSales || 0,
      };
    },
  });
};

// Real, queryable day-by-day trends for the dashboard stat card sparklines.
// Each series is an actual count bucketed by day — never randomized or
// predicted — so the shape shown is exactly what happened (or, for pending
// plans, exactly what's already scheduled to happen from data on file).
export const useDashboardTrends = () => {
  return useQuery({
    queryKey: ['dashboard', 'trends'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      // index 0 = (today - (days-1)), index (days-1) = today
      const bucketPastDays = (dates: Date[], days: number) => {
        const buckets = new Array(days).fill(0);
        const start = new Date(today);
        start.setDate(start.getDate() - (days - 1));
        dates.forEach((d) => {
          const day = new Date(d);
          day.setHours(0, 0, 0, 0);
          const offset = Math.round((day.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          if (offset >= 0 && offset < days) buckets[offset] += 1;
        });
        return buckets;
      };

      // index 0 = today, index (days-1) = (today + (days-1))
      const bucketForwardDays = (daysRemainingValues: number[], days: number) => {
        const buckets = new Array(days).fill(0);
        daysRemainingValues.forEach((v) => {
          if (v >= 0 && v < days) buckets[v] += 1;
        });
        return buckets;
      };

      const formatDay = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

      // Labels for a past-looking range: index 0 = (today - (days-1)), index (days-1) = today
      const pastDayLabels = (days: number) => {
        const labels: string[] = [];
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          labels.push(formatDay(d));
        }
        return labels;
      };

      // Labels for a forward-looking range: index 0 = today, index (days-1) = (today + (days-1))
      const forwardDayLabels = (days: number) => {
        const labels: string[] = [];
        for (let i = 0; i < days; i++) {
          const d = new Date(today);
          d.setDate(d.getDate() + i);
          labels.push(formatDay(d));
        }
        return labels;
      };

      // Today's Session — appointments per day, every day for the last 30 days (today included).
      const sessionsRangeStart = new Date(today);
      sessionsRangeStart.setDate(sessionsRangeStart.getDate() - 29);
      const { data: appointmentRows, error: appointmentsError } = await supabase
        .from('appointments')
        .select('appointment_date')
        .gte('appointment_date', sessionsRangeStart.toISOString().split('T')[0])
        .lte('appointment_date', todayStr);
      if (appointmentsError) throw appointmentsError;
      const todaysSessionsTrend = bucketPastDays(
        (appointmentRows || []).map((r: any) => new Date(r.appointment_date)),
        30
      );
      const todaysSessionsCount = todaysSessionsTrend[todaysSessionsTrend.length - 1] || 0;
      const todaysSessionsLabels = pastDayLabels(30);

      // Pending Plans — how many active clients' current diet plan ends on
      // each day of the next 30 days (today = 0 days remaining ... 29 days out).
      const { data: clientsWithPlans, error: plansError } = await supabase
        .from('clients')
        .select(CLIENT_WITH_PLANS_SELECT)
        .eq('is_active', true);
      if (plansError) throw plansError;
      const daysRemainingValues = (clientsWithPlans || [])
        .map((client: any) => getClientPlanStatus(client, today)?.daysRemaining)
        .filter((v: any): v is number => typeof v === 'number');
      const pendingPlansTrend = bucketForwardDays(daysRemainingValues, 30);
      const pendingPlansCount = daysRemainingValues.filter((v) => v >= 0 && v <= 2).length;
      const pendingPlansLabels = forwardDayLabels(30);

      return {
        todaysSessionsTrend,
        todaysSessionsCount,
        todaysSessionsLabels,
        pendingPlansTrend,
        pendingPlansCount,
        pendingPlansLabels,
      };
    },
  });
};

export const useTodaysAppointments = () => {
  return useQuery({
    queryKey: ['appointments', 'today'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_time,
          appointment_type,
          status,
          clients (
            id,
            name
          )
        `)
        .eq('appointment_date', today)
        .order('appointment_time');
      
      if (error) throw error;
      return data || [];
    },
  });
};

export const useTodaysFollowups = () => {
  return useQuery({
    queryKey: ['followups', 'today'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('lead_followups')
        .select('*')
        .eq('followup_date', today)
        .eq('status', 'pending')
        .order('followup_time');
      
      if (error) throw error;
      return data || [];
    },
  });
};

export const useUpcomingReceivables = () => {
  return useQuery({
    queryKey: ['receivables', 'upcoming'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('receivables')
        .select(`
          id,
          service_name,
          amount,
          due_date,
          status,
          clients (
            id,
            name,
            phone
          )
        `)
        .gte('due_date', today)
        .neq('status', 'paid')
        .order('due_date')
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
  });
};

export const useServiceRenewalReminders = () => {
  return useQuery({
    queryKey: ['clients', 'service-renewals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, phone, service_start_date, service_duration_months, service_paused_days')
        .not('service_start_date', 'is', null)
        .not('service_duration_months', 'is', null)
        .eq('is_active', true);

      if (error) throw error;

      const now = new Date();
      const reminders = (data || [])
        .map((client: any) => {
          const start = new Date(client.service_start_date);
          const end = new Date(start);
          end.setMonth(end.getMonth() + client.service_duration_months);
          const pausedDays = Number(client.service_paused_days) || 0;
          if (pausedDays > 0) {
            end.setDate(end.getDate() + pausedDays);
          }
          const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return { ...client, service_end_date: end.toISOString().split('T')[0], days_left: daysLeft };
        })
        .filter((c: any) => c.days_left <= 7 && c.days_left >= -30)
        .sort((a: any, b: any) => a.days_left - b.days_left);

      return reminders;
    },
  });
};

export const useBalanceReceivables = () => {
  return useQuery({
    queryKey: ['clients', 'balance-receivables'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, phone, total_fees, total_receivables')
        .gt('total_receivables', 0)
        .eq('is_active', true)
        .order('total_receivables', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });
};

// Get start date from AI plan data, database, or fall back to created_at
const getPlanStartDate = (plan: any) => {
  if (plan.is_ai_generated && plan.ai_plan_data && plan.ai_plan_data.editableStartDate) {
    return new Date(plan.ai_plan_data.editableStartDate);
  }
  if (plan.is_ai_generated && plan.ai_plan_data && plan.ai_plan_data.startDate) {
    return new Date(plan.ai_plan_data.startDate);
  }
  if (plan.start_date) {
    return new Date(plan.start_date);
  }
  return new Date(plan.created_at);
};

// Get actual number of days from plan data
const getPlanDayCount = (plan: any) => {
  if (plan.is_ai_generated && plan.ai_plan_data && plan.ai_plan_data.editableDayCount) {
    return parseInt(plan.ai_plan_data.editableDayCount);
  }
  if (plan.diet_plan_days && plan.diet_plan_days.length > 0) {
    return plan.diet_plan_days.length;
  }
  if (plan.is_ai_generated && plan.ai_plan_data && plan.ai_plan_data.dayGroups) {
    let totalDays = 0;
    plan.ai_plan_data.dayGroups.forEach((group: any) => {
      if (group.label) {
        const daysInLabel = group.label.split(/ & |, | &/).length;
        totalDays += daysInLabel;
      } else {
        totalDays += 1;
      }
    });
    return totalDays;
  }
  return 0;
};

// Diet-plan-expiry status for one client — returns null for clients with
// no plan on file. `today` is passed in (rather than computed internally)
// so every caller works off the exact same "now" within a single query.
// Shared by useAtRiskClients (the Pending List) and useDashboardTrends
// (the Pending Plans sparkline), so both stay consistent with each other.
export const getClientPlanStatus = (
  client: any,
  today: Date
): { daysRemaining: number; color: 'green' | 'yellow' | 'red' | 'black' } | null => {
  const dietPlans = client.diet_plans || [];
  if (dietPlans.length === 0) return null;

  const currentPlan = dietPlans
    .sort((a: any, b: any) => getPlanStartDate(b).getTime() - getPlanStartDate(a).getTime())[0];
  if (!currentPlan) return null;

  const actualPlanDuration = getPlanDayCount(currentPlan) || 7;

  let endDate = currentPlan.end_date;
  if (!endDate) {
    const startDate = getPlanStartDate(currentPlan);
    startDate.setDate(startDate.getDate() + actualPlanDuration - 1);
    endDate = startDate.toISOString().split('T')[0];
  }
  if (!endDate) return null;

  const finalEndDate = new Date(endDate);
  finalEndDate.setHours(0, 0, 0, 0);
  const daysRemaining = Math.ceil((finalEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let color: 'green' | 'yellow' | 'red' | 'black';
  if (daysRemaining > 2) color = 'green';
  else if (daysRemaining === 2) color = 'yellow';
  else if (daysRemaining === 1) color = 'red';
  else color = 'black';

  return { daysRemaining, color };
};

// Shape of a client row with its diet plans joined, as selected by both
// useAtRiskClients and useDashboardTrends.
export const CLIENT_WITH_PLANS_SELECT = `
  id,
  name,
  phone,
  diet_plans (
    id,
    start_date,
    end_date,
    status,
    is_ai_generated,
    ai_plan_data,
    created_at,
    diet_plan_days (
      id
    )
  )
`;

export const useAtRiskClients = () => {
  return useQuery({
    queryKey: ['clients', 'at-risk'],
    queryFn: async () => {
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select(CLIENT_WITH_PLANS_SELECT)
        .eq('is_active', true);

      if (clientsError) throw clientsError;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      // In practice, the day a client's appointment falls is also the day
      // their current diet plan runs out and a new one gets handed over —
      // so a same-day meeting is its own signal, independent of whatever
      // end_date happens to be on file (which may be stale or missing).
      const { data: todaysAppointments, error: apptError } = await supabase
        .from('appointments')
        .select('client_id, clients ( id, name, phone )')
        .eq('appointment_date', todayStr);

      if (apptError) throw apptError;

      const meetingTodayIds = new Set((todaysAppointments || []).map((a: any) => a.client_id));

      const atRiskClients = (clients || []).map((client: any) => {
        const status = getClientPlanStatus(client, today);

        // Existing logic, unchanged: diet plan expiring in 1-2 days.
        if (status && (status.color === 'yellow' || status.color === 'red')) {
          return {
            id: client.id,
            name: client.name,
            phone: client.phone,
            daysRemaining: status.daysRemaining,
            color: status.color,
            display: status.color === 'yellow' ? '2 days left' : '1 day left',
          };
        }

        // New: include anyone with a meeting today who wasn't already
        // caught above, regardless of what their on-file plan says.
        if (meetingTodayIds.has(client.id)) {
          return {
            id: client.id,
            name: client.name,
            phone: client.phone,
            daysRemaining: status?.daysRemaining ?? null,
            color: 'grey' as const,
            display: 'Meeting today',
          };
        }

        return null;
      }).filter(Boolean) as any[];

      // Safety net: a client with a meeting today who, for some reason,
      // wasn't in the active-clients query above (e.g. flagged inactive)
      // still gets surfaced, sourced straight from the appointment join.
      const includedIds = new Set(atRiskClients.map((c) => c.id));
      const seen = new Set<string>();
      for (const appt of todaysAppointments || []) {
        const c = (appt as any).clients;
        if (!c || includedIds.has(c.id) || seen.has(c.id)) continue;
        seen.add(c.id);
        atRiskClients.push({
          id: c.id,
          name: c.name,
          phone: c.phone,
          daysRemaining: null,
          color: 'grey',
          display: 'Meeting today',
        });
      }

      return atRiskClients;
    },
  });
};

