import { useEffect } from "react";

export function usePageTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title === "Today" || title === "Miso" ? "Miso" : `${title} · Miso`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
