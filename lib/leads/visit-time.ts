/** Returns true when the visit's scheduled time is in the past (or now). */
export function hasVisitOccurred(scheduledDate: string | Date): boolean {
  return new Date(scheduledDate).getTime() <= Date.now();
}
