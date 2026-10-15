import { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateTemplate, type TemplateDay, type TemplateMeal } from '@/hooks/useDietChartTemplates';

const CATEGORIES = ['Weight Loss', 'PCOD/PCOS', 'Diabetes', 'Thyroid', 'Muscle Gain', 'General Wellness', 'Pregnancy', 'Post Surgery'];

interface SheetPreview {
  name: string;
  days: TemplateDay[];
  error?: string;
}

// Matches "Note: ..." whether it follows a newline or just trails the
// preceding text directly, e.g. "...100g) Note: use 1 tsp of ghee".
const NOTE_RE = /\s*\n?\s*note\s*:\s*/i;

function splitMealCell(raw: unknown): { meal: string; notes: string } {
  if (raw === null || raw === undefined || raw === '') return { meal: '', notes: '' };
  const text = String(raw).trim();
  const match = text.match(NOTE_RE);
  if (match && match.index !== undefined) {
    return {
      meal: text.slice(0, match.index).trim(),
      notes: text.slice(match.index + match[0].length).trim(),
    };
  }
  return { meal: text, notes: '' };
}

// A header like "Lunch - 01:00 PM" splits into label "Lunch" and time
// "01:00 PM"; a header with no dash (e.g. just "Lunch") keeps the whole
// thing as the label with no time.
function headerToLabelAndTime(header: string): { label: string; time: string } {
  const h = header.trim();
  const idx = h.lastIndexOf('-');
  if (idx > 0) {
    return { label: h.slice(0, idx).trim(), time: h.slice(idx + 1).trim() };
  }
  return { label: h, time: '' };
}

// Expects: row 1 = headers (column A is the day label column, every other
// non-empty header column is a meal period); rows below are one per day,
// read until the first row whose day-label column is empty. This is the
// layout used by this clinic's diet-chart spreadsheets.
function parseSheet(sheet: XLSX.WorkSheet): TemplateDay[] {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });
  if (rows.length === 0) return [];
  const header = rows[0] as unknown[];
  const periodCols: { col: number; label: string; time: string }[] = [];
  for (let col = 1; col < header.length; col++) {
    const h = header[col];
    if (h !== null && h !== undefined && String(h).trim() !== '') {
      const { label, time } = headerToLabelAndTime(String(h));
      periodCols.push({ col, label, time });
    }
  }
  if (periodCols.length === 0) return [];

  const days: TemplateDay[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = (rows[r] ?? []) as unknown[];
    const dayVal = row[0];
    if (dayVal === null || dayVal === undefined || String(dayVal).trim() === '') break;
    const meals: TemplateMeal[] = periodCols.map(({ col, label, time }) => {
      const { meal, notes } = splitMealCell(row[col]);
      return {
        time,
        meal: meal ? `${label}: ${meal}` : label,
        alternatives: '',
        notes,
      };
    });
    days.push({ day: String(dayVal).trim(), meals });
  }
  return days;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ImportTemplatesDialog = ({ open, onOpenChange }: Props) => {
  const createTemplate = useCreateTemplate();

  const [fileName, setFileName] = useState('');
  const [sheets, setSheets] = useState<SheetPreview[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [category, setCategory] = useState('General Wellness');
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<{ name: string; success: boolean; error?: string }[] | null>(null);

  const reset = () => {
    setFileName('');
    setSheets([]);
    setSelected({});
    setResults(null);
  };

  const handleFile = async (file: File) => {
    reset();
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const parsed: SheetPreview[] = wb.SheetNames.map((name) => {
        try {
          const days = parseSheet(wb.Sheets[name]);
          return { name, days, error: days.length === 0 ? 'No day rows detected' : undefined };
        } catch (e: any) {
          return { name, days: [], error: e?.message || 'Failed to parse this tab' };
        }
      });
      setSheets(parsed);
      const initialSelected: Record<string, boolean> = {};
      parsed.forEach((s) => { initialSelected[s.name] = !s.error; });
      setSelected(initialSelected);
    } catch (e: any) {
      toast.error(`Failed to read file: ${e?.message || 'unknown error'}`);
    }
  };

  const selectedSheets = sheets.filter((s) => selected[s.name] && !s.error);

  const handleImport = async () => {
    if (selectedSheets.length === 0) return;
    setIsImporting(true);
    const outcomes: { name: string; success: boolean; error?: string }[] = [];
    for (const sheet of selectedSheets) {
      const name = sheet.name.trim();
      try {
        await createTemplate.mutateAsync({
          name,
          category,
          description: `Imported from "${fileName}" (tab: ${name})`,
          template_data: sheet.days,
        });
        outcomes.push({ name, success: true });
      } catch (e: any) {
        outcomes.push({ name, success: false, error: e?.message || 'Failed to save' });
      }
    }
    setResults(outcomes);
    setIsImporting(false);
    const okCount = outcomes.filter((o) => o.success).length;
    const failCount = outcomes.length - okCount;
    if (okCount > 0) toast.success(`Imported ${okCount} template${okCount === 1 ? '' : 's'}`);
    if (failCount > 0) toast.error(`${failCount} template${failCount === 1 ? '' : 's'} failed to import`);
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const selectAll = () => {
    const all: Record<string, boolean> = {};
    sheets.forEach((s) => { all[s.name] = !s.error; });
    setSelected(all);
  };
  const selectNone = () => setSelected({});

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Templates from Excel</DialogTitle>
          <DialogDescription>
            Each sheet/tab in the file becomes one diet chart template, using the tab name as the template name.
            Expected layout: column A holds day labels (e.g. "Day 1"), every other column header is a meal period —
            optionally with a time after a dash, e.g. "Lunch - 01:00 PM".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="template-file">Excel file (.xlsx / .xls)</Label>
            <Input
              id="template-file"
              type="file"
              accept=".xlsx,.xls"
              className="mt-2"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>

          {sheets.length > 0 && (
            <>
              <div>
                <Label>Category for imported templates</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Tabs to import ({selectedSheets.length} selected)</Label>
                  <div className="flex gap-1">
                    <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={selectAll}>
                      Select all
                    </Button>
                    <span className="text-muted-foreground text-xs">·</span>
                    <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs text-muted-foreground" onClick={selectNone}>
                      Clear
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-64 rounded-md border p-2">
                  <div className="space-y-1">
                    {sheets.map((s) => (
                      <div key={s.name} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50">
                        <Checkbox
                          id={`sheet-${s.name}`}
                          checked={!!selected[s.name]}
                          disabled={!!s.error}
                          onCheckedChange={(checked) => setSelected((prev) => ({ ...prev, [s.name]: !!checked }))}
                        />
                        <Label htmlFor={`sheet-${s.name}`} className="flex-1 cursor-pointer text-sm font-normal">
                          {s.name}
                        </Label>
                        <span className={`text-xs whitespace-nowrap ${s.error ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {s.error || `${s.days.length} day${s.days.length === 1 ? '' : 's'}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}

          {results && (
            <div className="rounded-md border p-3 text-sm space-y-1">
              {results.map((r) => (
                <div key={r.name} className={r.success ? 'text-foreground' : 'text-destructive'}>
                  {r.success ? '✓' : '✗'} {r.name}{r.error ? ` — ${r.error}` : ''}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>Close</Button>
          <Button onClick={handleImport} disabled={selectedSheets.length === 0 || isImporting}>
            {isImporting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing…</>
            ) : (
              `Import ${selectedSheets.length} Template${selectedSheets.length === 1 ? '' : 's'}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
