"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type SubmitButtonProps = {
  className?: string;
  idleLabel: string;
  pendingLabel?: string;
};

export function SubmitButton({ className, idleLabel, pendingLabel }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className={className} disabled={pending}>
      {pending ? pendingLabel ?? "Ukladám..." : idleLabel}
    </Button>
  );
}
