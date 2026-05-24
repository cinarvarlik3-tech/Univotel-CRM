/**
 * Labeled Radix select wrapper for simpler form migration.
 */
import { FormField } from '@/components/ui/form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FormSelectOption {
  value: string;
  label: string;
}

interface FormSelectProps {
  label?: string;
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: FormSelectOption[];
  placeholder?: string;
  className?: string;
}

/**
 * Renders a labeled select dropdown with option list.
 * @param props - Label, value, options, and change handler.
 * @returns Form field with select control.
 */
export function FormSelect({
  label,
  id,
  value,
  onValueChange,
  options,
  placeholder = 'Select...',
  className,
}: FormSelectProps) {
  return (
    <FormField label={label} htmlFor={id} className={className}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}
