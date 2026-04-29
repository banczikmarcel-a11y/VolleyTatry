type TeamLike = {
  name: string;
} | null;

type MatchLike = {
  awaySets: number | null;
  homeSets: number | null;
  opponent: TeamLike;
  team: TeamLike;
};

export type MatchStatusLike = "cancelled" | "completed" | "scheduled";

export type MatchResultState = {
  awayClassName: string;
  homeClassName: string;
  label: string | null;
};

export function formatMatchDate(value: string) {
  return new Intl.DateTimeFormat("sk-SK", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatMatchDay(value: string) {
  return new Intl.DateTimeFormat("sk-SK", {
    dateStyle: "medium"
  }).format(new Date(value));
}

export function getMatchResultState(homeSets: number | null, awaySets: number | null, homeTeamName?: string | null, awayTeamName?: string | null): MatchResultState {
  if (homeSets === null || awaySets === null) {
    return {
      awayClassName: "text-court-ink",
      homeClassName: "text-court-ink",
      label: null
    };
  }

  if (homeSets > awaySets) {
    return {
      awayClassName: "text-red-600",
      homeClassName: "text-green-600",
      label: `Výhra ${homeTeamName ?? "domácich"}`
    };
  }

  if (awaySets > homeSets) {
    return {
      awayClassName: "text-green-600",
      homeClassName: "text-red-600",
      label: `Výhra ${awayTeamName ?? "hostí"}`
    };
  }

  return {
    awayClassName: "text-court-ink",
    homeClassName: "text-court-ink",
    label: "Remíza"
  };
}

export function getWinningTeamName(match: MatchLike) {
  if (match.homeSets === null || match.awaySets === null) {
    return "—";
  }

  if (match.homeSets > match.awaySets) {
    return match.team?.name ?? "Domáci";
  }

  if (match.awaySets > match.homeSets) {
    return match.opponent?.name ?? "Hostia";
  }

  return "Remíza";
}

export function getSetsRatio(match: Pick<MatchLike, "awaySets" | "homeSets">) {
  if (match.homeSets === null || match.awaySets === null) {
    return "—";
  }

  return `${match.homeSets}:${match.awaySets}`;
}

export function formatPlayersCountLabel(count: number) {
  if (count === 1) {
    return "hráč";
  }

  if (count >= 2 && count <= 4) {
    return "hráči";
  }

  return "hráčov";
}

export function hasMeaningfulLocation(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized !== "miesto bude doplnene" && normalized !== "miesto bude doplnené";
}

export function formatMatchStatus(status: MatchStatusLike) {
  if (status === "scheduled") {
    return "Plánovaný";
  }

  if (status === "completed") {
    return "Ukončený";
  }

  return "Zrušený";
}
