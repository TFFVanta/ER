import type { HTMLAttributes, ReactNode } from "react";
import type { PropsWithoutTitle } from "../prop-types.js";

export interface SectionProps extends PropsWithoutTitle<HTMLAttributes<HTMLElement>> {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}

/** Section rhythm for Exotic Remedy pages: eyebrow + title + description, then content grid. */
export function Section({ eyebrow, title, description, children, className, ...rest }: SectionProps) {
  return (
    <section className={`remedy-section${className ? ` ${className}` : ""}`} {...rest}>
      {(eyebrow || title || description) && (
        <div className="remedy-section__header">
          {eyebrow ? <span className="remedy-eyebrow">{eyebrow}</span> : null}
          {title ? <h2 className="remedy-section__title">{title}</h2> : null}
          {description ? <p className="remedy-section__description">{description}</p> : null}
        </div>
      )}
      {children}
    </section>
  );
}

export function SectionGrid({ children, className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`remedy-section__grid${className ? ` ${className}` : ""}`} {...rest}>
      {children}
    </div>
  );
}
