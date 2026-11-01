import { appPaths } from "../routes.ts";
import { MisoPortrait } from "../components/miso/MisoPortrait.tsx";
import { PageHeader } from "../components/layout/PageHeader.tsx";
import { GrassStrip, PixelSparkle } from "../components/pixel/decor.tsx";
import { Button, ButtonLink } from "../components/ui/Button.tsx";
import { Panel } from "../components/ui/Panel.tsx";
import { useLibrary } from "../features/library/useLibrary.ts";
import { usePageTitle } from "../hooks/usePageTitle.ts";
import {
  CATEGORY_LABELS,
  COSMETIC_CATEGORIES,
  getCosmetic,
  type CosmeticCategory,
} from "../services/gamification/catalog.ts";

export function MisoPage() {
  usePageTitle("Miso");
  const { miso, equipCosmetic, unequipCosmetic } = useLibrary();
  const owned = miso.ownedCosmeticIds
    .map((id) => getCosmetic(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <>
      <PageHeader title="Miso" lede="A cozy cat who sits with you while you study." />
      <div className="grid items-start gap-5 lg:grid-cols-5">
        <Panel tone="sky" className="lg:col-span-3">
          <PixelSparkle className="absolute top-8 left-10 h-5" />
          <PixelSparkle className="absolute top-14 right-14 h-4" />
          <GrassStrip />
          <div className="relative flex min-h-[300px] items-center justify-center px-6 pt-10 pb-16">
            <MisoPortrait className="w-full max-w-[240px]" equipped={miso.equipped} idle />
          </div>
        </Panel>
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Panel className="p-6">
            <h2 className="text-lg text-ink">Equipped</h2>
            {COSMETIC_CATEGORIES.every((category) => !getCosmetic(miso.equipped[category] ?? "")) ? (
              <p className="mt-2 text-sm leading-6 text-muted">Nothing is equipped. Miso is just Miso.</p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {COSMETIC_CATEGORIES.map((category) => (
                  <EquippedRow
                    key={category}
                    category={category}
                    equippedId={miso.equipped[category]}
                    onUnequip={() => unequipCosmetic(category)}
                  />
                ))}
              </ul>
            )}
          </Panel>
          <Panel className="p-6">
            <h2 className="text-lg text-ink">Inventory</h2>
            {owned.length === 0 ? (
              <p className="mt-2 text-sm leading-6 text-muted">
                Equipped looks replace Miso's sitting portrait. They never change grades or scheduling.
              </p>
            ) : (
              <ul className="mt-4 grid gap-2">
                {owned.map((item) => {
                  const on = miso.equipped[item.category] === item.id;
                  return (
                    <li key={item.id} className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-ink">{item.name}</span>
                      {on ? (
                        <span className="text-sm font-bold text-muted">Equipped</span>
                      ) : (
                        <Button size="sm" onClick={() => equipCosmetic(item.id)} aria-label={`Equip ${item.name}`}>
                          Equip
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-5">
              <ButtonLink to={appPaths.shop} variant="secondary">
                Visit the shop
              </ButtonLink>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

function EquippedRow({
  category,
  equippedId,
  onUnequip,
}: {
  category: CosmeticCategory;
  equippedId: string | undefined;
  onUnequip: () => void;
}) {
  const item = equippedId ? getCosmetic(equippedId) : undefined;
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted">
        {CATEGORY_LABELS[category]}:{" "}
        <span className="font-bold text-ink">{item?.name ?? "None"}</span>
      </span>
      {item ? (
        <Button variant="ghost" size="sm" onClick={onUnequip} aria-label={`Unequip ${item.name}`}>
          Unequip
        </Button>
      ) : null}
    </li>
  );
}
