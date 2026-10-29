import { useState } from "react";
import { MisoPortrait } from "../components/miso/MisoPortrait.tsx";
import { PageHeader } from "../components/layout/PageHeader.tsx";
import { GrassStrip, PixelSparkle } from "../components/pixel/decor.tsx";
import { Badge } from "../components/ui/Badge.tsx";
import { Button } from "../components/ui/Button.tsx";
import { Panel } from "../components/ui/Panel.tsx";
import { useLibrary } from "../features/library/useLibrary.ts";
import { studyProgress } from "../features/progress/studyProgress.ts";
import { usePageTitle } from "../hooks/usePageTitle.ts";
import {
  CATEGORY_LABELS,
  COSMETIC_CATEGORIES,
  COSMETICS,
  cosmeticsInCategory,
  type Cosmetic,
} from "../services/gamification/catalog.ts";
import { previewEquipped } from "../services/gamification/shop.ts";
import { formatPoints } from "../utils/format.ts";

export function ShopPage() {
  usePageTitle("Shop");
  const { state, miso, buyCosmetic, equipCosmetic, unequipCosmetic } = useLibrary();
  const progress = studyProgress(state);
  const [previewId, setPreviewId] = useState<string | undefined>(COSMETICS[0]?.id);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const shown = previewEquipped(miso.equipped, previewId);

  function run(id: string, action: () => string | null, success: string) {
    setBusyId(id);
    const error = action();
    setBusyId(null);
    if (error === "unaffordable") setMessage("Not enough points for that piece.");
    else if (error === "owned") setMessage("Miso already owns that piece.");
    else if (error) setMessage("That piece could not be updated.");
    else setMessage(success);
  }

  return (
    <>
      <PageHeader title="Shop" lede="Spend points from real reviews on cosmetics for Miso." />
      <div className="grid items-start gap-5 lg:grid-cols-5">
        <div className="grid gap-6 lg:col-span-3">
          <p className="text-sm font-bold text-muted">Balance: {formatPoints(progress.points)}</p>
          {message ? (
            <p role="status" className="text-sm font-bold text-ink">
              {message}
            </p>
          ) : null}
          {COSMETIC_CATEGORIES.map((category) => (
            <section key={category} className="grid gap-3">
              <h2 className="text-lg text-ink">{CATEGORY_LABELS[category]}</h2>
              <ul className="grid gap-3">
                {cosmeticsInCategory(category).map((item) => (
                  <li key={item.id}>
                    <ShopItem
                      item={item}
                      points={progress.points}
                      owned={miso.ownedCosmeticIds.includes(item.id)}
                      equipped={miso.equipped[item.category] === item.id}
                      previewed={previewId === item.id}
                      busy={busyId === item.id}
                      onPreview={() => setPreviewId(item.id)}
                      onBuy={() => run(item.id, () => buyCosmetic(item.id), `Bought ${item.name}.`)}
                      onEquip={() => run(item.id, () => equipCosmetic(item.id), `Equipped ${item.name}.`)}
                      onUnequip={() => {
                        unequipCosmetic(item.category);
                        setMessage(`Unequipped ${item.name}.`);
                      }}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <Panel tone="sky" className="lg:col-span-2 lg:sticky lg:top-6">
          <PixelSparkle className="absolute top-6 right-8 z-10 h-4" />
          <div className="relative h-[280px] overflow-hidden">
            <GrassStrip variant="flat" />
            <div className="absolute inset-x-0 bottom-0 flex justify-center px-4">
              <MisoPortrait className="relative z-[1] w-[15rem] max-w-[92%] translate-y-4" equipped={shown} idle />
            </div>
          </div>
          <p className="relative z-10 px-6 py-4 text-center text-sm font-bold text-muted">
            Preview replaces Miso's sitting portrait. Buying does not equip until you choose it.
          </p>
        </Panel>
      </div>
    </>
  );
}

function ShopItem({
  item,
  points,
  owned,
  equipped,
  previewed,
  busy,
  onPreview,
  onBuy,
  onEquip,
  onUnequip,
}: {
  item: Cosmetic;
  points: number;
  owned: boolean;
  equipped: boolean;
  previewed: boolean;
  busy: boolean;
  onPreview: () => void;
  onBuy: () => void;
  onEquip: () => void;
  onUnequip: () => void;
}) {
  const shortfall = Math.max(0, item.price - points);
  return (
    <article className="pixel-box pixel-box-sm relative pb-surface flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-extrabold text-ink">{item.name}</h3>
          {owned ? <Badge>Owned</Badge> : null}
          {equipped ? <Badge>Equipped</Badge> : null}
        </div>
        <p className="mt-1 text-sm leading-6 text-muted">{item.description}</p>
        <p className="mt-1 text-sm font-bold text-ink">{formatPoints(item.price)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={previewed}
          onClick={onPreview}
          aria-label={`Preview ${item.name}`}
        >
          Preview
        </Button>
        {owned ? (
          equipped ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={onUnequip}
              disabled={busy}
              aria-label={`Unequip ${item.name}`}
            >
              Unequip
            </Button>
          ) : (
            <Button size="sm" onClick={onEquip} disabled={busy} aria-label={`Equip ${item.name}`}>
              Equip
            </Button>
          )
        ) : shortfall > 0 ? (
          <Button size="sm" disabled aria-label={`${item.name}, ${formatPoints(shortfall)} more needed`}>
            Need {formatPoints(shortfall)}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={onBuy}
            disabled={busy}
            aria-label={`Buy ${item.name} for ${formatPoints(item.price)}`}
          >
            Buy
          </Button>
        )}
      </div>
    </article>
  );
}
