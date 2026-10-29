import { useId, type CSSProperties, type TextareaHTMLAttributes } from "react";

type TextAreaProps = {
  label: string;
  hint?: string;
  error?: string | null;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextArea({ label, hint, error, id, className = "", ...props }: TextAreaProps) {
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
      <textarea
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        style={error ? ({ "--pi-border": "var(--color-danger)" } as CSSProperties) : undefined}
        className="pixel-input min-h-24 w-[calc(100%-4px)] resize-y bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-faint focus-visible:outline-offset-4"
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
