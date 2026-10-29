import { describe, expect, it } from "vitest";
import { emptyAppState } from "../../repositories/schema.ts";
import { COSMETICS, portraitLook } from "./catalog.ts";
import { equipCosmetic, previewEquipped, purchaseCosmetic, unequipCategory } from "./shop.ts";

const round = COSMETICS.find((item) => item.id === "glasses-round")!;
const sun = COSMETICS.find((item) => item.id === "glasses-sun")!;
const bell = COSMETICS.find((item) => item.id === "collar-bell")!;

function rich(points = 200) {
  const state = emptyAppState();
  return { ...state, progress: { ...state.progress, points } };
}

describe("purchaseCosmetic", () => {
  it("deducts points and adds inventory in one update", () => {
    const result = purchaseCosmetic(rich(80), round.id);
    expect("state" in result).toBe(true);
    if (!("state" in result)) return;
    expect(result.state.progress.points).toBe(30);
    expect(result.state.miso.ownedCosmeticIds).toEqual([round.id]);
    expect(result.state.miso.equipped).toEqual({});
  });

  it("rejects duplicates, missing catalog entries, and unaffordable buys", () => {
    const owned = purchaseCosmetic(rich(80), round.id);
    expect("state" in owned).toBe(true);
    if (!("state" in owned)) return;
    expect(purchaseCosmetic(owned.state, round.id)).toEqual({ error: "owned" });
    expect(purchaseCosmetic(rich(), "hat-fedora")).toEqual({ error: "unknown" });
    const broke = rich(10);
    expect(purchaseCosmetic(broke, round.id)).toEqual({ error: "unaffordable" });
    expect(broke.progress.points).toBe(10);
  });

  it("can spend every point without going negative", () => {
    const result = purchaseCosmetic(rich(round.price), round.id);
    expect("state" in result).toBe(true);
    if (!("state" in result)) return;
    expect(result.state.progress.points).toBe(0);
  });
});

describe("equipCosmetic", () => {
  it("equips only owned items and keeps a single look equipped", () => {
    let state = rich();
    state = (purchaseCosmetic(state, round.id) as { state: typeof state }).state;
    state = (purchaseCosmetic(state, sun.id) as { state: typeof state }).state;
    state = (purchaseCosmetic(state, bell.id) as { state: typeof state }).state;

    expect(equipCosmetic(state, "missing")).toEqual({ error: "unknown" });

    const first = equipCosmetic(state, round.id);
    expect("state" in first).toBe(true);
    if (!("state" in first)) return;
    expect(first.state.miso.equipped.glasses).toBe(round.id);

    const swapped = equipCosmetic(first.state, sun.id);
    expect("state" in swapped).toBe(true);
    if (!("state" in swapped)) return;
    expect(swapped.state.miso.equipped).toEqual({ glasses: sun.id });

    const collared = equipCosmetic(swapped.state, bell.id);
    expect("state" in collared).toBe(true);
    if (!("state" in collared)) return;
    expect(collared.state.miso.equipped).toEqual({ collar: bell.id });

    const cleared = unequipCategory(collared.state, "collar");
    expect(cleared.state.miso.equipped).toEqual({});
  });

  it("blocks equipping an unowned cosmetic", () => {
    expect(equipCosmetic(rich(), round.id)).toEqual({ error: "unowned" });
  });
});

describe("previewEquipped", () => {
  it("shows the previewed look in place of whatever is equipped", () => {
    expect(previewEquipped({ glasses: sun.id }, round.id)).toEqual({
      glasses: round.id,
    });
    expect(previewEquipped({ glasses: sun.id }, bell.id)).toEqual({
      collar: bell.id,
    });
  });
});

describe("portraitLook", () => {
  it("uses catalog artwork and ignores unknown equipped ids", () => {
    expect(portraitLook({ glasses: round.id })?.id).toBe(round.id);
    expect(portraitLook({ collar: bell.id })?.id).toBe(bell.id);
    expect(portraitLook({ collar: "collar-missing" })).toBeUndefined();
  });
});
