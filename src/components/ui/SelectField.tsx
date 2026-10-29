import { useId, type CSSProperties, type SelectHTMLAttributes } from "react";

type SelectFieldProps = {
  label: string;
  hint?: string;
  error?: string | null;
} & SelectHTMLAttributes<HTMLSelectElement>;

export function SelectField({
  label,
  hint,
  error,
  id,
  className = "",
  children,
  ...props
}: SelectFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={className}>
      <label htmlFor={fieldId} className="mb-2 block text-sm font-bold text-ink">
        {label}
      </label>
      <select
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        style={error ? ({ "--pi-border": "var(--color-danger)" } as CSSProperties) : undefined}
        className="pixel-input w-[calc(100%-4px)] bg-surface px-3 py-2.5 text-sm text-ink focus-visible:outline-offset-4"
        {...props}
      >
        {children}
      </select>
      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-2 text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
