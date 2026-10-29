export function ProgressBar({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label: string;
}) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));

  return (
    <div
      className="h-4 w-full border-2 border-line-strong bg-surface p-px"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuenow={value}
      aria-valuemax={max}
    >
      <div
        className="h-full bg-[repeating-linear-gradient(90deg,var(--color-primary)_0_6px,var(--color-green)_6px_8px)] transition-[width] duration-200 ease-out motion-reduce:transition-none"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
