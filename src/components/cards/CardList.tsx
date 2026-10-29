import { isCardDue } from "../../services/scheduler/due.ts";
import type { Flashcard } from "../../types/domain.ts";
import { Badge } from "../ui/Badge.tsx";
import { Button } from "../ui/Button.tsx";

export function CardList({
  cards,
  onEdit,
  onDuplicate,
  onMove,
  onDelete,
}: {
  cards: Flashcard[];
  onEdit: (card: Flashcard) => void;
  onDuplicate: (card: Flashcard) => void;
  onMove: (card: Flashcard) => void;
  onDelete: (card: Flashcard) => void;
}) {
  return (
    <ul className="grid gap-3">
      {cards.map((card) => (
        <li key={card.id}>
          <article className="pixel-box pixel-box-sm pb-surface px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-extrabold break-words text-ink">{card.term}</h3>
                <p className="mt-1 text-sm leading-6 text-muted">{card.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge>{isCardDue(card) ? "Due" : "Scheduled"}</Badge>
                  {card.acceptedAnswers.length > 0 ? (
                    <Badge>
                      {card.acceptedAnswers.length === 1
                        ? "1 alias"
                        : `${String(card.acceptedAnswers.length)} aliases`}
                    </Badge>
                  ) : null}
                  {card.fillBlank ? <Badge>Fill-in-the-blank</Badge> : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" aria-label={`Edit ${card.term}`} onClick={() => onEdit(card)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Duplicate ${card.term}`}
                  onClick={() => onDuplicate(card)}
                >
                  Duplicate
                </Button>
                <Button size="sm" variant="ghost" aria-label={`Move ${card.term}`} onClick={() => onMove(card)}>
                  Move
                </Button>
                <Button size="sm" variant="ghost" aria-label={`Delete ${card.term}`} onClick={() => onDelete(card)}>
                  Delete
                </Button>
              </div>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
