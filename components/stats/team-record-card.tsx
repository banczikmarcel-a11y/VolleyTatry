import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { TeamRecord } from "@/lib/stats";

type TeamRecordCardProps = {
  record: TeamRecord;
};

function getWinRate(record: TeamRecord) {
  if (record.matches === 0) {
    return "0%";
  }

  return `${Math.round((record.wins / record.matches) * 100)}%`;
}

export function TeamRecordCard({ record }: TeamRecordCardProps) {
  const heroClassName = record.slug === "tatry" ? "bg-court-mint/20 text-court-ink" : "bg-court-coral/20 text-court-ink";

  return (
    <Card as="article" className="overflow-hidden p-0">
      <div className={`${heroClassName} p-3`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge tone={record.slug === "tatry" ? "mint" : "coral"}>{record.slug}</Badge>
            <h2 className="mt-2 text-xl font-black">{record.name}</h2>
          </div>
          <Trophy className="h-5 w-5 text-court-forest" />
        </div>
        <p className="mt-2 text-xs font-bold text-court-blue">Úspešnosť {getWinRate(record)}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
        <div className="rounded-[8px] bg-court-ice p-3">
          <p className="text-xs font-black uppercase text-court-blue">Výhry</p>
          <p className="mt-1 text-lg font-black text-court-ink">{record.wins}</p>
        </div>
        <div className="rounded-[8px] bg-court-ice p-3">
          <p className="text-xs font-black uppercase text-court-blue">Prehry</p>
          <p className="mt-1 text-lg font-black text-court-ink">{record.losses}</p>
        </div>
        <div className="rounded-[8px] bg-court-ice p-3">
          <p className="text-xs font-black uppercase text-court-blue">Zápasy</p>
          <p className="mt-1 text-lg font-black text-court-ink">{record.matches}</p>
        </div>
        <div className="rounded-[8px] bg-court-ice p-3">
          <p className="text-xs font-black uppercase text-court-blue">Sety</p>
          <p className="mt-1 text-lg font-black text-court-ink">
            {record.setsFor}:{record.setsAgainst}
          </p>
        </div>
      </div>
    </Card>
  );
}
