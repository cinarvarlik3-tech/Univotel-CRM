/**
 * Create campaign form — visual audience and template variable editors.
 */
import { useState } from 'react';
import { CampaignAudienceFilters } from '@/components/campaigns/CampaignAudienceFilters';
import { CampaignTemplateVariablesEditor } from '@/components/campaigns/CampaignTemplateVariablesEditor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { FormSelect } from '@/components/ui/form-select';
import { Input } from '@/components/ui/input';
import { useSalespeople } from '@/hooks/useSalespeople';
import { useTranslation } from '@/hooks/useTranslation';
import {
  audienceStateToSegment,
  DEFAULT_CAMPAIGN_AUDIENCE,
  DEFAULT_TEMPLATE_SLOTS,
  templateSlotsToVariables,
  validateTemplateSlots,
  type CampaignAudienceState,
  type TemplateVariableSlot,
} from '@/lib/campaigns/campaign-form-ui';
import { formatEnumLabel } from '@/lib/i18n';
import { LANGUAGES } from '@/lib/constants';

interface CampaignFormProps {
  onCreated: (id: string) => void;
}

/**
 * Form to create a draft outbound_message campaign.
 * @param props - Callback when campaign is created.
 */
export function CampaignForm({ onCreated }: CampaignFormProps) {
  const { locale, t } = useTranslation();
  const { data: salespeople } = useSalespeople();

  const [templateId, setTemplateId] = useState('');
  const [templateLanguage, setTemplateLanguage] = useState('tr');
  const [campaignLanguage, setCampaignLanguage] = useState('');
  const [audience, setAudience] = useState<CampaignAudienceState>(DEFAULT_CAMPAIGN_AUDIENCE);
  const [templateSlots, setTemplateSlots] =
    useState<TemplateVariableSlot[]>(DEFAULT_TEMPLATE_SLOTS);
  const [sendDelayMs, setSendDelayMs] = useState('200');
  const [error, setError] = useState<string | null>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  async function handlePreviewAudience() {
    setError(null);
    setPreviewLoading(true);
    setPreviewCount(null);

    const segment = audienceStateToSegment(audience);

    try {
      const res = await fetch('/api/campaigns/preview-segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segment,
          language: campaignLanguage || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? t('campaigns.previewFailed'));
        return;
      }
      setPreviewCount(json.data.count);
    } catch {
      setError(t('campaigns.previewFailed'));
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const slotError = validateTemplateSlots(templateSlots, locale);
    if (slotError) {
      setError(slotError);
      return;
    }

    const segment = audienceStateToSegment(audience);
    const templateVariables = templateSlotsToVariables(templateSlots);

    if (segment.filters.length === 0 && !campaignLanguage) {
      setError(t('campaigns.filterRequired'));
      return;
    }

    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_type: 'outbound_message',
        segment,
        template_id: templateId,
        template_language: templateLanguage,
        template_variables: templateVariables,
        language: campaignLanguage || null,
        send_delay_ms: Number(sendDelayMs),
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? t('campaigns.createFailed'));
      return;
    }

    onCreated(json.data.id);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('campaigns.whatsappTemplate')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <FormField label={t('campaigns.templateName')} htmlFor="template_id">
              <Input
                id="template_id"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                required
              />
            </FormField>
            <FormField label={t('campaigns.templateLanguage')} htmlFor="template_language">
              <Input
                id="template_language"
                value={templateLanguage}
                onChange={(e) => setTemplateLanguage(e.target.value)}
                required
              />
            </FormField>
            <FormSelect
              label={t('campaigns.extraLanguageFilter')}
              id="campaign_extra_language"
              value={campaignLanguage || '__none__'}
              onValueChange={(v) => setCampaignLanguage(v === '__none__' ? '' : v)}
              options={[
                { value: '__none__', label: t('common.noExtraFilter') },
                ...LANGUAGES.map((l) => ({
                  value: l,
                  label: formatEnumLabel(locale, 'language', l),
                })),
              ]}
            />
            <p className="text-xs text-text-secondary">{t('campaigns.languageFilterHelp')}</p>
            <FormField label={t('campaigns.delayMs')} htmlFor="send_delay_ms">
              <Input
                id="send_delay_ms"
                type="number"
                min={0}
                max={60000}
                value={sendDelayMs}
                onChange={(e) => setSendDelayMs(e.target.value)}
              />
            </FormField>
          </div>

          <CampaignAudienceFilters
            state={audience}
            onChange={setAudience}
            salespeople={salespeople}
            previewCount={previewCount}
            previewLoading={previewLoading}
            onPreview={handlePreviewAudience}
          />

          <CampaignTemplateVariablesEditor slots={templateSlots} onChange={setTemplateSlots} />

          {error && <p className="text-xs text-brand-red">{error}</p>}
          <Button type="submit">{t('campaigns.createDraft')}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
