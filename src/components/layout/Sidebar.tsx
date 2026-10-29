import { useState, type ReactNode, type Ref } from "react";
import { NavLink } from "react-router";
import { useLibrary } from "../../features/library/useLibrary.ts";
import { studyProgress } from "../../features/progress/studyProgress.ts";
import { formatPoints, formatStreak } from "../../utils/format.ts";
import {
  BookIcon,
  ChevronIcon,
  CloseIcon,
  HomeIcon,
  PlusIcon,
  SettingsIcon,
  ShopIcon,
  StatsIcon,
} from "../icons.tsx";
import { MisoMark } from "../miso/MisoMark.tsx";

function itemClass(isActive: boolean, collapsed: boolean): string {
  return [
    "flex min-h-12 w-full items-center rounded-2xl text-left text-[1.05rem]",
    collapsed ? "justify-center" : "gap-2.5 px-3",
    isActive
      ? "bg-nav-active font-extrabold text-ink"
      : "font-extrabold text-ink hover:bg-peach/60",
  ].join(" ");
}

/** Fixed-width icon cell so labels line up even though the pixel glyphs differ in width. */
function IconCell({ children, active = false }: { children: ReactNode; active?: boolean }) {
  return (
    <span
      className={`flex w-10 shrink-0 items-center justify-center ${active ? "text-accent-ink" : "text-ink-soft"}`}
    >
      {children}
    </span>
  );
}

function NavItem({
  to,
  label,
  icon,
  collapsed,
  onNavigate,
}: {
  to: string;
  label: string;
  icon: ReactNode;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={to}
      end
      title={collapsed ? label : undefined}
      onClick={onNavigate}
      className={({ isActive }) => itemClass(isActive, collapsed)}
    >
      {({ isActive }) => (
        <>
          <IconCell active={isActive}>{icon}</IconCell>
          <span className={collapsed ? "sr-only" : "truncate"}>{label}</span>
        </>
      )}
    </NavLink>
  );
}

