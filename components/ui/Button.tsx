/**
 * Primitive button component for minimal testing UI.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

/**
 * Renders a basic styled button element.
 * @param props - Standard button props plus children.
 * @returns Button element.
 */
export function Button({ children, ...props }: ButtonProps) {
  return <button {...props}>{children}</button>;
}
