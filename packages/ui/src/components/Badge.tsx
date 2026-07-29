import type { HTMLAttributes, ReactNode } from "react";

export type BadgeTone = "neutral" | "positive" | "warning" | "critical";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  children: ReactNode;
}

/** A quiet status pill - e.g. venture/step state (running, paused, blocked). */
export function Badge({ tone = "neutral", className, children, ...rest }: BadgeProps) {
  const toneClass = tone === "neutral" ? "" : ` exotic-badge--${tone}`;
  return (
    <span className={`exotic-badge${toneClass}${className ? ` ${className}` : ""}`} {...rest}>
      {children}
    </span>
  );
}
