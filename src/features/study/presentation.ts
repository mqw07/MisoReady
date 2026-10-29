import type { Flashcard, StudyMode } from "../../types/domain.ts";
import { resolveFillBlank } from "./fillBlank.ts";

export type CardPresentation = "reveal" | "typed" | "fillBlank";

export function pickPresentation(card: Flashcard, mode: StudyMode, index: number): CardPresentation {
  if (mode === "reveal" || mode === "typed") return mode;
  if (mode === "fillBlank") return "fillBlank";
  const options: CardPresentation[] = ["reveal", "typed"];
  if (resolveFillBlank(card)) options.push("fillBlank");
  return options[index % options.length] ?? "reveal";
}

export function presentationsForQueue(queue: readonly Flashcard[], mode: StudyMode): CardPresentation[] {
  return queue.map((card, index) => pickPresentation(card, mode, index));
}

export function recallPrompt(card: Flashcard, presentation: CardPresentation): string {
  if (presentation === "fillBlank") return resolveFillBlank(card)?.prompt ?? card.description;
  return card.description;
}

export function recallAnswers(card: Flashcard, presentation: CardPresentation): string[] {
  if (presentation === "fillBlank") {
    return resolveFillBlank(card)?.acceptedAnswers ?? [card.term, ...card.acceptedAnswers];
  }
  return [card.term, ...card.acceptedAnswers];
}
