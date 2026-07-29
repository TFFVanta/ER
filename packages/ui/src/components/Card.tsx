import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  eyebrow?: ReactNode;
  title?: ReactNode;
  children?: ReactNode;
}

export function Card({ eyebrow, title, children, className, ...rest }: CardProps) {
  return (
    <div className={`exotic-card${className ? ` ${className}` : ""}`} {...rest}>
      {eyebrow ? <span className="exotic-eyebrow">{eyebrow}</span> : null}
      {title ? <h2>{title}</h2> : null}
      {children}
    </div>
  );
}
