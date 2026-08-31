import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useClientRenewals } from '@/hooks/useServiceRenewals';
import { RenewServiceDialog } from './RenewServiceDialog';
import type { Client } from '@/hooks/useClients';

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const ServiceRenewalHistory = ({ client }: { client: Client }) => {
  const { data: renewals = [], isLoading } = useClientRenewals(client.id);
  const [renewOpen, setRenewOpen] = useState(false);

  const isExpired = client.service_end_date ? new Date(client.service_end_date) < new Date(new Date().toDateString()) : false;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <CardHeader className="p-0"><CardTitle className="text-sm">Current Service</CardTitle></CardHeader>
            <Button size="sm" onClick={() => setRenewOpen(true)}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Renew Service
            </Button>
          </div>

          {!client.is_active && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {isExpired
                ? "This client's service period has ended. Diet chart generation and portal access are disabled until renewed."
                : 'This client is marked inactive.'}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Start Date</p>
              <p className="text-sm">{fmtDate(client.service_start_date)}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Duration</p>
              <p className="text-sm">{client.service_duration_months ? `${client.service_duration_months} month(s)` : '—'}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">End Date</p>
              <p className={`text-sm font-medium ${isExpired ? 'text-destructive' : ''}`}>{fmtDate(client.service_end_date)}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Paused Days</p>
              <p className="text-sm">{client.service_paused_days ?? 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <CardHeader className="p-0 pb-3"><CardTitle className="text-sm">Renewal History</CardTitle></CardHeader>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : renewals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No renewals recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {renewals.map((r) => (
                <div key={r.id} className="rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="font-medium">
                      {fmtDate(r.previous_service_end_date)} → {fmtDate(r.new_service_end_date)}
                    </span>
                    <span className="text-xs text-muted-foreground">{fmtDateTime(r.renewed_at)}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {r.new_service_duration_months} month(s) from {fmtDate(r.new_service_start_date)}
                    {r.renewed_by_email && <> · Renewed by {r.renewed_by_email}</>}
                    {r.amount_paid != null && <> · ₹{r.amount_paid}</>}
                  </div>
                  {r.notes && <p className="mt-1.5 text-xs text-foreground">{r.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <RenewServiceDialog client={client} open={renewOpen} onOpenChange={setRenewOpen} />
    </div>
  );
};
