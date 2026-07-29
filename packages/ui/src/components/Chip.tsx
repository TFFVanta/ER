import type { HTMLAttributes, ReactNode } from "react";

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
}

export function Chip({ children, className, ...rest }: ChipProps) {
  return (
    <span className={`exotic-chip${className ? ` ${className}` : ""}`} {...rest}>
      {children}
    </span>
  );
}
