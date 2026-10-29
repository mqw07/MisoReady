/** Local calendar day as YYYY-MM-DD. Streaks must not use UTC dates. */
export function localDateKey(now: Date): string {
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function previousLocalDateKey(now: Date): string {
  const prior = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return localDateKey(prior);
}

export function dailyTarget(dueAtStart: number, goal: number): number {
  if (dueAtStart > 0 && dueAtStart < goal) return dueAtStart;
  return goal;
}
