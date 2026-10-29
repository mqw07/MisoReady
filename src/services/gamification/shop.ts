import type { AppState, MisoState } from "../../types/domain.ts";
import { getCosmetic, type CosmeticCategory } from "./catalog.ts";

export type ShopError = "unknown" | "owned" | "unaffordable" | "unowned";

export function previewEquipped(
  equipped: Record<string, string>,
  previewId: string | undefined,
): Record<string, string> {
  if (!previewId) return equipped;
  const item = getCosmetic(previewId);
  if (!item) return equipped;
  return { [item.category]: previewId };
}

export function purchaseCosmetic(
  state: AppState,
  cosmeticId: string,
): { state: AppState } | { error: ShopError } {
  const item = getCosmetic(cosmeticId);
  if (!item) return { error: "unknown" };
  if (state.miso.ownedCosmeticIds.includes(cosmeticId)) return { error: "owned" };
  if (state.progress.points < item.price) return { error: "unaffordable" };

  const miso: MisoState = {
    ...state.miso,
    ownedCosmeticIds: [...state.miso.ownedCosmeticIds, cosmeticId],
  };
  return {
    state: {
      ...state,
      progress: {
        ...state.progress,
        points: state.progress.points - item.price,
      },
      miso,
    },
  };
}

export function equipCosmetic(
  state: AppState,
  cosmeticId: string,
): { state: AppState } | { error: ShopError } {
  const item = getCosmetic(cosmeticId);
  if (!item) return { error: "unknown" };
  if (!state.miso.ownedCosmeticIds.includes(cosmeticId)) return { error: "unowned" };
  return {
    state: {
      ...state,
      miso: {
        ...state.miso,
        equipped: { [item.category]: cosmeticId },
      },
    },
  };
}

export function unequipCategory(state: AppState, category: CosmeticCategory): { state: AppState } {
  const equipped = { ...state.miso.equipped };
  delete equipped[category];
  return {
    state: {
      ...state,
      miso: { ...state.miso, equipped },
    },
  };
}
