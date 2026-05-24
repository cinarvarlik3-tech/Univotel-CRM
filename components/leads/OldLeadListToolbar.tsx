/**
 * Filter toolbar for historical old leads list.
 */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormSelect } from '@/components/ui/form-select';
import { LEAD_SOURCES, MESSAGE_FROM_VALUES } from '@/lib/constants';

/** Filter state for old leads list. */
export interface OldLeadListFilterState {
  search: string;
  leadSource: string;
  messageFrom: string;
}

export const DEFAULT_OLD_LEAD_LIST_STATE: OldLeadListFilterState = {
  search: '',
  leadSource: '',
  messageFrom: '',
};

interface OldLeadListToolbarProps {
  state: OldLeadListFilterState;
  onChange: (state: OldLeadListFilterState) => void;
  onApply: () => void;
}

/**
 * Renders search and channel filters for old leads.
 * @param props - Filter state and handlers.
 * @returns Toolbar element.
 */
export function OldLeadListToolbar({ state, onChange, onApply }: OldLeadListToolbarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <div className="min-w-[200px] flex-1">
        <label className="mb-1 block text-xs text-text-secondary">Search name or contact</label>
        <Input
          value={state.search}
          onChange={(e) => onChange({ ...state, search: e.target.value })}
          placeholder="Name, phone, or @handle"
          onKeyDown={(e) => e.key === 'Enter' && onApply()}
        />
      </div>
      <div className="w-[160px]">
        <FormSelect
          label="Source"
          value={state.leadSource || 'all'}
          onValueChange={(v) => onChange({ ...state, leadSource: v === 'all' ? '' : v })}
          options={[
            { value: 'all', label: 'All sources' },
            ...LEAD_SOURCES.map((s) => ({ value: s, label: s })),
          ]}
        />
      </div>
      <div className="w-[160px]">
        <FormSelect
          label="Channel"
          value={state.messageFrom || 'all'}
          onValueChange={(v) => onChange({ ...state, messageFrom: v === 'all' ? '' : v })}
          options={[
            { value: 'all', label: 'All channels' },
            ...MESSAGE_FROM_VALUES.map((s) => ({ value: s, label: s })),
          ]}
        />
      </div>
      <Button type="button" onClick={onApply}>
        Apply
      </Button>
    </div>
  );
}
