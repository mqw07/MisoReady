type StudyDestination = { courseId?: string; unitId?: string; scope?: "all" | "due" };

function destination(path: string, params: StudyDestination = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  return `${path}${query.size ? `?${query}` : ""}`;
}

export const appPaths = {
  home: "/app",
  miso: "/app/miso",
  shop: "/app/shop",
  stats: "/app/stats",
  settings: "/app/settings",
  course: (courseId: string) => `/app/courses/${encodeURIComponent(courseId)}`,
  unit: (courseId: string, unitId: string) => `/app/courses/${encodeURIComponent(courseId)}/units/${encodeURIComponent(unitId)}`,
  learn: (params?: StudyDestination) => destination("/app/learn", params),
  study: (params?: StudyDestination) => destination("/app/study", params),
};

export function isAppPath(pathname: string) {
  return pathname === appPaths.home || pathname.startsWith(`${appPaths.home}/`);
}
