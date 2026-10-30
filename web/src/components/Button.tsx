import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "accent";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active",
  secondary: "bg-surface text-primary border border-border-input hover:border-primary hover:bg-brand-50 active:bg-brand-100",
  ghost: "bg-transparent text-primary hover:bg-brand-50 active:bg-brand-100",
  accent: "bg-accent-600 text-neutral-0 hover:bg-accent-700 active:bg-accent-800",
};
const SIZE: Record<Size, string> = {
  sm: "h-9 px-3 text-sm min-w-9",          // 36px: only inside dense rails, never as the sole target on touch
  md: "h-11 px-4 text-base min-w-11",      // 44px: default tap target
  lg: "h-12 px-6 text-lg min-w-12",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, disabled, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap select-none",
        "transition-[background-color,border-color,transform] duration-(--duration-fast) ease-standard active:translate-y-px",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0",
        VARIANT[variant], SIZE[size], className,
      )}
      {...rest}
    >
      {loading && <Spinner size={size === "lg" ? 20 : 16} />}
      {children}
    </button>
  );
});
