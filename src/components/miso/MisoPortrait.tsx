import { portraitLook } from "../../services/gamification/catalog.ts";
import { Sprite, type SpriteName } from "./Sprite.tsx";

export type MisoPose = Extract<SpriteName, "idle" | "happy" | "sleeping" | "studying" | "success">;

/**
 * Sitting Miso uses a full purchase portrait when a look is equipped.
 * Study poses keep their sprite-sheet frames.
 */
export function MisoPortrait({
  className = "",
  pose = "idle",
  idle = false,
  equipped = {},
}: {
  className?: string;
  pose?: MisoPose;
  idle?: boolean;
  equipped?: Record<string, string | undefined>;
}) {
  const look = pose === "idle" ? portraitLook(equipped) : undefined;
  const frameClass = `h-auto w-full ${idle ? "miso-idle" : ""}`;

  return (
    <div className={`relative ${className}`}>
      {look ? (
        <img
          src={look.src}
          alt="Miso the cat"
          draggable={false}
          className={`pixel select-none ${frameClass}`}
        />
      ) : (
        <Sprite name={pose} label="Miso the cat" className={frameClass} />
      )}
    </div>
  );
}
