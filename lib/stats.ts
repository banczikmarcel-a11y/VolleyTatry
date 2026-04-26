import { getSupabaseConfig } from "@/supabase/env";
import { createAdminClient } from "@/supabase/admin";
import { createClient } from "@/supabase/server";
import { formatFullName, formatSortName, splitFullName } from "@/lib/player-name";

export type TeamRecord = {
  draws: number;
  losses: number;
  matches: number;
  name: string;
  setsAgainst: number;
  setsFor: number;
  slug: string;
  wins: number;
};

export type StatsResult = {
  availableMonths: number[];
  availableQuarters: number[];
  error: string | null;
  filteredMatchesCount: number;
  isConfigured: boolean;
  records: TeamRecord[];
  selectedMonth: number | null;
  selectedQuarter: number | null;
  selectedYear: number;
  years: number[];
};

export type YearlyWinsRecord = {
  teams: {
    name: string;
    slug: string;
    wins: number;
  }[];
  year: number;
};

export type YearlyWinsResult = {
  error: string | null;
  isConfigured: boolean;
  years: YearlyWinsRecord[];
};

export type HeadToHeadSummary = {
  error: string | null;
  isConfigured: boolean;
  summary: {
    leftName: string;
    leftSetWins: number;
    leftWins: number;
    rightName: string;
    rightSetWins: number;
    rightWins: number;
  } | null;
};

export type AttendanceRow = {
  monthly: number[];
  playerId: string;
  playerName: string;
  sortLabel: string;
  total: number;
};

export type AttendanceStatsResult = {
  error: string | null;
  isConfigured: boolean;
  rows: AttendanceRow[];
  selectedYear: number;
  years: number[];
};

type TeamRow = {
  id: string;
  name: string;
  slug: string;
};

type CompletedMatchRow = {
  away_sets: number | null;
  away_team_id: string;
  home_sets: number | null;
  home_team_id: string;
  match_date?: string;
  season_year?: number;
};

type AttendanceMatchRow = {
  id: string;
  match_date: string;
  season_year: number;
};

type AttendanceResponseRow = {
  match_id: string;
  profile_id: string;
};

type AttendanceProfileRow = {
  first_name: string | null;
  full_name: string | null;
  id: string;
  last_name: string | null;
};

const trackedTeamSlugs = ["tatry", "ostatni"] as const;

function getCurrentYear() {
  return new Date().getFullYear();
}

function parseYear(year?: string) {
  const value = Number(year);
  return Number.isInteger(value) && value >= 2000 && value <= 2100 ? value : getCurrentYear();
}

function parseQuarter(value?: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 4 ? parsed : null;
}

function parseMonth(value?: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 12 ? parsed : null;
}

function getQuarter(month: number) {
  return Math.floor((month - 1) / 3) + 1;
}

function emptyRecord(team: TeamRow): TeamRecord {
  return {
    draws: 0,
    losses: 0,
    matches: 0,
    name: team.name,
    setsAgainst: 0,
    setsFor: 0,
    slug: team.slug,
    wins: 0
  };
}

function applyResult(record: TeamRecord, setsFor: number, setsAgainst: number) {
  record.matches += 1;
  record.setsFor += setsFor;
  record.setsAgainst += setsAgainst;

  if (setsFor > setsAgainst) {
    record.wins += 1;
  } else if (setsFor < setsAgainst) {
    record.losses += 1;
  } else {
    record.draws += 1;
  }
}

