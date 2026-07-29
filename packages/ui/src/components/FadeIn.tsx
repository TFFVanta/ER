import type { HTMLAttributes, ReactNode } from "react";

export interface FadeInProps extends HTMLAttributes<HTMLDivElement> {
  delayMs?: number;
  children: ReactNode;
}

/** Quiet entrance motion - see brand/identity.md's "quiet motion, not playful flourish". */
export function FadeIn({ delayMs = 0, style, className, children, ...rest }: FadeInProps) {
  return (
    <div
      className={`exotic-fade-in${className ? ` ${className}` : ""}`}
      style={{ animationDelay: delayMs ? `${delayMs}ms` : undefined, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
