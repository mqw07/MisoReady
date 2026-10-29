import { PixelSparkle, WindowPole } from "../pixel/decor.tsx";
import { Sprite } from "./Sprite.tsx";

/**
 * Decorative hero scene: Miso sitting still on the ledge next to a stack of books and a
 * potted plant. The tan ledge itself is drawn by Atmosphere at the bottom of the banner and is
 * 14px tall, so Miso's paws are set 6px above the scene bottom, well down onto its surface,
 * and the books and plant 8px, rather than just touching its top edge.
 * The hero sprite is shown at its native 135px width so its pixels stay crisp.
 */
export function WindowsillMiso() {
  return (
    <div className="decor relative hidden h-[12rem] w-[23rem] shrink-0 md:block" aria-hidden="true">
      <WindowPole className="absolute top-[-3rem] bottom-3 left-[1.6rem]" />
      <PixelSparkle className="absolute top-1 right-2 h-5" />
      <PixelSparkle className="absolute top-12 right-[7.5rem] h-3" />

      <div className="pixel-box pixel-box-sm pb-surface absolute top-2 left-0 flex h-9 w-9 items-center justify-center">
        <Sprite name="heart" className="h-5 w-auto" />
      </div>
      <div className="absolute top-[2.9rem] left-3 h-2 w-2 rotate-45 border-r-2 border-b-2 border-line bg-surface" />

      <Sprite name="hero" className="absolute bottom-[6px] left-6 h-[160px] w-[135px]" />

      <Sprite name="books" className="absolute right-[6.4rem] bottom-[8px] h-auto w-[5.2rem]" />
      <Sprite name="potplant" className="absolute right-3 bottom-[8px] h-auto w-[4.6rem]" />
    </div>
  );
}
