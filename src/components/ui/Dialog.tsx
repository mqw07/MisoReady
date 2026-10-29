import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from "react";
import { CloseIcon } from "../icons.tsx";

export function Dialog({
  open,
  title,
  description,
  onClose,
  wide = false,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const dialog = ref.current;
    if (!dialog || dialog.open) return undefined;
    dialog.showModal();
    return () => {
      if (dialog.open && typeof dialog.close === "function") dialog.close();
    };
  }, [open]);

  if (!open) return null;

  function onBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      onClick={onBackdropClick}
      className={`pixel-box pb-surface ${wide ? "w-[min(40rem,calc(100vw-2rem))]" : "w-[min(28rem,calc(100vw-2rem))]"}`}
    >
      <div className="relative p-6">
        <h2 id={titleId} className="pr-10 font-pixel text-xl tracking-wide text-ink">
          {title}
        </h2>
        {description ? (
          <p id={descriptionId} className="mt-1.5 text-sm leading-6 text-muted">
            {description}
          </p>
        ) : null}
        <div className="mt-5">{children}</div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-2xl text-muted hover:bg-peach hover:text-ink"
        >
          <CloseIcon />
        </button>
      </div>
    </dialog>
  );
}
