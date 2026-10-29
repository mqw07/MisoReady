import { useEffect, useRef } from "react";
import { Sidebar } from "./Sidebar.tsx";

const FOCUSABLE =
  "a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])";

export function MobileDrawer({
  onClose,
  onNewCourse,
}: {
  onClose: () => void;
  onNewCourse: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Dismiss menu"
        onClick={onClose}
        className="absolute inset-0 bg-[rgb(66_38_31/0.28)]"
      />
      <div
        ref={panelRef}
        id="mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="relative flex h-full w-[min(85vw,240px)] max-w-full flex-col border-r-[3px] border-line bg-sidebar"
      >
        <Sidebar
          onNavigate={onClose}
          onNewCourse={() => {
            onClose();
            onNewCourse();
          }}
          showClose
          onClose={onClose}
          closeRef={closeRef}
        />
      </div>
    </div>
  );
}
