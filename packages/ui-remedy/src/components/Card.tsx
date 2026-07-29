import type { HTMLAttributes, ReactNode } from "react";
import type { PropsWithoutTitle } from "../prop-types.js";

export interface CardProps extends PropsWithoutTitle<HTMLAttributes<HTMLDivElement>> {
  eyebrow?: ReactNode;
  title?: ReactNode;
  children?: ReactNode;
  interactive?: boolean;
  pattern?: "dots" | "pinstripe" | "none";
}

export function Card({
  eyebrow,
  title,
  children,
  className,
  interactive,
  pattern = "none",
  ...rest
}: CardProps) {
  const interactiveClass = interactive ? " remedy-card--interactive" : "";
  const patternClass = pattern !== "none" ? ` remedy-pattern-${pattern}` : "";
  return (
    <div
      className={`remedy-card remedy-bounce-in${interactiveClass}${patternClass}${className ? ` ${className}` : ""}`}
      {...rest}
    >
      {eyebrow ? <span className="remedy-eyebrow">{eyebrow}</span> : null}
      {title ? <h2>{title}</h2> : null}
      {children}
    </div>
  );
}
