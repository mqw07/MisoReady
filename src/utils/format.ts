export function formatPoints(points: number): string {
  return `${points} ${points === 1 ? "point" : "points"}`;
}

export function formatStreak(days: number): string {
  return `${days}-day streak`;
}

export function formatUnitCount(count: number): string {
  return `${count} ${count === 1 ? "unit" : "units"}`;
}

export function formatCardCount(count: number): string {
  return `${count} ${count === 1 ? "card" : "cards"}`;
}

export function formatDueCount(count: number): string {
  return `${count} due`;
}
