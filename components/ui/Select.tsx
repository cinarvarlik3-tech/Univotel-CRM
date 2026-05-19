/**
 * Primitive select component for minimal testing UI.
 */
import type { SelectHTMLAttributes, ReactNode } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: ReactNode;
}

/**
 * Renders a labeled select dropdown element.
 * @param props - Select props with optional label and options as children.
 * @returns Select wrapper with optional label.
 */
export function Select({ label, id, children, ...props }: SelectProps) {
  return (
    <label htmlFor={id}>
      {label && <div>{label}</div>}
      <select id={id} {...props}>
        {children}
      </select>
    </label>
  );
}
