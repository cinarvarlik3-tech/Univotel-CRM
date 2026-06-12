/**
 * Orange "inactive" label for irrelevant leads surfaced via search.
 */
import { cn } from '@/lib/utils';

interface InactiveLeadBadgeProps {
  className?: string;
}

export function InactiveLeadBadge({ className }: InactiveLeadBadgeProps) {
  return <span className={cn('text-[11px] font-medium text-orange-600', className)}>inactive</span>;
}
