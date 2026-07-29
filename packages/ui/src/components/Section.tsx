import type { HTMLAttributes, ReactNode } from "react";

export interface SectionProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}

/** Sharp, consistent page-section rhythm: eyebrow + title + description, then content grid. */
export function Section({ eyebrow, title, description, children, className, ...rest }: SectionProps) {
  return (
    <section className={`exotic-section${className ? ` ${className}` : ""}`} {...rest}>
      {(eyebrow || title || description) && (
        <div className="exotic-section__header">
          {eyebrow ? <span className="exotic-eyebrow">{eyebrow}</span> : null}
          {title ? <h2 className="exotic-section__title">{title}</h2> : null}
          {description ? <p className="exotic-section__description">{description}</p> : null}
        </div>
      )}
      {children}
    </section>
  );
}

export function SectionGrid({ children, className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`exotic-section__grid${className ? ` ${className}` : ""}`} {...rest}>
      {children}
    </div>
  );
}