export function Sidebar({
  collapsed = false,
  onNavigate,
  onNewCourse,
  showCollapse = false,
  onToggleCollapse,
  showClose = false,
  onClose,
  closeRef,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
  onNewCourse: () => void;
  showCollapse?: boolean;
  onToggleCollapse?: () => void;
  showClose?: boolean;
  onClose?: () => void;
  closeRef?: Ref<HTMLButtonElement>;
}) {
  const { courses, units, state } = useLibrary();
  const progress = studyProgress(state);
  const [collapsedCourseIds, setCollapsedCourseIds] = useState<Record<string, boolean>>({});
  const pointsLabel = `${formatPoints(progress.points)}, ${formatStreak(progress.currentStreak)}`;

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar">
      <div
        className={`flex gap-2 py-5 ${
          collapsed ? "flex-col items-center px-2" : "items-center justify-between px-3"
        }`}
      >
        <NavLink
          to="/"
          end
          aria-label="Miso, home"
          title={collapsed ? "Miso" : undefined}
          onClick={onNavigate}
          className="flex min-w-0 items-center rounded-2xl"
        >
          <span
            aria-hidden="true"
            className={
              collapsed
                ? "font-pixel text-lg leading-none text-ink"
                : "font-pixel truncate text-[2.1rem] leading-none text-ink"
            }
          >
            Miso
          </span>
        </NavLink>
        {showClose ? (
          <button
            ref={closeRef}
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-ink-soft hover:bg-peach hover:text-ink"
          >
            <CloseIcon />
          </button>
        ) : null}
        {showCollapse ? (
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={onToggleCollapse}
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-ink-soft hover:bg-peach hover:text-ink"
          >
            <ChevronIcon className={collapsed ? "rotate-180" : ""} />
          </button>
        ) : null}
      </div>

      <nav aria-label="Primary" className="flex min-h-0 flex-1 flex-col px-2 pb-4">
        <div className="space-y-1">
          <NavItem to="/" label="Home" icon={<HomeIcon />} collapsed={collapsed} onNavigate={onNavigate} />
          <NavItem to="/study" label="Study" icon={<BookIcon />} collapsed={collapsed} onNavigate={onNavigate} />
          <button
            type="button"
            onClick={onNewCourse}
            title={collapsed ? "New course" : undefined}
            className={itemClass(false, collapsed)}
          >
            <IconCell>
              <PlusIcon />
            </IconCell>
            <span className={collapsed ? "sr-only" : "truncate"}>New course</span>
          </button>
        </div>

        {collapsed ? null : (
          <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
            <p className="px-3 pb-2 font-pixel text-sm tracking-[0.12em] text-ink-soft uppercase">Courses</p>
            {courses.length === 0 ? (
              <p className="px-3 py-1 text-sm font-semibold text-muted">No courses yet.</p>
            ) : (
              <ul className="space-y-1">
                {courses.map((course) => {
                  const expanded = !collapsedCourseIds[course.id];
                  const courseUnits = units.filter((unit) => unit.courseId === course.id);
                  return (
                    <li key={course.id}>
                      <div className="flex items-center">
                        <button
                          type="button"
                          aria-expanded={expanded}
                          aria-label={`${expanded ? "Collapse" : "Expand"} ${course.name}`}
                          onClick={() =>
                            setCollapsedCourseIds((current) => ({
                              ...current,
                              [course.id]: !current[course.id],
                            }))
                          }
                          className="flex h-10 w-8 shrink-0 items-center justify-center rounded-xl text-ink-soft hover:bg-peach hover:text-ink"
                        >
                          <ChevronIcon
                            className={`transition-transform duration-200 motion-reduce:transition-none ${
                              expanded ? "-rotate-90" : "rotate-180"
                            }`}
                          />
                        </button>
                        <NavLink
                          to={`/courses/${course.id}`}
                          onClick={onNavigate}
                          className={({ isActive }) =>
                            `flex min-h-10 min-w-0 flex-1 items-center truncate rounded-2xl px-2 text-[0.95rem] font-extrabold text-ink ${
                              isActive ? "bg-nav-active" : "hover:bg-peach/60"
                            }`
                          }
                        >
                          {course.name}
                        </NavLink>
                      </div>
                      {expanded ? (
                        <ul className="mt-0.5 space-y-0.5">
                          {courseUnits.length === 0 ? (
                            <li className="py-1 pl-11 text-xs font-semibold text-muted">No units</li>
                          ) : (
                            courseUnits.map((unit) => (
                              <li key={unit.id}>
                                <NavLink
                                  to={`/courses/${course.id}/units/${unit.id}`}
                                  end
                                  onClick={onNavigate}
                                  className={({ isActive }) =>
                                    `block min-h-9 truncate rounded-xl py-2 pr-3 pl-11 text-sm font-bold ${
                                      isActive
                                        ? "bg-nav-active text-ink"
                                        : "text-ink-soft hover:bg-peach/60 hover:text-ink"
                                    }`
                                  }
                                >
                                  {unit.name}
                                </NavLink>
                              </li>
                            ))
                          )}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        <div className={`space-y-1 ${collapsed ? "mt-auto" : "mt-4"}`}>
          <NavItem
            to="/miso"
            label="Miso"
            icon={<MisoMark sprite="small" className="h-8 w-auto" />}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
          <NavItem to="/shop" label="Shop" icon={<ShopIcon />} collapsed={collapsed} onNavigate={onNavigate} />
          <NavItem to="/stats" label="Stats" icon={<StatsIcon />} collapsed={collapsed} onNavigate={onNavigate} />
          <NavItem
            to="/settings"
            label="Settings"
            icon={<SettingsIcon />}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
          {collapsed ? (
            <p
              className="mt-3 text-center font-pixel text-sm text-ink"
              aria-label={pointsLabel}
              title={pointsLabel}
            >
              {progress.points}
            </p>
          ) : (
            <p className="mt-5 px-3 pb-1 text-center text-xs font-extrabold text-muted">
              {formatPoints(progress.points)} · {formatStreak(progress.currentStreak)}
            </p>
          )}
        </div>
      </nav>
    </div>
  );
}
