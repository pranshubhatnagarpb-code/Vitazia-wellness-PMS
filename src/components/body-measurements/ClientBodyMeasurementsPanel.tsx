import { useState } from 'react';
import { DataTable } from '@/components/dashboard/DataTable';
import { BodyMeasurementFormDialog } from './BodyMeasurementFormDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  BodyMeasurementInput,
  BodyMeasurementWithClientName,
  useBodyMeasurements,
  useCreateBodyMeasurement,
  useDeleteBodyMeasurement,
  useUpdateBodyMeasurement,
} from '@/hooks/useBodyMeasurements';

interface Props {
  clientId: string;
  clientName: string;
}

const formatValue = (value: number | null | undefined, suffix = '') =>
  value === null || value === undefined ? '—' : `${value}${suffix}`;

// Client-scoped view of the body_measurements table (BCA/InBody-style
// readings). Replaces the old client_measurements-backed "Client
// Measurements" section, which was a near-duplicate of this data — see
// CLAUDE.md's "Feature: Automated BMI in PMS" for the two-tables history.
export const ClientBodyMeasurementsPanel = ({ clientId, clientName }: Props) => {
  const { data: measurements = [], isLoading } = useBodyMeasurements(clientId);
  const createMeasurement = useCreateBodyMeasurement();
  const updateMeasurement = useUpdateBodyMeasurement();
  const deleteMeasurement = useDeleteBodyMeasurement();

  const [formOpen, setFormOpen] = useState(false);
  const [editingMeasurement, setEditingMeasurement] = useState<BodyMeasurementWithClientName | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BodyMeasurementWithClientName | null>(null);

  const handleCreate = async (data: BodyMeasurementInput) => {
    await createMeasurement.mutateAsync(data);
    toast.success('Measurement added successfully!');
    setFormOpen(false);
  };

  const handleUpdate = async (data: BodyMeasurementInput) => {
    if (!editingMeasurement) return;
    await updateMeasurement.mutateAsync({ id: editingMeasurement.id, client_id: editingMeasurement.client_id, ...data });
    toast.success('Measurement updated successfully!');
    setEditingMeasurement(null);
    setFormOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteMeasurement.mutateAsync({ id: deleteTarget.id, clientId: deleteTarget.client_id });
    toast.success('Measurement deleted successfully!');
    setDeleteTarget(null);
  };

  const columns = [
    {
      key: 'measurement_date',
      header: 'Date',
      render: (item: BodyMeasurementWithClientName) => new Date(item.measurement_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    },
    { key: 'weight', header: 'Weight', render: (item: BodyMeasurementWithClientName) => formatValue(item.weight, ' kg') },
    { key: 'bmi', header: 'BMI', render: (item: BodyMeasurementWithClientName) => formatValue(item.bmi) },
    { key: 'body_fat_percent', header: 'Body Fat %', render: (item: BodyMeasurementWithClientName) => formatValue(item.body_fat_percent) },
    { key: 'waist', header: 'Waist', render: (item: BodyMeasurementWithClientName) => formatValue(item.waist) },
    { key: 'hip', header: 'Hip', render: (item: BodyMeasurementWithClientName) => formatValue(item.hip) },
    { key: 'chest', header: 'Chest', render: (item: BodyMeasurementWithClientName) => formatValue(item.chest) },
    { key: 'arm', header: 'Arm', render: (item: BodyMeasurementWithClientName) => formatValue(item.arm) },
    { key: 'thigh', header: 'Thigh', render: (item: BodyMeasurementWithClientName) => formatValue(item.thigh) },
    { key: 'neck', header: 'Neck', render: (item: BodyMeasurementWithClientName) => formatValue(item.neck) },
    {
      key: 'notes',
      header: 'Notes',
      render: (item: BodyMeasurementWithClientName) => item.notes ? (
        <Badge variant="secondary" className="max-w-[160px] truncate">{item.notes}</Badge>
      ) : '—',
    },
    {
      key: 'actions',
      header: '',
      render: (item: BodyMeasurementWithClientName) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => { setEditingMeasurement(item); setFormOpen(true); }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteTarget(item)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Body Measurements — {clientName}</h3>
        <Button size="sm" onClick={() => { setEditingMeasurement(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Measurement
        </Button>
      </div>

      <DataTable
        title=""
        columns={columns as any}
        data={measurements}
        emptyMessage={isLoading ? 'Loading measurements...' : 'No measurements recorded yet.'}
      />

      <BodyMeasurementFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingMeasurement(null); }}
        measurement={editingMeasurement}
        defaultClientId={clientId}
        onSubmit={editingMeasurement ? handleUpdate : handleCreate}
        isLoading={createMeasurement.isPending || updateMeasurement.isPending}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Measurement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this dated measurement entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
