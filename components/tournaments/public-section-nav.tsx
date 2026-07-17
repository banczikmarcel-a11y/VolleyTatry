import Link from "next/link";
import { cn } from "@/lib/utils";

type TournamentSectionNavProps = {
  items: {
    href: string;
    label: string;
  }[];
};

export function TournamentSectionNav({ items }: TournamentSectionNavProps) {
  return (
    <nav className="overflow-x-auto pb-1">
      <div className="flex gap-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "focus-ring inline-flex min-h-11 shrink-0 items-center rounded-[8px] border border-court-line bg-white px-4 py-3 text-sm font-black text-court-ink transition hover:border-court-mint hover:bg-court-ice"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
