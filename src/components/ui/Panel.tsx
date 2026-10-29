import type { HTMLAttributes, ReactNode } from "react";

export type PanelTone = "surface" | "sunshine" | "sky" | "lavender" | "meadow" | "leaf" | "muted";

const tones: Record<PanelTone, string> = {
  surface: "pb-surface",
  sunshine: "pb-sunshine",
  sky: "pb-sky",
  lavender: "pb-lavender",
  meadow: "pb-meadow",
  leaf: "pb-leaf",
  muted: "pb-muted",
};

/** Pixel-framed card. `head` reserves a tinted title band (see TitledPanel). */
export function Panel({
  className = "",
  tone = "surface",
  head = false,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode; tone?: PanelTone; head?: boolean }) {
  return (
    <section
      className={`pixel-box relative ${tones[tone]} ${head ? "pixel-box-head" : ""} ${className}`}
      {...props}
    >
      {children}
    </section>
  );
}

/** Panel with a tinted band holding an icon and a pixel-font subtitle. */
export function TitledPanel({
  tone,
  icon,
  title,
  aside,
  className = "",
  bodyClassName = "",
  children,
}: {
  tone: PanelTone;
  icon: ReactNode;
  title: string;
  aside?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <Panel tone={tone} head className={className}>
      <div className="flex h-[calc(var(--pb-head-h)+var(--s))] items-center gap-2.5 px-5 pt-[var(--s)]">
        <span className="text-ink-soft">{icon}</span>
        <h2 className="text-[1.65rem] leading-none text-ink">{title}</h2>
        {aside ? <div className="ml-auto">{aside}</div> : null}
      </div>
      <div className={bodyClassName}>{children}</div>
    </Panel>
  );
}
