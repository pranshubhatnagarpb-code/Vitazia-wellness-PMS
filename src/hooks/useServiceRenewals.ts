import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Client } from './useClients';

export interface ServiceRenewal {
  id: string;
  client_id: string;
  renewed_by: string | null;
  renewed_by_email: string | null;
  renewed_at: string;
  previous_service_start_date: string | null;
  previous_service_duration_months: number | null;
  previous_service_end_date: string | null;
  previous_service_paused_days: number | null;
  new_service_start_date: string;
  new_service_duration_months: number;
  new_service_end_date: string | null;
  amount_paid: number | null;
  notes: string | null;
  created_at: string;
}

export const useClientRenewals = (clientId: string | undefined) => {
  return useQuery({
    queryKey: ['client-renewals', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_service_renewals')
        .select('*')
        .eq('client_id', clientId)
        .order('renewed_at', { ascending: false });

      if (error) throw error;
      return data as ServiceRenewal[];
    },
    enabled: !!clientId,
  });
};

export interface RenewClientServiceInput {
  clientId: string;
  newStartDate: string;
  newDurationMonths: number;
  amountPaid?: number | null;
  notes?: string | null;
  renewedByEmail?: string | null;
}

export const useRenewClientService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RenewClientServiceInput) => {
      const { data, error } = await supabase.rpc('renew_client_service', {
        p_client_id: input.clientId,
        p_new_start_date: input.newStartDate,
        p_new_duration_months: input.newDurationMonths,
        p_amount_paid: input.amountPaid ?? null,
        p_notes: input.notes ?? null,
        p_renewed_by_email: input.renewedByEmail ?? null,
      });

      if (error) throw error;
      return data as unknown as Client;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['client', input.clientId] });
      queryClient.invalidateQueries({ queryKey: ['client-renewals', input.clientId] });
      toast.success('Service renewed');
    },
    onError: (error: Error) => {
      toast.error('Failed to renew service', { description: error.message });
    },
  });
};
