const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 8;

const hits = new Map<string, number[]>();

export function allowRequest(key: string, now: number, maxRequests = MAX_REQUESTS): boolean {
  const cutoff = now - WINDOW_MS;
  const recent = (hits.get(key) ?? []).filter((stamp) => stamp > cutoff);
  if (recent.length >= maxRequests) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

export function resetRateLimit(): void {
  hits.clear();
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;
  return request.headers.get("x-real-ip")?.trim() || "local";
}
