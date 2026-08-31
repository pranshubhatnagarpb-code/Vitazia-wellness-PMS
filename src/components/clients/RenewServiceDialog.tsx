import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useRenewClientService } from '@/hooks/useServiceRenewals';
import type { Client } from '@/hooks/useClients';

interface Props {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

const fmt = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const RenewServiceDialog = ({ client, open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const renewService = useRenewClientService();

  const [startDate, setStartDate] = useState(todayStr());
  const [durationMonths, setDurationMonths] = useState(
    client.service_duration_months ? String(client.service_duration_months) : ''
  );
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');

  const months = parseInt(durationMonths || '0');
  const previewEnd = (() => {
    if (!startDate || !months) return null;
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 10);
  })();

  const handleSubmit = async () => {
    if (!startDate || !months) return;
    await renewService.mutateAsync({
      clientId: client.id,
      newStartDate: startDate,
      newDurationMonths: months,
      amountPaid: amountPaid ? parseFloat(amountPaid) : null,
      notes: notes.trim() || null,
      renewedByEmail: user?.email ?? null,
    });
    onOpenChange(false);
    setAmountPaid('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Renew Service</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current status:</span>
              <span className="font-medium">{client.is_active ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-muted-foreground">Current end date:</span>
              <span className="font-medium">{fmt(client.service_end_date)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new_start_date">New Start Date</Label>
              <Input
                id="new_start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_duration_months">Duration (Months)</Label>
              <Input
                id="new_duration_months"
                type="number"
                min="1"
                value={durationMonths}
                onChange={(e) => setDurationMonths(e.target.value)}
                placeholder="e.g., 3"
              />
            </div>
          </div>

          {previewEnd && (
            <div className="rounded-md border bg-primary/5 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">New end date:</span>
                <span className="font-semibold text-primary">{fmt(previewEnd)}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount_paid">Amount Collected (optional)</Label>
            <Input
              id="amount_paid"
              type="number"
              min="0"
              step="0.01"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder="e.g., 15000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="renewal_notes">Notes (optional)</Label>
            <Textarea
              id="renewal_notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything worth noting about this renewal"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!startDate || !months || renewService.isPending}>
            {renewService.isPending ? 'Renewing…' : 'Renew Service'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
