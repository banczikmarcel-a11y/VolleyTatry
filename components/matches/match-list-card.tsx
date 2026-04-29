import type { ReactNode } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatMatchDay, formatMatchStatus, formatPlayersCountLabel, getMatchResultState, hasMeaningfulLocation } from "@/lib/match-display";
import type { MatchSummary } from "@/lib/matches";

type MatchListCardProps = {
  children?: ReactNode;
  match: MatchSummary;
};

const statusTone = {
  cancelled: "coral",
  completed: "neutral",
  scheduled: "mint"
} as const;

export function MatchListCard({ children, match }: MatchListCardProps) {
  const resultTone = getMatchResultState(match.homeSets, match.awaySets);
  const hasResult = match.homeSets !== null && match.awaySets !== null;

  return (
    <Card as="article" className="flex flex-col gap-4 sm:gap-5">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-lg font-black text-court-ink sm:text-xl">{formatMatchDay(match.startsAt)}</p>
            <h2 className="mt-2 text-center text-xl font-black text-court-ink">{match.title}</h2>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-3">
            <span className="rounded-[8px] bg-court-mint/20 px-2 py-1 text-right text-xs font-black uppercase text-court-forest">
              {match.availablePlayersCount} {formatPlayersCountLabel(match.availablePlayersCount)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Badge tone={statusTone[match.status]}>{formatMatchStatus(match.status)}</Badge>
          <Link
            href={`/matches/${match.id}`}
            className={buttonClasses({ className: "bg-court-cyan px-3 py-2 text-court-navy hover:bg-white", variant: "ghost" })}
          >
            Detail zápasu
          </Link>
        </div>
      </div>

      <div className="grid gap-3 text-sm text-court-blue">
        {hasMeaningfulLocation(match.location) ? (
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-court-mint" />
            {match.location}
          </p>
        ) : null}
      </div>

      {hasResult ? (
        <div className="rounded-[8px] bg-court-ice p-3">
          <div className="rounded-[8px] border border-court-line bg-white px-3 py-4 text-center">
            <p className="text-[11px] font-black uppercase tracking-wide text-court-blue">Výsledok</p>
            <p className="mt-2 text-3xl font-black text-court-ink">
              {match.homeSets}:{match.awaySets}
            </p>
            <p className={`mt-2 text-sm font-black ${match.homeSets === match.awaySets ? "text-court-blue" : "text-court-ink"}`}>
              {resultTone.label}
            </p>
          </div>
        </div>
      ) : null}

      {children}
    </Card>
  );
}
