import type { ReactNode, SVGProps } from "react";
import { PixelArt } from "./pixel/PixelArt.tsx";
import {
  bag,
  barsChart,
  book,
  calendar,
  cap,
  gearWheel,
  home,
  note,
  play,
  plus,
} from "./pixel/maps.ts";
import { glyph } from "./pixel/palettes.ts";

/**
 * Pixel glyph that follows the surrounding text colour. `scale` is how many CSS pixels
 * each map pixel covers; whole numbers keep every pixel the same size.
 */
function Glyph({ map, scale }: { map: readonly string[]; scale: number }) {
  return (
    <PixelArt
      map={map}
      colors={glyph}
      className="shrink-0"
      style={{ width: (map[0]?.length ?? 0) * scale, height: map.length * scale }}
    />
  );
}

type IconProps = { scale?: number };

// Navigation uses the default 3x. Panel headers pass scale={2}.
export const HomeIcon = ({ scale = 3 }: IconProps) => <Glyph map={home} scale={scale} />;
export const TodayIcon = ({ scale = 3 }: IconProps) => <Glyph map={calendar} scale={scale} />;
export const BookIcon = ({ scale = 3 }: IconProps) => <Glyph map={book} scale={scale} />;
export const GraduationIcon = ({ scale = 3 }: IconProps) => <Glyph map={cap} scale={scale} />;
export const PlusIcon = ({ scale = 2 }: IconProps) => <Glyph map={plus} scale={scale} />;
export const ShopIcon = ({ scale = 3 }: IconProps) => <Glyph map={bag} scale={scale} />;
export const StatsIcon = ({ scale = 3 }: IconProps) => <Glyph map={barsChart} scale={scale} />;
export const SettingsIcon = ({ scale = 3 }: IconProps) => <Glyph map={gearWheel} scale={scale} />;
export const PlayIcon = ({ scale = 2 }: IconProps) => <Glyph map={play} scale={scale} />;
export const NoteIcon = ({ scale = 3 }: IconProps) => <Glyph map={note} scale={scale} />;

/* Utility controls stay smooth vector strokes so they read clearly at small sizes. */
function Icon({
  children,
  className = "",
  ...props
}: { children: ReactNode; className?: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
      {...props}
    >
      {children}
    </svg>
  );
}

export function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <Icon className={className}>
      <path
        d="M12 4.5 6.5 10 12 15.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </Icon>
  );
}

export function ArrowRightIcon() {
  return (
    <Icon>
      <path
        d="M7.2 4.8 13 10l-5.8 5.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </Icon>
  );
}

export function MenuIcon() {
  return (
    <Icon>
      <path d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
    </Icon>
  );
}

export function CloseIcon() {
  return (
    <Icon>
      <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
    </Icon>
  );
}
