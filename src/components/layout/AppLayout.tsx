import { appPaths } from "../../routes.ts";
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { useLibrary } from "../../features/library/useLibrary.ts";
import { MenuIcon } from "../icons.tsx";
import { NamePromptDialog } from "../ui/NamePromptDialog.tsx";
import { Atmosphere } from "./Atmosphere.tsx";
import { MobileDrawer } from "./MobileDrawer.tsx";
import { Sidebar } from "./Sidebar.tsx";

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { createCourse, persistBlocked, persistError, retrySave, writeReady } = useLibrary();

  if (menuPath !== null && menuPath !== location.pathname) {
    setMenuPath(null);
  }

  const mobileOpen = menuPath === location.pathname;

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    function onChange() {
      if (media.matches) setMenuPath(null);
    }
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="relative flex h-dvh overflow-hidden bg-canvas text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-2xl focus:border-2 focus:border-line focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      {!writeReady ? <p role="status" className="absolute top-4 left-4 z-50 bg-surface p-4">{persistError ?? "Miso is open in another tab. Close that tab to continue here."}</p> : null}
      <div className="flex min-w-0 flex-1" inert={mobileOpen || !writeReady ? true : undefined}>
        <aside
          className={`hidden h-full shrink-0 flex-col border-r-[3px] border-line bg-sidebar transition-[width] duration-200 ease-out motion-reduce:transition-none lg:flex ${
            collapsed ? "w-20" : "w-[224px]"
          }`}
        >
          <Sidebar
            collapsed={collapsed}
            showCollapse
            onToggleCollapse={() => setCollapsed((current) => !current)}
            onNewCourse={() => setCourseDialogOpen(true)}
          />
        </aside>

        <div className="relative flex min-w-0 flex-1 flex-col">
          <Atmosphere hero={location.pathname.replace(/\/+$/, "") === appPaths.home} />
          <header className="relative z-10 flex items-center gap-3 border-b-2 border-line bg-sidebar px-4 py-3 lg:hidden">
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              onClick={() => setMenuPath(location.pathname)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl hover:bg-peach"
            >
              <MenuIcon />
            </button>
            <span className="font-pixel text-2xl leading-none tracking-wide">Miso</span>
          </header>
          <main id="main" tabIndex={-1} className="relative z-10 min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
              {persistBlocked || persistError ? (
                <p role="alert" className="mb-6 text-sm font-bold text-danger">
                  {persistBlocked
                    ? "Saved study data could not be read. This session will not overwrite it."
                    : `Progress is only in this tab. Keep it open and retry saving. ${persistError}`}
                  {!persistBlocked ? <button type="button" onClick={retrySave} className="ml-3 underline">Retry saving</button> : null}
                </p>
              ) : null}
              {writeReady ? <Outlet /> : null}
            </div>
          </main>
        </div>
      </div>

      {mobileOpen ? (
        <MobileDrawer onClose={() => setMenuPath(null)} onNewCourse={() => setCourseDialogOpen(true)} />
      ) : null}

      <NamePromptDialog
        open={courseDialogOpen}
        title="New course"
        description="Name a course to organize units and cards. It is saved on this device."
        label="Course name"
        placeholder="For example, CSC209"
        submitLabel="Create course"
        onClose={() => setCourseDialogOpen(false)}
        onSubmit={(name) => {
          const course = createCourse(name);
          setCourseDialogOpen(false);
          navigate(appPaths.course(course.id));
        }}
      />
    </div>
  );
}
