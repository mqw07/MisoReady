import type { ReviewRating } from "../../types/domain.ts";
import { Button } from "../ui/Button.tsx";

const RATINGS: { rating: ReviewRating; label: string; shortcut: string; variant: "danger" | "secondary" | "primary" }[] =
  [
    { rating: "again", label: "Again", shortcut: "1", variant: "danger" },
    { rating: "hard", label: "Hard", shortcut: "2", variant: "secondary" },
    { rating: "good", label: "Good", shortcut: "3", variant: "primary" },
    { rating: "easy", label: "Easy", shortcut: "4", variant: "secondary" },
  ];

export function RatingBar({
  disabled,
  onRate,
}: {
  disabled: boolean;
  onRate: (rating: ReviewRating) => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {RATINGS.map((item) => (
          <Button
            key={item.rating}
            variant={item.variant}
            disabled={disabled}
            aria-keyshortcuts={item.shortcut}
            aria-label={`${item.label}, shortcut ${item.shortcut}`}
            onClick={() => onRate(item.rating)}
          >
            {item.label}
            <span className="text-xs font-bold opacity-80">{item.shortcut}</span>
          </Button>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted">Press 1–4 to rate. Space or Enter shows the answer.</p>
    </div>
  );
}
