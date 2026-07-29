import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "default" | "gold" | "outline";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

export function Button({ variant = "default", className, children, ...rest }: ButtonProps) {
  const variantClass = variant === "default" ? "" : ` remedy-button--${variant}`;
  return (
    <button className={`remedy-button${variantClass}${className ? ` ${className}` : ""}`} {...rest}>
      {children}
    </button>
  );
}
