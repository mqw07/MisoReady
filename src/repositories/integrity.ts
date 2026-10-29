import type { AppState } from "../types/domain.ts";

export class ReferentialIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReferentialIntegrityError";
  }
}

function uniqueIds(ids: string[], label: string): Set<string> {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      throw new ReferentialIntegrityError(`Duplicate ${label} id.`);
    }
    seen.add(id);
  }
  return seen;
}

/** Fail the load rather than drop rows when relations do not line up. */
export function assertReferentialIntegrity(state: AppState): void {
  const courseIds = uniqueIds(
    state.courses.map((course) => course.id),
    "course",
  );
  uniqueIds(
    state.units.map((unit) => unit.id),
    "unit",
  );
  uniqueIds(
    state.cards.map((card) => card.id),
    "card",
  );
  uniqueIds(
    state.reviews.map((review) => review.id),
    "review",
  );

  const unitsById = new Map(state.units.map((unit) => [unit.id, unit]));
  const cardIds = new Set(state.cards.map((card) => card.id));

  for (const unit of state.units) {
    if (!courseIds.has(unit.courseId)) {
      throw new ReferentialIntegrityError("Unit points at a missing course.");
    }
  }

  for (const card of state.cards) {
    const unit = unitsById.get(card.unitId);
    if (!unit) {
      throw new ReferentialIntegrityError("Card points at a missing unit.");
    }
    if (unit.courseId !== card.courseId || !courseIds.has(card.courseId)) {
      throw new ReferentialIntegrityError("Card course does not match its unit.");
    }
  }

  for (const review of state.reviews) {
    if (!cardIds.has(review.cardId)) {
      throw new ReferentialIntegrityError("Review points at a missing card.");
    }
  }
}
