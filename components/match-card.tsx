import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Match } from "@/types/domain";

type MatchCardProps = {
  match: Match;
};

export function MatchCard({ match }: MatchCardProps) {
  return (
    <Card as="article">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Badge tone="mint">{match.type}</Badge>
          <h2 className="mt-3 text-xl font-black text-court-ink">{match.opponent}</h2>
        </div>
        <span className="rounded-[8px] bg-court-ice px-3 py-2 text-xs font-black text-court-blue">
          {match.date}
        </span>
      </div>
      <div className="mt-5 flex items-center gap-2 text-sm text-court-blue">
        <MapPin className="h-4 w-4 text-court-mint" />
        <span>{match.venue}</span>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-[8px] bg-court-line">
        <div className="h-full rounded-[8px] bg-court-mint" style={{ width: match.readiness }} />
      </div>
      <p className="mt-2 text-xs font-bold text-court-blue">Readiness {match.readiness}</p>
    </Card>
  );
}
