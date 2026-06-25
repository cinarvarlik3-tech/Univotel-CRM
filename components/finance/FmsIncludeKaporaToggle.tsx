/**
 * Toggle button for contracted vs kapora-inclusive FMS revenue.
 */
import { Button } from '@/components/ui/button';
import { useFmsFilter } from '@/components/finance/FmsFilterContext';
import { useTranslation } from '@/hooks/useTranslation';

export function FmsIncludeKaporaToggle() {
  const { t } = useTranslation();
  const { includeKapora, setIncludeKapora } = useFmsFilter();

  return (
    <Button
      type="button"
      variant="default"
      size="sm"
      className="border-0 bg-brand-red text-primary-foreground hover:opacity-90"
      onClick={() => setIncludeKapora(!includeKapora)}
    >
      {includeKapora ? t('fms.showContractsOnly') : t('fms.showKapora')}
    </Button>
  );
}
