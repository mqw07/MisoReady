import { PageHeader } from "../components/layout/PageHeader.tsx";
import { Badge } from "../components/ui/Badge.tsx";
import { Panel } from "../components/ui/Panel.tsx";
import { useLibrary } from "../features/library/useLibrary.ts";
import { ECONOMY } from "../services/gamification/config.ts";
import { usePageTitle } from "../hooks/usePageTitle.ts";

export function SettingsPage() {
  usePageTitle("Settings");
  const { persistBlocked } = useLibrary();

  return (
    <>
      <PageHeader title="Settings" lede="How Miso keeps your study data." />
      <div className="grid max-w-3xl gap-4">
        <Panel className="p-6">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold">This device</h2>
            <Badge>{persistBlocked ? "Could not read saved data" : "Saved on this device"}</Badge>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">
            {persistBlocked
              ? "Miso found study data it could not read. This session will not overwrite it, so nothing is deleted."
              : "Courses, units, cards, and schedules stay on this device. Miso does not use an account yet."}
          </p>
        </Panel>
        <Panel tone="meadow" className="p-6">
          <h2 className="text-base font-bold">Daily goal</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            A day counts after {ECONOMY.dailyGoalReviews} legitimate reviews, or after you finish every card that was due
            at the start of the day when fewer than {ECONOMY.dailyGoalReviews} are due. Opening Miso does not count.
          </p>
        </Panel>
        <Panel className="p-6">
          <h2 className="text-base font-bold">Motion</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Sidebar, menu, and Miso's idle bounce and study reactions follow your system setting for reduced
            motion.
          </p>
        </Panel>
      </div>
    </>
  );
}
