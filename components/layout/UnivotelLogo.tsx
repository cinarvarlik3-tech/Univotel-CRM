/**
 * Univotel logomark — gradient fill reserved exclusively for brand logo.
 */
import { cn } from '@/lib/utils';

interface UnivotelLogoProps {
  className?: string;
  size?: number;
}

/**
 * Renders the Univotel logomark SVG with brand gradient.
 * @param props - Optional size and className.
 * @returns SVG logo element.
 */
export function UnivotelLogo({ className, size = 32 }: UnivotelLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-label="Univotel"
    >
      <defs>
        <linearGradient
          id="univotel-gradient"
          x1="0"
          y1="16"
          x2="32"
          y2="16"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--blue)" />
          <stop offset="1" stopColor="var(--red)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#univotel-gradient)" />
      <path
        d="M8 22V10h3.2l3.8 7.2L18.8 10H22v12h-2.8v-7.4L16 22h-1.6l-3.2-7.4V22H8z"
        fill="white"
      />
    </svg>
  );
}

/**
 * White logomark variant for sidebar use.
 * @param props - Optional size and className.
 * @returns White SVG logo element.
 */
export function UnivotelLogoWhite({ className, size = 32 }: UnivotelLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-label="Univotel"
    >
      <rect width="32" height="32" rx="8" fill="white" fillOpacity="0.15" />
      <path
        d="M8 22V10h3.2l3.8 7.2L18.8 10H22v12h-2.8v-7.4L16 22h-1.6l-3.2-7.4V22H8z"
        fill="white"
      />
    </svg>
  );
}
