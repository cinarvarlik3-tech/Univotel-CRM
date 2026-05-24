/**
 * Links a salesperson CRM profile to a Telegram chat ID by email.
 */
import { createServiceClient } from '@/lib/supabase/service';

/** Result of attempting to link a salesperson Telegram account. */
export type LinkTelegramSalespersonResult =
  | { ok: true; fullName: string; email: string }
  | {
      ok: false;
      reason: 'invalid_email' | 'not_found' | 'already_linked' | 'update_failed';
      message: string;
    };

/**
 * Sets salespeople.telegram_chat_id when email matches an active profile.
 * @param chatId - Telegram chat ID string.
 * @param email - Salesperson CRM email address.
 */
export async function linkTelegramSalesperson(
  chatId: string,
  email: string,
): Promise<LinkTelegramSalespersonResult> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail.includes('@')) {
    return { ok: false, reason: 'invalid_email', message: 'Geçersiz e-posta adresi.' };
  }

  const client = createServiceClient();
  const { data: person, error: lookupError } = await client
    .from('salespeople')
    .select('id, full_name, email, telegram_chat_id')
    .eq('email', normalizedEmail)
    .eq('is_active', true)
    .maybeSingle();

  if (lookupError || !person) {
    return {
      ok: false,
      reason: 'not_found',
      message: `Bu e-posta CRM'de bulunamadı: ${normalizedEmail}`,
    };
  }

  if (person.telegram_chat_id && person.telegram_chat_id !== chatId) {
    return {
      ok: false,
      reason: 'already_linked',
      message: `${person.full_name} hesabı zaten başka bir Telegram hesabına bağlı.`,
    };
  }

  const { error: updateError } = await client
    .from('salespeople')
    .update({ telegram_chat_id: chatId })
    .eq('id', person.id);

  if (updateError) {
    return {
      ok: false,
      reason: 'update_failed',
      message: `Bağlantı kaydedilemedi: ${updateError.message}`,
    };
  }

  return { ok: true, fullName: person.full_name, email: person.email };
}
