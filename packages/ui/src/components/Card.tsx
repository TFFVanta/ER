import type { HTMLAttributes, ReactNode } from "react";
import type { PropsWithoutTitle } from "../prop-types.js";

export interface CardProps extends PropsWithoutTitle<HTMLAttributes<HTMLDivElement>> {
  eyebrow?: ReactNode;
  title?: ReactNode;
  children?: ReactNode;
  interactive?: boolean;
}

export function Card({ eyebrow, title, children, className, interactive, ...rest }: CardProps) {
  const interactiveClass = interactive ? " exotic-card--interactive" : "";
  return (
    <div className={`exotic-card${interactiveClass}${className ? ` ${className}` : ""}`} {...rest}>
      {eyebrow ? <span className="exotic-eyebrow">{eyebrow}</span> : null}
      {title ? <h2>{title}</h2> : null}
      {children}
    </div>
  );
}
