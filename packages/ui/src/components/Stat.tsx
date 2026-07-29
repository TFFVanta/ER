import type { HTMLAttributes, ReactNode } from "react";

export interface StatProps extends HTMLAttributes<HTMLDivElement> {
  value: ReactNode;
  label: ReactNode;
}

export function Stat({ value, label, className, ...rest }: StatProps) {
  return (
    <div className={`exotic-stat${className ? ` ${className}` : ""}`} {...rest}>
      <div className="exotic-stat__value">{value}</div>
      <div className="exotic-stat__label">{label}</div>
    </div>
  );
}
