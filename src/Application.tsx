import { useEffect } from "react";
import { Route, Routes, useBlocker } from "react-router";
import { AppLayout } from "./components/layout/AppLayout.tsx";
import { Button } from "./components/ui/Button.tsx";
import { Dialog } from "./components/ui/Dialog.tsx";
import { LibraryProvider } from "./features/library/LibraryProvider.tsx";
import { useLibrary } from "./features/library/useLibrary.ts";
import { CoursePage } from "./pages/CoursePage.tsx";
import { LearnPage } from "./pages/LearnPage.tsx";
import { MisoPage } from "./pages/MisoPage.tsx";
import { NotFoundPage } from "./pages/NotFoundPage.tsx";
import { SettingsPage } from "./pages/SettingsPage.tsx";
import { ShopPage } from "./pages/ShopPage.tsx";
import { StatsPage } from "./pages/StatsPage.tsx";
import { StudyPage } from "./pages/StudyPage.tsx";
import { TodayPage } from "./pages/TodayPage.tsx";
import { UnitPage } from "./pages/UnitPage.tsx";
import { isAppPath } from "./routes.ts";

function ApplicationExitGuard() {
  const { hasUnsavedChanges, navigationRisks, retrySave } = useLibrary();
  const blocker = useBlocker(({ nextLocation }) => !isAppPath(nextLocation.pathname) && (hasUnsavedChanges || navigationRisks.length > 0));
  useEffect(() => {
    if (blocker.state === "blocked" && !hasUnsavedChanges && navigationRisks.length === 0) blocker.proceed();
  }, [blocker, hasUnsavedChanges, navigationRisks.length]);
  return <Dialog open={blocker.state === "blocked"} title={hasUnsavedChanges ? "Save your progress before leaving" : "Leave your card drafts?"}
    description={hasUnsavedChanges ? "Your latest progress is only in this tab. Retry saving before returning to the landing page." : "Your notes and unfinished card drafts are still here. Leaving cancels generation and discards these drafts."}
    onClose={() => blocker.state === "blocked" && blocker.reset()}>
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" onClick={() => blocker.state === "blocked" && blocker.reset()}>Stay in Miso</Button>
      {hasUnsavedChanges ? <Button onClick={retrySave}>Retry saving</Button> : <Button variant="danger" onClick={() => blocker.state === "blocked" && blocker.proceed()}>Discard drafts and leave</Button>}
    </div>
  </Dialog>;
}

export function Component() {
  return <LibraryProvider>
    <ApplicationExitGuard />
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<TodayPage />} />
        <Route path="learn" element={<LearnPage />} />
        <Route path="study" element={<StudyPage />} />
        <Route path="miso" element={<MisoPage />} />
        <Route path="shop" element={<ShopPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="courses/:courseId" element={<CoursePage />} />
        <Route path="courses/:courseId/units/:unitId" element={<UnitPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  </LibraryProvider>;
}
