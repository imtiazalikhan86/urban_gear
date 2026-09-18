import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /** Maps onto the template's button styles: btn-primary, btn-light, and the quiet outline. */
  variant?: "primary" | "secondary" | "quiet";
  size?: "lg" | "sm" | "md";
}

const variantClass = {
  primary: "btn-primary",
  secondary: "btn-dark",
  quiet: "btn-light shadow-sm",
} as const;

export function Button({
  children,
  variant = "primary",
  size = "lg",
  className = "",
  ...props
}: ButtonProps) {
  const sizeClass = size === "lg" ? "btn-lg" : size === "sm" ? "btn-sm" : "";
  return (
    <button className={`btn ${variantClass[variant]} rounded-4 ${sizeClass} ${className}`} {...props}>
      {children}
    </button>
  );
}
