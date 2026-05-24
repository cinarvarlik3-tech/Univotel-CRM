/**
 * Formats chat message timestamps for display in thread UI.
 * @param iso - ISO timestamp string.
 */
export function formatChatMessageTime(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formats date separator labels in chat threads.
 * @param iso - ISO timestamp string.
 */
export function formatChatDateSeparator(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';

  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Returns true when two ISO timestamps fall on different calendar days.
 * @param a - First ISO timestamp.
 * @param b - Second ISO timestamp.
 */
export function isDifferentChatDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() !== db.getFullYear() ||
    da.getMonth() !== db.getMonth() ||
    da.getDate() !== db.getDate()
  );
}
