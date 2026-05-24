/**
 * Visual editor for WhatsApp template placeholders (no JSON).
 */
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { FormSelect } from '@/components/ui/form-select';
import { Input } from '@/components/ui/input';
import {
  TEMPLATE_VARIABLE_FIELD_OPTIONS,
  type TemplateVariableSlot,
} from '@/lib/campaigns/campaign-form-ui';

interface CampaignTemplateVariablesEditorProps {
  slots: TemplateVariableSlot[];
  onChange: (slots: TemplateVariableSlot[]) => void;
}

function nextSlotNumber(slots: TemplateVariableSlot[]): number {
  const max = slots.reduce((m, s) => Math.max(m, s.slot), 0);
  return max + 1;
}

/**
 * Maps Meta template {{1}}, {{2}}, … to CRM fields.
 */
export function CampaignTemplateVariablesEditor({
  slots,
  onChange,
}: CampaignTemplateVariablesEditorProps) {
  function updateSlot(id: string, patch: Partial<TemplateVariableSlot>) {
    onChange(slots.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addSlot() {
    const slot = nextSlotNumber(slots);
    onChange([...slots, { id: `slot-${Date.now()}`, slot, field: 'lead_name' }]);
  }

  function removeSlot(id: string) {
    if (slots.length <= 1) return;
    onChange(slots.filter((row) => row.id !== id));
  }

  return (
    <fieldset className="space-y-4 rounded-lg border border-border-default p-4">
      <legend className="px-1 text-sm font-medium text-text-primary">
        Template variables — fill Meta placeholders
      </legend>
      <p className="text-xs text-text-secondary">
        Match each number to a field from your CRM. In Meta, placeholder{' '}
        <code className="rounded bg-muted px-1 py-0.5 text-text-primary">{'{{1}}'}</code> is slot 1,{' '}
        <code className="rounded bg-muted px-1 py-0.5 text-text-primary">{'{{2}}'}</code> is slot 2,
        and so on. Leads missing a value are skipped when sending.
      </p>

      <ul className="space-y-3">
        {slots.map((row) => (
          <li key={row.id} className="flex flex-wrap items-end gap-3">
            <FormField label="Placeholder #" htmlFor={`template_slot_${row.id}`}>
              <Input
                id={`template_slot_${row.id}`}
                type="number"
                min={1}
                max={20}
                value={row.slot}
                onChange={(e) =>
                  updateSlot(row.id, { slot: Math.max(1, Number(e.target.value) || 1) })
                }
                aria-label={`Placeholder number for row ${row.id}`}
              />
            </FormField>
            <FormSelect
              label="CRM field"
              id={`template_field_${row.id}`}
              value={row.field}
              onValueChange={(v) => updateSlot(row.id, { field: v })}
              options={TEMPLATE_VARIABLE_FIELD_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => removeSlot(row.id)}
              disabled={slots.length <= 1}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>

      <Button type="button" variant="secondary" onClick={addSlot}>
        Add placeholder
      </Button>
    </fieldset>
  );
}
