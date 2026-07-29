import type { HTMLAttributes, ReactNode } from "react";

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  gold?: boolean;
}

export function Chip({ children, className, gold, ...rest }: ChipProps) {
  const goldClass = gold ? " remedy-chip--gold" : "";
  return (
    <span className={`remedy-chip${goldClass}${className ? ` ${className}` : ""}`} {...rest}>
      {children}
    </span>
  );
}
