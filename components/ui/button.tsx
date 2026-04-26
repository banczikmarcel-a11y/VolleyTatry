import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-court-ink text-white hover:bg-court-forest",
  secondary: "border border-court-line bg-white text-court-ink hover:border-court-mint hover:bg-court-ice",
  ghost: "text-court-ink hover:bg-court-ice"
};

export function buttonClasses({
  className,
  variant = "primary"
}: {
  className?: string;
  variant?: ButtonVariant;
} = {}) {
  return cn(
    "focus-ring inline-flex items-center justify-center rounded-[8px] px-4 py-2 text-sm font-black transition",
    variantClasses[variant],
    className
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return <button className={buttonClasses({ className, variant })} {...props} />;
}

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: ButtonVariant;
};

export function ButtonLink({ className, variant = "primary", ...props }: ButtonLinkProps) {
  return <a className={buttonClasses({ className, variant })} {...props} />;
}
