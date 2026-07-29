import type { HTMLAttributes, ReactNode } from "react";

export interface BounceInProps extends HTMLAttributes<HTMLDivElement> {
  delayMs?: number;
  children: ReactNode;
}

/** Premium-fun entrance motion - see brand/exotic-remedy/aesthetic.md. */
export function BounceIn({ delayMs = 0, style, className, children, ...rest }: BounceInProps) {
  return (
    <div
      className={`remedy-bounce-in${className ? ` ${className}` : ""}`}
      style={{ animationDelay: delayMs ? `${delayMs}ms` : undefined, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
