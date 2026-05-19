/**
 * Primitive input component for minimal testing UI.
 */
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

/**
 * Renders a labeled text input element.
 * @param props - Input props with optional label.
 * @returns Input wrapper with optional label.
 */
export function Input({ label, id, ...props }: InputProps) {
  return (
    <label htmlFor={id}>
      {label && <div>{label}</div>}
      <input id={id} {...props} />
    </label>
  );
}