export async function getStats(year?: string, quarter?: string, month?: string): Promise<StatsResult> {
  const selectedYear = parseYear(year);
  const selectedQuarter = parseQuarter(quarter);
  const selectedMonth = parseMonth(month);

  if (!getSupabaseConfig().isConfigured) {
    return {
      availableMonths: [],
      availableQuarters: [],
      error: null,
      filteredMatchesCount: 0,
      isConfigured: false,
      records: [],
      selectedMonth,
      selectedQuarter,
      selectedYear,
      years: [selectedYear]
    };
  }

  const supabase = await createClient();
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id,name,slug")
    .in("slug", [...trackedTeamSlugs])
    .order("name");

  if (teamsError) {
    return {
      availableMonths: [],
      availableQuarters: [],
      error: teamsError.message,
      filteredMatchesCount: 0,
      isConfigured: true,
      records: [],
      selectedMonth,
      selectedQuarter,
      selectedYear,
      years: [selectedYear]
    };
  }

  const { data: yearRows, error: yearsError } = await supabase
    .from("matches")
    .select("season_year")
    .eq("status", "completed")
    .order("season_year", { ascending: false });

  if (yearsError) {
    return {
      availableMonths: [],
      availableQuarters: [],
      error: yearsError.message,
      filteredMatchesCount: 0,
      isConfigured: true,
      records: [],
      selectedMonth,
      selectedQuarter,
      selectedYear,
      years: [selectedYear]
    };
  }

  const years = Array.from(new Set((yearRows ?? []).map((row) => row.season_year))).filter(Number.isInteger);
  const availableYears = years.length > 0 ? years : [selectedYear];

  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("home_team_id,away_team_id,home_sets,away_sets,match_date")
    .eq("status", "completed")
    .eq("season_year", selectedYear)
    .not("home_sets", "is", null)
    .not("away_sets", "is", null);

  if (matchesError) {
    return {
      availableMonths: [],
      availableQuarters: [],
      error: matchesError.message,
      filteredMatchesCount: 0,
      isConfigured: true,
      records: [],
      selectedMonth,
      selectedQuarter,
      selectedYear,
      years: availableYears
    };
  }

  const allMatches = (matches ?? []) as CompletedMatchRow[];
  const availableMonths = Array.from(
    new Set(
      allMatches
        .map((match) => (match.match_date ? new Date(match.match_date).getMonth() + 1 : null))
        .filter((value): value is number => value !== null)
    )
  ).sort((left, right) => left - right);
  const availableQuarters = Array.from(new Set(availableMonths.map((monthValue) => getQuarter(monthValue)))).sort((left, right) => left - right);

  const normalizedQuarter =
    selectedMonth !== null ? getQuarter(selectedMonth) : selectedQuarter !== null && availableQuarters.includes(selectedQuarter) ? selectedQuarter : null;
  const normalizedMonth =
    selectedMonth !== null &&
    (normalizedQuarter === null || getQuarter(selectedMonth) === normalizedQuarter) &&
    availableMonths.includes(selectedMonth)
      ? selectedMonth
      : null;

  const filteredMatches = allMatches.filter((match) => {
    if (!match.match_date) {
      return false;
    }

    const date = new Date(match.match_date);
    const matchMonth = date.getMonth() + 1;
    const matchQuarter = getQuarter(matchMonth);

    if (normalizedQuarter !== null && matchQuarter !== normalizedQuarter) {
      return false;
    }

    if (normalizedMonth !== null && matchMonth !== normalizedMonth) {
      return false;
    }

    return true;
  });

  const recordsByTeamId = new Map((teams ?? []).map((team) => [team.id, emptyRecord(team)]));

  filteredMatches.forEach((match) => {
    if (match.home_sets === null || match.away_sets === null) {
      return;
    }

    const homeRecord = recordsByTeamId.get(match.home_team_id);
    const awayRecord = recordsByTeamId.get(match.away_team_id);

    if (homeRecord) {
      applyResult(homeRecord, match.home_sets, match.away_sets);
    }

    if (awayRecord) {
      applyResult(awayRecord, match.away_sets, match.home_sets);
    }
  });

  const records = [...recordsByTeamId.values()].sort((left, right) => {
    const order = trackedTeamSlugs.indexOf(left.slug as (typeof trackedTeamSlugs)[number])
      - trackedTeamSlugs.indexOf(right.slug as (typeof trackedTeamSlugs)[number]);
    return order || left.name.localeCompare(right.name);
  });

  return {
    availableMonths: normalizedQuarter !== null ? availableMonths.filter((monthValue) => getQuarter(monthValue) === normalizedQuarter) : availableMonths,
    availableQuarters,
    error: null,
    filteredMatchesCount: filteredMatches.length,
    isConfigured: true,
    records,
    selectedMonth: normalizedMonth,
    selectedQuarter: normalizedQuarter,
    selectedYear,
    years: availableYears
  };
}

