import { z } from "zod";
import type { Flashcard } from "../../types/domain.ts";
import { matchAnswer } from "../../services/answerMatching/matchAnswer.ts";
import { normalizeAnswer } from "../../services/answerMatching/normalize.ts";
import { deriveFillBlank, resolveFillBlank } from "./fillBlank.ts";

export const types = ["flashcard", "trueFalse", "written", "fillBlank"] as const;
export type LearnType = typeof types[number];
// The historical format is accepted only when reading old settings/attempts.
const historicalTypes = [...types, "multipleChoice"] as const;
const savedLearnSchema = z.object({
  key: z.string(), types: z.array(z.enum(historicalTypes)).min(1),
  direction: z.enum(["term", "definition"]), smart: z.boolean(), retype: z.boolean(),
  audio: z.boolean(), roundSize: z.number().int().min(1).max(30), queue: z.array(z.string()),
  progress: z.array(z.object({
    id: z.string(), fingerprint: z.string(), seen: z.boolean(), recognition: z.number(),
    recall: z.number(), mistakes: z.number(), mastered: z.boolean(),
  })),
  questionId: z.string(),
  attempts: z.array(z.object({
    id: z.string(), cardId: z.string(), type: z.enum(historicalTypes), answer: z.string(),
    correct: z.boolean(), hinted: z.boolean(), override: z.boolean(), at: z.string(),
  })),
});

export const learnSchema = savedLearnSchema.transform(session => {
  const active = session.types.filter((type): type is LearnType => type !== "multipleChoice");
  if (active.length) return { ...session, types: active };
  // Choice-only sessions resume as typing. Preserve history, but recognition
  // alone cannot count as typed mastery.
  const progress = session.progress.map(item => ({ ...item, mastered: item.recall >= 2 }));
  return {
    ...session, types: ["written"] as LearnType[], progress,
    queue: [...new Set([...session.queue, ...progress.filter(item => !item.mastered).map(item => item.id)])],
  };
});
export type LearnSession = z.infer<typeof learnSchema>;
export const fingerprint = (card: Flashcard) => JSON.stringify([card.term, card.description, card.acceptedAnswers, card.fillBlank]);

export function startLearn(cards: Flashcard[], key: string): LearnSession {
  return {
    key, types: ["written", "fillBlank"], direction: "term", smart: true, retype: false,
    audio: false, roundSize: 7, queue: cards.map(card => card.id),
    progress: cards.map(card => ({
      id: card.id, fingerprint: fingerprint(card), seen: false, recognition: 0,
      recall: 0, mistakes: 0, mastered: false,
    })), questionId: crypto.randomUUID(), attempts: [],
  };
}

export function reconcileLearn(session: LearnSession, cards: Flashcard[]): LearnSession {
  const cardsById = new Map(cards.map(card => [card.id, card]));
  const valid = session.progress.filter(item => {
    const card = cardsById.get(item.id);
    return card && fingerprint(card) === item.fingerprint;
  });
  const validIds = new Set(valid.map(item => item.id));
  const added = startLearn(cards.filter(card => !validIds.has(card.id)), session.key);
  const queue = [...session.queue.filter(id => validIds.has(id)), ...added.queue];
  return {
    ...session, progress: [...valid, ...added.progress], queue,
    questionId: queue[0] === session.queue[0] ? session.questionId : crypto.randomUUID(),
  };
}

export function learnFillBlank(card: Flashcard) {
  const stored = resolveFillBlank(card);
  if (stored?.prompt.includes("_____")) return stored;
  return deriveFillBlank(card) ?? {
    prompt: `_____ — ${card.description}`,
    acceptedAnswers: [...new Set([card.term, ...card.acceptedAnswers])],
  };
}

export function question(session: LearnSession, cards: Flashcard[]) {
  const card = cards.find(item => item.id === session.queue[0]);
  if (!card || !session.progress.some(item => item.id === card.id)) return null;
  const answers = session.direction === "term" ? [card.term, ...card.acceptedAnswers] : [card.description];
  const alternatives = session.types.includes("trueFalse")
    ? [...new Set(cards.filter(item => item.id !== card.id).map(item => session.direction === "term" ? item.term : item.description))]
      .filter(answer => !answers.some(expected => normalizeAnswer(answer) === normalizeAnswer(expected)))
    : [];
  const eligible = types.filter(type => session.types.includes(type)
    && (type !== "fillBlank" || session.direction === "term") && (type !== "trueFalse" || alternatives.length > 0));
  // Start with a selected input format, even on unseen cards. Rotate per card
  // so typing cannot starve blanks (or optional preview/recognition formats).
  const firstRecall = eligible.find(type => type === "written" || type === "fillBlank");
  const ordered = firstRecall ? [firstRecall, ...eligible.filter(type => type !== firstRecall)] : eligible;
  const last = session.attempts.findLast(attempt => attempt.cardId === card.id);
  const previous = last ? ordered.indexOf(last.type as LearnType) : -1;
  const type = ordered[(previous + 1) % ordered.length];
  if (!type) return null;
  const blank = type === "fillBlank" ? learnFillBlank(card) : null;
  const seed = [...session.questionId].reduce((value, character) => value + character.charCodeAt(0), 0);
  const pairing = seed % 2 === 0 ? answers[0]! : alternatives[0]!;
  return {
    card, type, eligibleTypes: eligible,
    prompt: blank?.prompt ?? (session.direction === "term" ? card.description : card.term),
    answers: blank?.acceptedAnswers ?? answers, pairing, truth: pairing === answers[0],
  };
}

export function grade(session: LearnSession, cards: Flashcard[], answer: string): boolean {
  const current = question(session, cards);
  if (!current) return false;
  if (current.type === "flashcard") return answer === "remembered";
  if (current.type === "trueFalse") return answer === String(current.truth);
  return session.smart
    ? matchAnswer(answer, current.answers[0]!, current.answers.slice(1)).correct
    : current.answers.includes(answer);
}

export function submit(session: LearnSession, cards: Flashcard[], answer: string, hinted = false, override = false): LearnSession {
  const current = question(session, cards);
  if (!current || session.attempts.some(attempt => attempt.id === session.questionId)) return session;
  const correct = override || grade(session, cards, answer);
  const progress = session.progress.map(item => {
    if (item.id !== current.card.id) return item;
    const next = { ...item, seen: true };
    const recall = current.type === "written" || current.type === "fillBlank";
    if (!correct) {
      next.mistakes++;
      if (recall) next.recall = 0;
      else next.recognition = 0;
    } else if (!hinted) {
      if (recall) next.recall++;
      else if (current.type !== "flashcard") next.recognition++;
    }
    const hasRecall = current.eligibleTypes.some(type => type === "written" || type === "fillBlank");
    next.mastered = hasRecall ? next.recall >= 2
      : current.eligibleTypes.every(type => type === "flashcard") ? correct : next.recognition >= 2;
    return next;
  });
  const queue = session.queue.slice(1);
  if (!progress.find(item => item.id === current.card.id)!.mastered) {
    queue.splice(correct ? queue.length : Math.min(2, queue.length), 0, current.card.id);
  }
  return {
    ...session, progress, queue, questionId: crypto.randomUUID(),
    attempts: [...session.attempts, {
      id: session.questionId, cardId: current.card.id, type: current.type, answer,
      correct, hinted, override, at: new Date().toISOString(),
    }],
  };
}
