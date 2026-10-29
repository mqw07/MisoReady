import type { ReactNode } from "react";
import { Sprite, type SpriteName } from "../miso/Sprite.tsx";

/** Icon + value pair for points and streaks. */
export function StatBadge({
  icon,
  children,
}: {
  icon: Extract<SpriteName, "coin" | "streak" | "star">;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-ink">
      <Sprite name={icon} className="h-6 w-auto" />
      <span className="font-pixel text-base tracking-wide">{children}</span>
    </span>
  );
}
