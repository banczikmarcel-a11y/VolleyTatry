"use client";

import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type SubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  className?: string;
  disabled?: boolean;
  idleLabel: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "ghost";
};

export function SubmitButton({ className, disabled = false, idleLabel, pendingLabel, variant = "primary", ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant={variant} className={className} disabled={disabled || pending} {...props}>
      {pending ? pendingLabel ?? "Ukladám..." : idleLabel}
    </Button>
  );
}
