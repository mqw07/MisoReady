import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

function buttonClasses(variant: Variant, size: Size, className: string): string {
  const variants: Record<Variant, string> = {
    primary: "pixel-box pixel-box-sm relative pb-primary text-white",
    secondary: "pixel-box pixel-box-sm relative pb-surface text-ink",
    ghost: "rounded-2xl text-ink hover:bg-surface-sunken",
    danger: "pixel-box pixel-box-sm relative pb-danger text-white",
  };
  const sizes: Record<Size, string> = {
    sm: "h-9 px-4 text-sm",
    md: "h-12 px-6 text-sm",
  };

  return [
    "inline-flex items-center justify-center gap-2 font-bold no-underline",
    "transition-transform duration-150 ease-out",
    "hover:-translate-y-px active:translate-y-px",
    "motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:translate-y-0",
    "disabled:pointer-events-none disabled:opacity-60",
    variants[variant],
    sizes[size],
    className,
  ].join(" ");
}

type ButtonProps = {
  variant?: Variant;
  size?: Size;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}

export function ButtonLink({
  to,
  variant = "primary",
  size = "md",
  className = "",
  children,
}: {
  to: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link to={to} className={buttonClasses(variant, size, className)}>
      {children}
    </Link>
  );
}
