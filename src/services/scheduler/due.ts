import type { Flashcard } from "../../types/domain.ts";

export function isCardDue(card: Flashcard, now: Date = new Date()): boolean {
  return Date.parse(card.fsrs.due) <= now.getTime();
}

export function countDueCards(cards: Flashcard[], now: Date = new Date()): number {
  return cards.reduce((total, card) => total + (isCardDue(card, now) ? 1 : 0), 0);
}
