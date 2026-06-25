/**
 * Separate date + time text inputs that compose into an ISO datetime string.
 *
 * Native <input type="date"/"time"> always render in the browser/OS locale and
 * ignore the `lang` attribute (Chrome/Edge), so we cannot force a format there.
 * Instead these are masked text inputs that ALWAYS show DD/MM/YYYY and 24h HH:MM
 * regardless of the user's locale, and parse back into an ISO string.
 */
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface DateTimePickerProps {
  /** ISO datetime string value (e.g. "2026-06-22T14:30"). */
  value: string;
  onChange: (iso: string) => void;
  id?: string;
  className?: string;
  required?: boolean;
}

function splitIso(iso: string): { date: string; time: string } {
  if (!iso) return { date: '', time: '' };
  const [datePart, timePart] = iso.split('T');
  return { date: datePart ?? '', time: (timePart ?? '').slice(0, 5) };
}

/** ISO date "YYYY-MM-DD" -> display "DD/MM/YYYY". */
function isoDateToDisplay(isoDate: string): string {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return '';
  return `${d}/${m}/${y}`;
}

/** Display "DD/MM/YYYY" -> ISO date "YYYY-MM-DD" (or '' if incomplete/invalid). */
function displayToIsoDate(display: string): string {
  const m = display.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return '';
  const [, dd, mm, yyyy] = m;
  const day = Number(dd);
  const month = Number(mm);
  if (month < 1 || month > 12 || day < 1 || day > 31) return '';
  return `${yyyy}-${mm}-${dd}`;
}

/** Clamp a numeric segment to [0, max], preserving the typed digit count. */
function clampSegment(seg: string, max: number): string {
  if (!seg) return '';
  const n = Number(seg);
  return n > max ? String(max) : seg;
}

/** Auto-insert slashes + clamp each segment (dd≤31, mm≤12, yyyy≤2050). */
function maskDate(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  const dd = clampSegment(digits.slice(0, 2), 31);
  const mm = clampSegment(digits.slice(2, 4), 12);
  const yyyy = clampSegment(digits.slice(4, 8), 2050);
  return [dd, mm, yyyy].filter(Boolean).join('/');
}

/** Auto-insert colon + clamp each segment (hh≤23, mm≤59). */
function maskTime(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  const hh = clampSegment(digits.slice(0, 2), 23);
  const mm = clampSegment(digits.slice(2, 4), 59);
  if (digits.length <= 2) return hh;
  return `${hh}:${mm}`;
}

/** Returns normalized "HH:MM" if it is a valid 24h time, else ''. */
function validTime(display: string): string {
  const m = display.match(/^(\d{2}):(\d{2})$/);
  if (!m) return '';
  if (Number(m[1]) > 23 || Number(m[2]) > 59) return '';
  return display;
}

const inputClass =
  'flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Two-field date + time picker. Always renders DD/MM/YYYY and 24h HH:MM.
 * Combines values into an ISO string consumed by the parent.
 */
export function DateTimePicker({ value, onChange, id, className, required }: DateTimePickerProps) {
  const { date, time } = splitIso(value);

  // Local display state holds the (possibly partial) text the user is typing.
  const [dateText, setDateText] = useState(isoDateToDisplay(date));
  const [timeText, setTimeText] = useState(time);

  // Re-sync local text when the parent value changes externally (e.g. form reset).
  useEffect(() => {
    setDateText(isoDateToDisplay(date));
  }, [date]);
  useEffect(() => {
    setTimeText(time);
  }, [time]);

  function commit(nextIsoDate: string, nextTime: string) {
    if (nextIsoDate && nextTime) onChange(`${nextIsoDate}T${nextTime}`);
    else if (nextIsoDate) onChange(`${nextIsoDate}T00:00`);
    else onChange('');
  }

  function handleDate(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = maskDate(e.target.value);
    setDateText(masked);
    commit(displayToIsoDate(masked), validTime(timeText));
  }

  function handleTime(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = maskTime(e.target.value);
    setTimeText(masked);
    commit(displayToIsoDate(dateText), validTime(masked));
  }

  return (
    <div className={cn('flex gap-2', className)}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder="GG/AA/YYYY"
        value={dateText}
        onChange={handleDate}
        required={required}
        maxLength={10}
        className={cn(inputClass, 'w-full')}
      />
      <input
        type="text"
        inputMode="numeric"
        placeholder="SS:DD"
        value={timeText}
        onChange={handleTime}
        required={required}
        maxLength={5}
        className={cn(inputClass, 'w-24')}
      />
    </div>
  );
}
