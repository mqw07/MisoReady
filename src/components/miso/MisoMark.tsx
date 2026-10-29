import { Sprite, type SpriteName } from "./Sprite.tsx";

/** Small decorative face used for the logo and navigation. */
export function MisoMark({
  className = "h-10 w-auto",
  sprite = "avatar",
}: {
  className?: string;
  sprite?: Extract<SpriteName, "avatar" | "sidebar" | "small">;
}) {
  return <Sprite name={sprite} className={`shrink-0 ${className}`} />;
}
