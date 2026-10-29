import { BrowserRouter, Route, Routes } from "react-router";
import { AppLayout } from "./components/layout/AppLayout.tsx";
import { LibraryProvider } from "./features/library/LibraryProvider.tsx";
import { CoursePage } from "./pages/CoursePage.tsx";
import { MisoPage } from "./pages/MisoPage.tsx";
import { NotFoundPage } from "./pages/NotFoundPage.tsx";
import { SettingsPage } from "./pages/SettingsPage.tsx";
import { ShopPage } from "./pages/ShopPage.tsx";
import { StatsPage } from "./pages/StatsPage.tsx";
import { StudyPage } from "./pages/StudyPage.tsx";
import { TodayPage } from "./pages/TodayPage.tsx";
import { UnitPage } from "./pages/UnitPage.tsx";

export function App() {
  return (
    <BrowserRouter>
      <LibraryProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<TodayPage />} />
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
      </LibraryProvider>
    </BrowserRouter>
  );
}
