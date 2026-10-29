import { useId, type CSSProperties, type InputHTMLAttributes } from "react";

type TextFieldProps = {
  label: string;
  hint?: string;
  error?: string | null;
} & InputHTMLAttributes<HTMLInputElement>;

export function TextField({ label, hint, error, id, className = "", ...props }: TextFieldProps) {
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
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        style={error ? ({ "--pi-border": "var(--color-danger)" } as CSSProperties) : undefined}
        className="pixel-input w-[calc(100%-4px)] bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-faint focus-visible:outline-offset-4"
        {...props}
      />
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
