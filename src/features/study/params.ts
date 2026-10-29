import type { StudyMode } from "../../types/domain.ts";

export type SessionScope = "due" | "all";
export type SessionKind = "scheduled" | "custom";

export interface StudyParams {
  courseId?: string;
  unitId?: string;
  scope: SessionScope;
  kind: SessionKind;
  mode: StudyMode;
}

export function parseStudyMode(value: string | null): StudyMode {
  if (value === "typed" || value === "fillBlank" || value === "mixed") return value;
  return "reveal";
}

export function parseStudyParams(search: URLSearchParams): StudyParams {
  const courseId = search.get("courseId")?.trim() || undefined;
  const unitId = search.get("unitId")?.trim() || undefined;
  const scope: SessionScope = search.get("scope") === "all" ? "all" : "due";
  const mode = parseStudyMode(search.get("mode"));
  return {
    courseId,
    unitId,
    scope,
    kind: scope === "all" ? "custom" : "scheduled",
    mode,
  };
}

export function studySessionKey(params: StudyParams): string {
  return `${params.kind}:${params.scope}:${params.mode}:${params.courseId ?? ""}:${params.unitId ?? ""}`;
}
