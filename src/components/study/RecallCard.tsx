import { useState, type FormEvent } from "react";
import type { AnswerMatch } from "../../services/answerMatching/matchAnswer.ts";
import type { ReviewRating } from "../../types/domain.ts";
import { Button } from "../ui/Button.tsx";
import { Panel } from "../ui/Panel.tsx";
import { RatingBar } from "./RatingBar.tsx";
import type { ReviewVerdict } from "../../services/ai/review.ts";

export function RecallCard({
  prompt,
  expected,
  aliases,
  match,
  submittedAnswer,
  ratingDisabled,
  onSubmit,
  onRate,
  aiPending,
  aiReview,
  aiError,
  onAiReview,
}: {
  prompt: string;
  expected: string;
  aliases: readonly string[];
  match?: AnswerMatch;
  submittedAnswer?: string;
  ratingDisabled: boolean;
  onSubmit: (answer: string) => void;
  onRate: (rating: ReviewRating) => void;
  aiPending?: boolean;
  aiReview?: ReviewVerdict;
  aiError?: string;
  onAiReview?: () => void;
}) {
  const [value, setValue] = useState("");
  const graded = match !== undefined;
  const correct = Boolean(match?.correct);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (graded) return;
    onSubmit(value);
  }

  return (
    <Panel className="px-6 py-8 sm:px-8">
      <p className="text-sm font-bold text-muted">Prompt</p>
      <p className="mt-2 text-xl leading-8 font-extrabold break-words text-ink">{prompt}</p>
      {graded ? (
        <div className="mt-8 border-t-2 border-line pt-6">
          <p
            role="status"
            className={`text-sm font-extrabold ${correct ? "text-accent-ink" : "text-danger"}`}
          >
            {correct ? "Correct" : "Incorrect"}
          </p>
          {submittedAnswer?.trim() ? (
            <p className="mt-2 text-sm text-muted">You answered: {submittedAnswer}</p>
          ) : (
            <p className="mt-2 text-sm text-muted">You left the answer blank.</p>
          )}
          <p className="mt-4 text-sm font-bold text-muted">Expected</p>
          <p className="mt-2 text-3xl leading-tight font-extrabold break-words text-ink">
            {match?.matchedAnswer ?? expected}
          </p>
          {aliases.length > 0 ? (
            <p className="mt-3 text-sm text-muted">Also accepted: {aliases.join(", ")}</p>
          ) : null}
          <div className="mt-8">
            {onAiReview ? <div className="mb-6 space-y-2">
              {!aiReview ? <Button variant="secondary" disabled={Boolean(aiPending) || !submittedAnswer?.trim()} onClick={onAiReview}>
                {aiPending ? "AI is checking…" : "Ask AI to double-check"}
              </Button> : null}
              {aiPending ? <p role="status" className="text-sm text-muted">Checking your answer in context…</p> : null}
              {aiError ? <p role="alert" className="text-sm text-danger">{aiError}</p> : null}
              {aiReview ? <div role="status" className="text-sm text-muted">
                <p className="font-bold">{aiReview.correct ? "AI accepted your answer" : "AI explanation"}</p>
                <p>{aiReview.explanation}</p>
              </div> : <p className="text-xs text-muted">Optional: sends this question and your answer to AI to check wording, spelling, and meaning.</p>}
            </div> : null}
            <RatingBar disabled={ratingDisabled} onRate={onRate} />
          </div>
        </div>
      ) : (
        <form className="mt-8" onSubmit={handleSubmit}>
          <label htmlFor="study-answer" className="mb-2 block text-sm font-bold text-ink">
            Your answer
          </label>
          <input
            id="study-answer"
            name="answer"
            value={value}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            autoFocus
            className="pixel-input w-[calc(100%-4px)] bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-faint focus-visible:outline-offset-4"
            onChange={(event) => setValue(event.target.value)}
          />
          <div className="mt-4">
            <Button type="submit">Check answer</Button>
          </div>
          <p className="mt-3 text-sm text-muted">Enter submits your answer. Rating shortcuts wait until after you check.</p>
        </form>
      )}
    </Panel>
  );
}
