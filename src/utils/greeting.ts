export function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function greetingNow(now: Date = new Date()): string {
  return greetingForHour(now.getHours());
}
