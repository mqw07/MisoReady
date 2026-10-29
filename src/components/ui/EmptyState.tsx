import type { ReactNode } from "react";
import { Sprite, type SpriteName } from "../miso/Sprite.tsx";

export function EmptyState({
  title,
  body,
  action,
  art = "plant",
}: {
  title: string;
  body: string;
  action?: ReactNode;
  /** Decorative sprite shown at the right edge. */
  art?: Extract<SpriteName, "plant" | "sleeping" | "books" | "studying">;
}) {
  const wide = art === "sleeping" || art === "studying";
  return (
    <div className="pixel-box pb-muted relative px-6 py-8">
      <div className="decor absolute right-5 bottom-3 hidden sm:block" aria-hidden="true">
        <Sprite name={art} className={`h-auto ${wide ? "w-28" : "w-16"} opacity-95`} />
      </div>
      <p className="font-pixel text-lg text-ink">{title}</p>
      <p className="mt-2 max-w-prose text-sm leading-6 text-muted sm:pr-32">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
