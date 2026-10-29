import bellCollar from "../../assets/miso/looks/bell-collar.png";
import blueBow from "../../assets/miso/looks/blue-bow.png";
import brownSunglasses from "../../assets/miso/looks/brown-sunglasses.png";
import moonlitWindow from "../../assets/miso/looks/moonlit-window.png";
import roundGlasses from "../../assets/miso/looks/round-glasses.png";
import wickerBasket from "../../assets/miso/looks/wicker-basket.png";

export const COSMETIC_CATEGORIES = ["glasses", "collar", "bed", "background"] as const;

export type CosmeticCategory = (typeof COSMETIC_CATEGORIES)[number];

export interface Cosmetic {
  id: string;
  name: string;
  description: string;
  category: CosmeticCategory;
  price: number;
  src: string;
}

export const CATEGORY_LABELS: Record<CosmeticCategory, string> = {
  glasses: "Glasses",
  collar: "Collars",
  bed: "Beds",
  background: "Backgrounds",
};

export const COSMETICS: readonly Cosmetic[] = [
  {
    id: "glasses-round",
    name: "Round glasses",
    description: "Clear frames for looking closely at a card.",
    category: "glasses",
    price: 50,
    src: roundGlasses,
  },
  {
    id: "glasses-sun",
    name: "Brown sunglasses",
    description: "Tinted lenses for a windowsill nap.",
    category: "glasses",
    price: 90,
    src: brownSunglasses,
  },
  {
    id: "collar-bell",
    name: "Bell collar",
    description: "A red collar with a small gold bell.",
    category: "collar",
    price: 30,
    src: bellCollar,
  },
  {
    id: "collar-bow",
    name: "Blue bow",
    description: "A navy bow tied at the neck.",
    category: "collar",
    price: 60,
    src: blueBow,
  },
  {
    id: "bed-basket",
    name: "Wicker basket",
    description: "A tan basket that frames a sit.",
    category: "bed",
    price: 120,
    src: wickerBasket,
  },
  {
    id: "bg-night",
    name: "Night window",
    description: "A deep blue evening with quiet stars.",
    category: "background",
    price: 100,
    src: moonlitWindow,
  },
];

const byId = new Map(COSMETICS.map((item) => [item.id, item]));

export function getCosmetic(id: string): Cosmetic | undefined {
  return byId.get(id);
}

export function cosmeticsInCategory(category: CosmeticCategory): Cosmetic[] {
  return COSMETICS.filter((item) => item.category === category);
}

export function equippedCosmetic(
  equipped: Record<string, string | undefined>,
  category: CosmeticCategory,
): Cosmetic | undefined {
  const id = equipped[category];
  return id ? getCosmetic(id) : undefined;
}

/** Sitting portrait to show. Unknown equipped ids fall back to the base sprite. */
export function portraitLook(equipped: Record<string, string | undefined>): Cosmetic | undefined {
  for (const category of COSMETIC_CATEGORIES) {
    const item = equippedCosmetic(equipped, category);
    if (item) return item;
  }
  return undefined;
}
