import avatar from "../../assets/miso/avatar.png";
import books from "../../assets/miso/books.png";
import coin from "../../assets/miso/coin.png";
import happy from "../../assets/miso/happy.png";
import heart from "../../assets/miso/heart.png";
import hero from "../../assets/miso/hero.png";
import idle from "../../assets/miso/idle.png";
import paw from "../../assets/miso/paw.png";
import plant from "../../assets/miso/plant.png";
import potplant from "../../assets/miso/potplant.png";
import sidebar from "../../assets/miso/sidebar.png";
import sleeping from "../../assets/miso/sleeping.png";
import small from "../../assets/miso/small.png";
import sparkle from "../../assets/miso/sparkle.png";
import star from "../../assets/miso/star.png";
import streak from "../../assets/miso/streak.png";
import studying from "../../assets/miso/studying.png";
import success from "../../assets/miso/success.png";

/** Pixel art cut from design/miso-sprite-sheet.jpg by tools/sprites/cut.ps1. */
const sprites = {
  avatar,
  books,
  coin,
  happy,
  heart,
  hero,
  idle,
  paw,
  plant,
  potplant,
  sidebar,
  sleeping,
  small,
  sparkle,
  star,
  streak,
  studying,
  success,
} as const;

export type SpriteName = keyof typeof sprites;

export function Sprite({
  name,
  className = "",
  label,
}: {
  name: SpriteName;
  className?: string;
  /** Omit for decorative sprites so screen readers skip them. */
  label?: string;
}) {
  return (
    <img
      src={sprites[name]}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      draggable={false}
      className={`pixel select-none ${className}`}
    />
  );
}