export async function getYearlyWins(): Promise<YearlyWinsResult> {
  if (!getSupabaseConfig().isConfigured) {
    return {
      error: null,
      isConfigured: false,
      years: []
    };
  }

  const supabase = await createClient();
  const [{ data: teams, error: teamsError }, { data: matches, error: matchesError }] = await Promise.all([
    supabase.from("teams").select("id,name,slug").in("slug", [...trackedTeamSlugs]).order("name"),
    supabase
      .from("matches")
      .select("season_year,home_team_id,away_team_id,home_sets,away_sets")
      .eq("status", "completed")
      .not("home_sets", "is", null)
      .not("away_sets", "is", null)
      .order("season_year", { ascending: false })
  ]);

  if (teamsError) {
    return { error: teamsError.message, isConfigured: true, years: [] };
  }

  if (matchesError) {
    return { error: matchesError.message, isConfigured: true, years: [] };
  }

  const teamsList = (teams ?? []) as TeamRow[];
  const baseTeams = [...teamsList].sort((left, right) => {
    const order = trackedTeamSlugs.indexOf(left.slug as (typeof trackedTeamSlugs)[number])
      - trackedTeamSlugs.indexOf(right.slug as (typeof trackedTeamSlugs)[number]);
    return order || left.name.localeCompare(right.name);
  });
  const winsByYear = new Map<number, Map<string, number>>();

  ((matches ?? []) as Required<CompletedMatchRow>[]).forEach((match) => {
    if (match.home_sets === null || match.away_sets === null || !match.season_year) {
      return;
    }

    const record = winsByYear.get(match.season_year) ?? new Map<string, number>();

    if (match.home_sets > match.away_sets) {
      record.set(match.home_team_id, (record.get(match.home_team_id) ?? 0) + 1);
    } else if (match.away_sets > match.home_sets) {
      record.set(match.away_team_id, (record.get(match.away_team_id) ?? 0) + 1);
    }

    winsByYear.set(match.season_year, record);
  });

  return {
    error: null,
    isConfigured: true,
    years: [...winsByYear.entries()]
      .sort((left, right) => right[0] - left[0])
      .map(([year, wins]) => ({
        teams: baseTeams.map((team) => ({
          name: team.name,
          slug: team.slug,
          wins: wins.get(team.id) ?? 0
        })),
        year
      }))
  };
}

export async function getHeadToHeadSummary(): Promise<HeadToHeadSummary> {
  if (!getSupabaseConfig().isConfigured) {
    return {
      error: null,
      isConfigured: false,
      summary: null
    };
  }

  const supabase = await createClient();
  const [{ data: teams, error: teamsError }, { data: matches, error: matchesError }] = await Promise.all([
    supabase.from("teams").select("id,name,slug").in("slug", [...trackedTeamSlugs]),
    supabase
      .from("matches")
      .select("home_team_id,away_team_id,home_sets,away_sets")
      .eq("status", "completed")
      .not("home_sets", "is", null)
      .not("away_sets", "is", null)
  ]);

  if (teamsError) {
    return { error: teamsError.message, isConfigured: true, summary: null };
  }

  if (matchesError) {
    return { error: matchesError.message, isConfigured: true, summary: null };
  }

  const leftTeam = (teams ?? []).find((team) => team.slug === "tatry");
  const rightTeam = (teams ?? []).find((team) => team.slug === "ostatni");

  if (!leftTeam || !rightTeam) {
    return { error: "Timy Tatry a Ostatni neboli najdene.", isConfigured: true, summary: null };
  }

  let leftWins = 0;
  let rightWins = 0;
  let leftSetWins = 0;
  let rightSetWins = 0;

  ((matches ?? []) as CompletedMatchRow[]).forEach((match) => {
    if (match.home_sets === null || match.away_sets === null) {
      return;
    }

    if (match.home_team_id === leftTeam.id) {
      leftSetWins += match.home_sets;
      rightSetWins += match.away_sets;

      if (match.home_sets > match.away_sets) {
        leftWins += 1;
      } else if (match.away_sets > match.home_sets) {
        rightWins += 1;
      }
    } else if (match.home_team_id === rightTeam.id) {
      rightSetWins += match.home_sets;
      leftSetWins += match.away_sets;

      if (match.home_sets > match.away_sets) {
        rightWins += 1;
      } else if (match.away_sets > match.home_sets) {
        leftWins += 1;
      }
    }
  });

  return {
    error: null,
    isConfigured: true,
    summary: {
      leftName: leftTeam.name,
      leftSetWins,
      leftWins,
      rightName: rightTeam.name,
      rightSetWins,
      rightWins
    }
  };
}

