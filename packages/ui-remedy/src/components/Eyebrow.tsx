import type { HTMLAttributes, ReactNode } from "react";

export interface EyebrowProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
}

export function Eyebrow({ children, className, ...rest }: EyebrowProps) {
  return (
    <span className={`remedy-eyebrow${className ? ` ${className}` : ""}`} {...rest}>
      {children}
    </span>
  );
}
