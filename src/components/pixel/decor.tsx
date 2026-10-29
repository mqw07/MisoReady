import type { CSSProperties } from "react";
import { Sprite } from "../miso/Sprite.tsx";
import { PixelArt } from "./PixelArt.tsx";
import { BANK_TILE_W, cloudBank, cloudSmall, cloudTall, cloudWide, cloudWisp } from "./clouds.ts";
import { GRASS_TILE_W, grassColors, grassTiles, type GrassVariant } from "./grass.ts";
import { plusSpark, sun, windowPole } from "./maps.ts";
import { bankColors, blueCloudColors, cloudColors, plusSparkle, poleColors, sunColors } from "./palettes.ts";
import { pixelMapToSvgUri } from "./pixelSvg.ts";

const cloudShapes = { wide: cloudWide, tall: cloudTall, small: cloudSmall, wisp: cloudWisp } as const;
export type CloudKind = keyof typeof cloudShapes;

const grassUris: Record<GrassVariant, string> = {
  meadow: pixelMapToSvgUri(grassTiles.meadow, grassColors),
  low: pixelMapToSvgUri(grassTiles.low, grassColors),
  flat: pixelMapToSvgUri(grassTiles.flat, grassColors),
};
const bankUri = pixelMapToSvgUri(cloudBank, bankColors);
const poleUri = pixelMapToSvgUri(windowPole, poleColors);

export function PixelPaw({ className = "h-5 w-5" }: { className?: string }) {
  return <Sprite name="paw" className={`w-auto ${className}`} />;
}

export function PixelSparkle({ className = "h-4 w-4" }: { className?: string }) {
  return <Sprite name="sparkle" className={`sparkle w-auto ${className}`} />;
}

/** Yellow plus-shaped sparkle, as drawn around Miso in the reference. */
export function PlusSparkle({ className = "h-4 w-4" }: { className?: string }) {
  return <PixelArt map={plusSpark} colors={plusSparkle} className={`sparkle ${className}`} />;
}

export function PixelSun({ className = "h-10 w-10" }: { className?: string }) {
  return <PixelArt map={sun} colors={sunColors} className={className} />;
}

export function PixelCloud({
  kind,
  tone = "cream",
  className = "",
}: {
  kind: CloudKind;
  tone?: "cream" | "blue";
  className?: string;
}) {
  return (
    <PixelArt
      map={cloudShapes[kind]}
      colors={tone === "blue" ? blueCloudColors : cloudColors}
      className={`h-auto ${className}`}
    />
  );
}

/** Seamless cream cloud bank that fills the lower part of the sky. */
export function CloudBank({ scale = 6, className = "" }: { scale?: number; className?: string }) {
  return (
    <div
      className={`pixel absolute inset-x-0 bottom-0 ${className}`}
      style={{
        height: cloudBank.length * scale,
        backgroundImage: `url("${bankUri}")`,
        backgroundRepeat: "repeat-x",
        backgroundPosition: "left bottom",
        backgroundSize: `${BANK_TILE_W * scale}px ${cloudBank.length * scale}px`,
      }}
    />
  );
}

/**
 * Grass along the lower edge of a card or scene. `placement="card"` pins it inside a panel's
 * border; `"free"` leaves positioning to the caller.
 */
export function GrassStrip({
  variant = "meadow",
  placement = "card",
  scale = 4,
  className = "",
}: {
  variant?: GrassVariant;
  placement?: "card" | "free";
  scale?: number;
  className?: string;
}) {
  const tile = grassTiles[variant];
  const style: CSSProperties = {
    height: tile.length * scale,
    backgroundImage: `url("${grassUris[variant]}")`,
    backgroundRepeat: "repeat-x",
    backgroundPosition: "left bottom",
    backgroundSize: `${GRASS_TILE_W * scale}px ${tile.length * scale}px`,
  };
  return (
    <div
      className={`decor pixel ${placement === "card" ? "absolute inset-x-[3px] bottom-[6px]" : ""} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

/**
 * Wooden window post with a lit left edge, a shaded right side, grain, and plank seams, plus a
 * stepped shadow it casts onto the sky to its right. Give it a position and height via className.
 */
export function WindowPole({ scale = 4, className = "" }: { scale?: number; className?: string }) {
  const width = (windowPole[0]?.length ?? 0) * scale;
  return (
    <div className={`decor ${className}`} style={{ width }} aria-hidden="true">
      <div
        className="pixel h-full"
        style={{
          backgroundImage: `url("${poleUri}")`,
          backgroundRepeat: "repeat-y",
          backgroundSize: `${width}px ${windowPole.length * scale}px`,
        }}
      />
      <div className="absolute inset-y-0 left-full w-2 bg-[#6b4a2f]/20" />
      <div className="absolute inset-y-0 left-full ml-2 w-2 bg-[#6b4a2f]/10" />
    </div>
  );
}

/** Faint paw prints scattered behind card content. */
export function PawScatter({ className = "" }: { className?: string }) {
  return (
    <div className={`decor absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <PixelPaw className="absolute top-[4.6rem] right-12 h-6 -rotate-12 opacity-35" />
      <PixelPaw className="absolute top-[7.6rem] right-36 h-5 rotate-12 opacity-30" />
      <PixelPaw className="absolute top-[10.6rem] right-16 h-7 rotate-6 opacity-35" />
      <PixelPaw className="absolute top-[4.4rem] right-[16rem] h-5 -rotate-6 opacity-25" />
    </div>
  );
}