export async function getAttendanceStats(year?: string): Promise<AttendanceStatsResult> {
  const selectedYear = parseYear(year);

  if (!getSupabaseConfig().isConfigured) {
    return {
      error: null,
      isConfigured: false,
      rows: [],
      selectedYear,
      years: [selectedYear]
    };
  }

  const supabase = getSupabaseConfig().serviceRoleKey ? createAdminClient() : await createClient();
  const [{ data: yearRows, error: yearsError }, { data: profiles, error: profilesError }, { data: matches, error: matchesError }] = await Promise.all([
    supabase.from("matches").select("season_year").eq("status", "completed").order("season_year", { ascending: false }),
    supabase.from("profiles").select("id,full_name,first_name,last_name").order("last_name", { ascending: true }).order("first_name", { ascending: true }),
    supabase
      .from("matches")
      .select("id,season_year,match_date")
      .eq("status", "completed")
      .eq("season_year", selectedYear)
      .order("match_date", { ascending: true })
  ]);

  if (yearsError) {
    return { error: yearsError.message, isConfigured: true, rows: [], selectedYear, years: [selectedYear] };
  }

  if (profilesError) {
    return { error: profilesError.message, isConfigured: true, rows: [], selectedYear, years: [selectedYear] };
  }

  if (matchesError) {
    return { error: matchesError.message, isConfigured: true, rows: [], selectedYear, years: [selectedYear] };
  }

  const years = Array.from(new Set((yearRows ?? []).map((row) => row.season_year))).filter(Number.isInteger);
  const availableYears = years.length > 0 ? years : [selectedYear];
  const matchRows = (matches ?? []) as AttendanceMatchRow[];
  const matchIds = matchRows.map((match) => match.id);

  let responses: AttendanceResponseRow[] = [];

  if (matchIds.length > 0) {
    const { data: responseRows, error: responsesError } = await supabase
      .from("match_responses")
      .select("match_id,profile_id")
      .in("match_id", matchIds)
      .eq("status", "available");

    if (responsesError) {
      return { error: responsesError.message, isConfigured: true, rows: [], selectedYear, years: availableYears };
    }

    responses = (responseRows ?? []) as AttendanceResponseRow[];
  }

  const monthByMatchId = new Map(matchRows.map((match) => [match.id, new Date(match.match_date).getMonth()]));
  const countsByProfileId = new Map<string, number[]>();

  responses.forEach((response) => {
    const monthIndex = monthByMatchId.get(response.match_id);

    if (monthIndex === undefined) {
      return;
    }

    const counts = countsByProfileId.get(response.profile_id) ?? Array.from({ length: 12 }, () => 0);
    counts[monthIndex] += 1;
    countsByProfileId.set(response.profile_id, counts);
  });

  const rows = ((profiles ?? []) as AttendanceProfileRow[])
    .map((profile) => {
      const fallback = splitFullName(profile.full_name);
      const firstName = profile.first_name ?? fallback.firstName;
      const lastName = profile.last_name ?? fallback.lastName;
      const playerName = formatFullName(firstName, lastName, profile.full_name);
      const sortLabel = formatSortName(firstName, lastName, playerName);
      const monthly = countsByProfileId.get(profile.id) ?? Array.from({ length: 12 }, () => 0);

      return {
        monthly,
        playerId: profile.id,
        playerName,
        sortLabel,
        total: monthly.reduce((sum, value) => sum + value, 0)
      };
    })
    .sort((left, right) => left.sortLabel.localeCompare(right.sortLabel, "sk", { sensitivity: "base" }));

  return {
    error: null,
    isConfigured: true,
    rows,
    selectedYear,
    years: availableYears
  };
}
