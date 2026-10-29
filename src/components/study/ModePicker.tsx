import type { StudyMode } from "../../types/domain.ts";

const MODES: { mode: StudyMode; label: string }[] = [
  { mode: "reveal", label: "Reveal" },
  { mode: "typed", label: "Type" },
  { mode: "fillBlank", label: "Blank" },
  { mode: "mixed", label: "Mixed" },
];

export function ModePicker({
  value,
  onChange,
}: {
  value: StudyMode;
  onChange: (mode: StudyMode) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Study mode">
      {MODES.map((item) => {
        const selected = item.mode === value;
        return (
          <button
            key={item.mode}
            type="button"
            aria-pressed={selected}
            className={[
              "pixel-box pixel-box-sm relative h-9 px-4 text-sm font-bold",
              selected ? "pb-primary text-white" : "pb-surface text-ink",
            ].join(" ")}
            onClick={() => onChange(item.mode)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
