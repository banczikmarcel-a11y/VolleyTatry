import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  formatTournamentDateTime,
  getTournamentMatchPhaseLabel,
  getTournamentMatchResultSummary,
  getTournamentMatchStatusLabel,
  getTournamentParticipantName
} from "@/lib/tournament-public";
import type { TournamentBundle, TournamentMatchRecord } from "@/src/server/tournaments";

type TournamentPublicMatchCardProps = {
  bundle: TournamentBundle;
  match: TournamentMatchRecord;
  showDetails?: boolean;
};

function getStatusTone(status: TournamentMatchRecord["status"]) {
  switch (status) {
    case "completed":
      return "neutral";
    case "cancelled":
      return "coral";
    default:
      return "mint";
  }
}

export function TournamentPublicMatchCard({
  bundle,
  match,
  showDetails = true
}: TournamentPublicMatchCardProps) {
  const homeName = getTournamentParticipantName(match, "home", bundle);
  const awayName = getTournamentParticipantName(match, "away", bundle);
  const result = getTournamentMatchResultSummary(match);
  const refereeName = match.referee_tournament_team_id
    ? bundle.teams.find((team) => team.id === match.referee_tournament_team_id)?.display_name
      ?? bundle.teams.find((team) => team.id === match.referee_tournament_team_id)?.teamName
      ?? match.referee_tournament_team_id
    : null;

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase text-court-mint">{getTournamentMatchPhaseLabel(match, bundle)}</p>
          <h3 className="mt-1 break-words text-lg font-black leading-tight text-court-ink">{match.label ?? "Zápas"}</h3>
        </div>
        <Badge tone={getStatusTone(match.status)}>{getTournamentMatchStatusLabel(match.status)}</Badge>
      </div>

      <div className="rounded-[8px] bg-court-ice px-4 py-3">
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 flex-1 break-words font-bold text-court-ink">{homeName}</span>
            <span className="shrink-0 font-black text-court-ink">{result ? result.homeDisplayScore : "-"}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 flex-1 break-words font-bold text-court-ink">{awayName}</span>
            <span className="shrink-0 font-black text-court-ink">{result ? result.awayDisplayScore : "-"}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-1 text-sm text-court-blue">
        <p>{formatTournamentDateTime(match.scheduled_at)}</p>
        <p>{match.location ?? "Ihrisko bude doplnené"}</p>
        {refereeName ? <p>Rozhodca: <span className="font-bold text-court-ink">{refereeName}</span></p> : null}
      </div>

      {showDetails && result ? (
        <div className="grid gap-1 rounded-[8px] border border-court-line px-4 py-3 text-sm text-court-blue">
          <p>
            {result.isGroupStage ? "Body do tabuľky" : "Spolu sety"}:{" "}
            <span className="font-bold text-court-ink">
              {result.isGroupStage ? `${result.homeTablePoints}:${result.awayTablePoints}` : result.totalSets}
            </span>
          </p>
          <p>Body: <span className="font-bold text-court-ink">{result.totalHomeRallyPoints}:{result.totalAwayRallyPoints}</span></p>
          <p className="text-xs text-court-blue">
            {result.isGroupStage ? "Zápis lôpt" : "Sety"}: {match.sets.map((set) => `${set.home_points}:${set.away_points}`).join(" · ")}
          </p>
        </div>
      ) : null}
    </Card>
  );
}
