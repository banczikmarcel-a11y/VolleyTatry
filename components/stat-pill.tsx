import { cn } from "@/lib/utils";

type StatPillProps = {
  label: string;
  value: string;
  variant?: "dark" | "light";
};

export function StatPill({ label, value, variant = "dark" }: StatPillProps) {
  return (
    <div
      className={cn(
        "rounded-[8px] px-4 py-3",
        variant === "dark"
          ? "bg-court-ink/85 text-white ring-1 ring-white/10"
          : "bg-court-ice text-court-ink ring-1 ring-court-line"
      )}
    >
      <p className={cn("text-xs font-bold uppercase", variant === "dark" ? "text-court-line" : "text-court-blue")}>
        {label}
      </p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}
