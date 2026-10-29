import type { Flashcard, ReviewRating } from "../../types/domain.ts";
import { Button } from "../ui/Button.tsx";
import { Panel } from "../ui/Panel.tsx";
import { RatingBar } from "./RatingBar.tsx";

export function RevealCard({
  card,
  revealed,
  ratingDisabled,
  onReveal,
  onRate,
}: {
  card: Flashcard;
  revealed: boolean;
  ratingDisabled: boolean;
  onReveal: () => void;
  onRate: (rating: ReviewRating) => void;
}) {
  return (
    <Panel className="px-6 py-8 sm:px-8">
      <p className="text-sm font-bold text-muted">Prompt</p>
      <p className="mt-2 text-xl leading-8 font-extrabold break-words text-ink">{card.description}</p>
      {revealed ? (
        <div className="mt-8 border-t-2 border-line pt-6">
          <p className="text-sm font-bold text-muted">Answer</p>
          <p className="mt-2 text-3xl leading-tight font-extrabold break-words text-ink">{card.term}</p>
          {card.acceptedAnswers.length > 0 ? (
            <p className="mt-3 text-sm text-muted">Also accepted: {card.acceptedAnswers.join(", ")}</p>
          ) : null}
          <div className="mt-8">
            <RatingBar disabled={ratingDisabled} onRate={onRate} />
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <Button onClick={onReveal}>Show answer</Button>
          <p className="mt-3 text-sm text-muted">Space or Enter reveals the answer.</p>
        </div>
      )}
    </Panel>
  );
}
