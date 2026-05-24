/**
 * Status badge helpers — funnel and SLA status pill mapping.
 */
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const FUNNEL_VARIANTS: Record<string, 'default' | 'call' | 'visit' | 'deal' | 'danger'> = {
  yeni: 'default',
  unknown: 'default',
  aranacak: 'call',
  arandi: 'call',
  'arandi-acmadi': 'call',
  'bizi-aradi-konustuk': 'call',
  ziyaret: 'visit',
  'ziyaret-etmedi': 'visit',
  'ziyaret-etti': 'visit',
  'teklif-gonderildi': 'deal',
  'kapora-alindi': 'deal',
  'sozlesme-imzalandi': 'deal',
  'ziyaret-ama-almayacak': 'danger',
  ilgilenmiyor: 'danger',
};

const SLA_VARIANTS: Record<string, 'success' | 'warning' | 'danger'> = {
  on_time: 'success',
  at_risk: 'warning',
  breached: 'danger',
};

interface StatusBadgeProps {
  status: string;
  type?: 'funnel' | 'sla';
  className?: string;
}

/**
 * Renders a funnel or SLA status pill with correct color variant.
 * @param props - Status string and badge type.
 * @returns Styled badge element.
 */
export function StatusBadge({ status, type = 'funnel', className }: StatusBadgeProps) {
  const variant =
    type === 'sla' ? (SLA_VARIANTS[status] ?? 'default') : (FUNNEL_VARIANTS[status] ?? 'default');

  const showPulse = type === 'sla' && status === 'breached';

  return (
    <Badge variant={variant as 'default'} className={cn('gap-1.5', className)}>
      {showPulse && (
        <span className="sla-pulse-dot inline-block size-1.5 rounded-full bg-brand-red" />
      )}
      {status.replace(/-/g, ' ')}
    </Badge>
  );
}
