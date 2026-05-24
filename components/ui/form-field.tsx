/**
 * Labeled form field wrapper for shadcn inputs and selects.
 */
import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Wraps a form control with an optional label.
 * @param props - Label text, htmlFor id, and child control.
 * @returns Form field wrapper element.
 */
export function FormField({ label, htmlFor, children, className }: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <Label htmlFor={htmlFor} className="text-xs font-medium text-text-secondary">
          {label}
        </Label>
      )}
      {children}
    </div>
  );
}
