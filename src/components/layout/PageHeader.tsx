import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  lede,
  actions,
}: {
  eyebrow?: string;
  title: string;
  lede: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow ? <p className="mb-2 text-sm font-bold text-accent-ink">{eyebrow}</p> : null}
        <h1 className="text-[1.85rem] leading-tight font-extrabold tracking-tight break-words text-ink sm:text-[2.15rem]">
          {title}
        </h1>
        <p className="mt-2 text-base leading-6 text-muted">{lede}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
