import type { ReactNode } from "react";

export function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-bold text-ink ${className}`}
    >
      {children}
    </span>
  );
}
