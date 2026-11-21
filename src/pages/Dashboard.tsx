import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { InfoCard } from '@/components/dashboard/InfoCard';
import { DataTable } from '@/components/dashboard/DataTable';
import { Sparkline } from '@/components/dashboard/Sparkline';
import {
  useDashboardStats,
  useDashboardTrends,
  useTodaysAppointments,
  useUpcomingReceivables,
  useBalanceReceivables,
  useServiceRenewalReminders,
  useAtRiskClients,
} from '@/hooks/useDashboardData';
import { useTodaysBirthdays } from '@/hooks/useClients';
import { Home, ChevronRight, Users, TrendingUp, CalendarClock, ClipboardList } from 'lucide-react';
import { AppointmentFormDialog } from '@/components/appointments/AppointmentFormDialog';
import { StatusDot } from '@/components/ui/StatusDot';

const Dashboard = () => {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: trends } = useDashboardTrends();
  const { data: appointments = [] } = useTodaysAppointments();
  const { data: birthdays = [] } = useTodaysBirthdays();
  const { data: balanceReceivables = [] } = useBalanceReceivables();
  const { data: serviceRenewals = [] } = useServiceRenewalReminders();
  const { data: atRiskClients = [] } = useAtRiskClients();

  const serviceRenewalColumns = [
    { 
      key: 'name', 
      header: 'Client Name',
      render: (item: any) => (
        <span className="text-primary font-medium cursor-pointer hover:underline">
          {item.name || '-'}
        </span>
      )
    },
    { 
      key: 'service_end_date', 
      header: 'End Date',
      render: (item: any) => new Date(item.service_end_date).toLocaleDateString()
    },
    { 
      key: 'days_left', 
      header: 'Status',
      render: (item: any) => (
        <span className={item.days_left <= 0 ? 'text-destructive font-semibold' : item.days_left <= 3 ? 'text-orange-600 font-medium' : 'text-muted-foreground'}>
          {item.days_left <= 0 ? `Expired ${Math.abs(item.days_left)}d ago` : `${item.days_left}d left`}
        </span>
      )
    },
  ];

  const balanceReceivableColumns = [
    { 
      key: 'name', 
      header: 'Client Name',
      render: (item: any) => (
        <span className="text-primary font-medium cursor-pointer hover:underline">
          {item.name || '-'}
        </span>
      )
    },
    { 
      key: 'total_receivables', 
      header: 'Unpaid Amount',
      render: (item: any) => `₹${Number(item.total_receivables || 0).toLocaleString()}`
    },
    { 
      key: 'phone', 
      header: 'Mobile',
      render: (item: any) => item.phone || '-'
    },
  ];

  const atRiskClientsColumns = [
    { 
      key: 'name', 
      header: 'Client Name',
      render: (item: any) => (
        <span className="text-primary font-medium cursor-pointer hover:underline">
          {item.name || '-'}
        </span>
      )
    },
    { 
      key: 'status', 
      header: 'Expiry Status',
      render: (item: any) => (
        <div className="flex items-center gap-2">
          <StatusDot color={item.color} size="sm" />
          <span className="text-sm">{item.display}</span>
        </div>
      )
    },
    { 
      key: 'phone', 
      header: 'Mobile',
      render: (item: any) => item.phone || '-'
    },
  ];

  return (
    <DashboardLayout>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-5">
        <Home className="h-3.5 w-3.5" />
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">Dashboard</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Overview of your clinic activity</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StatCard
          title="Total Active Clients"
          value={statsLoading ? '—' : String(stats?.totalActiveClients || 0)}
          tooltip="Number of currently active clients"
          icon={<Users className="h-5 w-5" />}
          iconColor="bg-primary/10 text-primary"
        />
        <StatCard
          title="Service Sales This Month"
          value={statsLoading ? '—' : String(stats?.serviceSalesThisMonth || 0)}
          tooltip="Number of clients onboarded this month with fees"
          icon={<TrendingUp className="h-5 w-5" />}
          iconColor="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="Today's Session"
          value={trends ? String(trends.todaysSessionsCount) : String(appointments.length)}
          tooltip="Appointments today, with the daily count for every day over the last month"
          icon={<CalendarClock className="h-5 w-5" />}
          iconColor="bg-blue-50 text-blue-600"
        >
          {trends?.todaysSessionsTrend && (
            <Sparkline data={trends.todaysSessionsTrend} labels={trends.todaysSessionsLabels} color="#2563eb" />
          )}
        </StatCard>
        <StatCard
          title="Pending Plans"
          value={trends ? String(trends.pendingPlansCount) : String(atRiskClients.length)}
          tooltip="Active clients whose diet plan ends in the next 1-2 days, with how many end on each day over the next month"
          icon={<ClipboardList className="h-5 w-5" />}
          iconColor="bg-amber-50 text-amber-600"
        >
          {trends?.pendingPlansTrend && (
            <Sparkline data={trends.pendingPlansTrend} labels={trends.pendingPlansLabels} color="#d97706" />
          )}
        </StatCard>
      </div>

      {/* Info Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <InfoCard
          title="Today's Birthday/Anniversary"
          tooltip="Clients with birthday or anniversary today"
        >
          {birthdays.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">
              No birthdays/anniversaries today
            </p>
          ) : (
            <ul className="space-y-2">
              {birthdays.map((item: any) => (
                <li key={item.id} className="text-sm">{item.name}</li>
              ))}
            </ul>
          )}
        </InfoCard>

        <InfoCard
          title="Today's Appointments"
          tooltip="Scheduled appointments for today"
          customAction={<AppointmentFormDialog />}
        >
          {appointments.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">
              No appointments today
            </p>
          ) : (
            <ul className="space-y-2">
              {appointments.map((item: any) => (
                <li key={item.id} className="text-sm">
                  {item.clients?.name} - {item.appointment_time?.slice(0, 5)}
                </li>
              ))}
            </ul>
          )}
        </InfoCard>

        <InfoCard
          title="Pending List"
          tooltip="Clients with diet plans expiring in 1-2 days (red or yellow status)"
        >
          {atRiskClients.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">
              Nothing pending
            </p>
          ) : (
            <ul className="space-y-2">
              {atRiskClients.map((item: any) => (
                <li key={item.id} className="flex items-center gap-2 text-sm">
                  <StatusDot color={item.color} size="sm" />
                  <span>{item.name}</span>
                  <span className="text-muted-foreground">({item.display})</span>
                </li>
              ))}
            </ul>
          )}
        </InfoCard>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DataTable
          title="Service Renewal Reminders"
          tooltip="Clients whose service is ending within 7 days or already expired"
          columns={serviceRenewalColumns}
          data={serviceRenewals}
          emptyMessage="No upcoming renewals"
        />

        <DataTable
          title="Balance Receivable"
          tooltip="Outstanding payment balances"
          columns={balanceReceivableColumns}
          data={balanceReceivables}
          emptyMessage="No outstanding balances"
        />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
