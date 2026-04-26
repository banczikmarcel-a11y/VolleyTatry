import type { MatchSignupPlayer } from "@/lib/matches";

function pad(value: string, width: number) {
  const trimmed = value.trim();
  if (trimmed.length >= width) {
    return trimmed;
  }

  return `${trimmed}${" ".repeat(width - trimmed.length)}`;
}

function sortPlayers(players: MatchSignupPlayer[]) {
  return [...players].sort((left, right) => left.sortLabel.localeCompare(right.sortLabel, "sk", { sensitivity: "base" }));
}

export function buildMatchEmailSubject(matchTitle: string, matchDate: string) {
  return `${matchTitle} | ${matchDate}`;
}

export function buildMatchEmailBody({
  awaySets,
  awayTeamName,
  awayPlayers,
  homeSets,
  homeTeamName,
  homePlayers
}: {
  awayPlayers: MatchSignupPlayer[];
  awaySets: number | null;
  awayTeamName: string;
  homePlayers: MatchSignupPlayer[];
  homeSets: number | null;
  homeTeamName: string;
}) {
  const sortedHomePlayers = sortPlayers(homePlayers);
  const sortedAwayPlayers = sortPlayers(awayPlayers);
  const maxRows = Math.max(sortedHomePlayers.length, sortedAwayPlayers.length, 1);
  const leftWidth = Math.max(homeTeamName.length, ...sortedHomePlayers.map((player) => player.label.length), 18);
  const rightWidth = Math.max(awayTeamName.length, ...sortedAwayPlayers.map((player) => player.label.length), 18);
  const homeScore = homeSets ?? "-";
  const awayScore = awaySets ?? "-";

  const rows = Array.from({ length: maxRows }, (_, index) => {
    const homeLabel = sortedHomePlayers[index]?.label ?? "";
    const awayLabel = sortedAwayPlayers[index]?.label ?? "";
    return `${pad(homeLabel, leftWidth)} | ${pad(awayLabel, rightWidth)}`;
  });

  return [
    `${homeTeamName} - ${awayTeamName}`,
    `Výsledok: ${homeScore}:${awayScore}`,
    "",
    `${"-".repeat(leftWidth)}-+-${"-".repeat(rightWidth)}`,
    `${pad(homeTeamName, leftWidth)} | ${pad(awayTeamName, rightWidth)}`,
    `${"-".repeat(leftWidth)}-+-${"-".repeat(rightWidth)}`,
    ...rows
  ].join("\n");
}

export function buildMatchMailtoHref({
  body,
  recipients,
  subject
}: {
  body: string;
  recipients: string[];
  subject: string;
}) {
  const params = new URLSearchParams({
    body,
    subject
  });

  return `mailto:${recipients.join(",")}?${params.toString()}`;
}
