/**
 * Infers student gender from inbound Chatwoot message text (Turkish keywords).
 */
import { normalizeMatchText } from '@/lib/import/extract-university';

export type InferredGender = 'male' | 'female';

export interface GenderExtractionResult {
  gender: InferredGender | null;
  matchedPhrase: string | null;
  messageIndex: number | null;
}

const FEMALE_PHRASES = ['kiz ogrenci', 'bayan ogrenci', 'bayan', 'kadin', 'kiz'] as const;
const MALE_PHRASES = ['erkek ogrenci', 'erkek', 'oglan'] as const;

/**
 * Detects gender signals in normalized padded text.
 * @param padded - Space-padded normalized message text.
 * @returns Inferred gender, ambiguous, or null.
 */
function detectGenderInText(padded: string): InferredGender | 'ambiguous' | null {
  let matchedFemale: string | null = null;
  let matchedMale: string | null = null;

  for (const phrase of FEMALE_PHRASES) {
    if (padded.includes(` ${phrase} `)) {
      matchedFemale = phrase;
      break;
    }
  }

  for (const phrase of MALE_PHRASES) {
    if (padded.includes(` ${phrase} `)) {
      matchedMale = phrase;
      break;
    }
  }

  if (matchedFemale && matchedMale) {
    return 'ambiguous';
  }

  if (matchedFemale) {
    return 'female';
  }

  if (matchedMale) {
    return 'male';
  }

  return null;
}

/**
 * Extracts gender from inbound message texts (first confident match wins).
 * @param messages - Inbound messages in chronological order.
 * @returns Inferred gender with matched phrase metadata, or null.
 */
export function extractGenderFromMessages(messages: string[]): GenderExtractionResult {
  for (let index = 0; index < messages.length; index++) {
    const raw = messages[index];
    const normalized = normalizeMatchText(raw);
    if (normalized.length === 0) {
      continue;
    }

    const padded = ` ${normalized} `;
    const detected = detectGenderInText(padded);

    if (detected === 'ambiguous') {
      continue;
    }

    if (detected === 'female') {
      const phrase = FEMALE_PHRASES.find((candidate) => padded.includes(` ${candidate} `)) ?? null;
      return { gender: 'female', matchedPhrase: phrase, messageIndex: index };
    }

    if (detected === 'male') {
      const phrase = MALE_PHRASES.find((candidate) => padded.includes(` ${candidate} `)) ?? null;
      return { gender: 'male', matchedPhrase: phrase, messageIndex: index };
    }
  }

  return { gender: null, matchedPhrase: null, messageIndex: null };
}
