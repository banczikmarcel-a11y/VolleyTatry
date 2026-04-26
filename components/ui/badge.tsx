import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "mint" | "coral" | "neutral";
};

const toneClasses = {
  mint: "bg-court-mint/15 text-court-ink ring-court-mint/35",
  coral: "bg-court-coral/15 text-court-ink ring-court-coral/35",
  neutral: "bg-white text-court-ink ring-court-line"
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[8px] px-3 py-1 text-xs font-black uppercase ring-1",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
