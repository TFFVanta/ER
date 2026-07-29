import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "default" | "primary" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

export function Button({ variant = "default", className, children, ...rest }: ButtonProps) {
  const variantClass = variant === "default" ? "" : ` exotic-button--${variant}`;
  return (
    <button className={`exotic-button${variantClass}${className ? ` ${className}` : ""}`} {...rest}>
      {children}
    </button>
  );
}
