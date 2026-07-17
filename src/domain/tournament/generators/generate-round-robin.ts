import type {
  RoundRobinGenerationError,
  RoundRobinGenerationInput,
  RoundRobinGenerationResult,
  RoundRobinMatch,
  RoundRobinRound,
  RoundRobinTeamInput
} from "@/src/domain/tournament/generators/round-robin-types";

const BYE_TEAM_ID = "__BYE__";

function makeError(code: RoundRobinGenerationError["code"], message: string, teamId?: string): RoundRobinGenerationError {
  return { code, message, teamId };
}

function validateTeams(teams: RoundRobinTeamInput[]) {
  const errors: RoundRobinGenerationError[] = [];
  const seen = new Set<string>();

  if (teams.length < 2) {
    errors.push(makeError("TOO_FEW_TEAMS", "At least 2 teams are required to generate a round-robin schedule."));
  }

  teams.forEach((team) => {
    if (seen.has(team.id)) {
      errors.push(makeError("DUPLICATE_TEAM_ID", `Duplicate team id '${team.id}' is not allowed.`, team.id));
      return;
    }

    seen.add(team.id);
  });

  return errors;
}

function rotateTeams(teamIds: string[]) {
  if (teamIds.length <= 2) {
    return [...teamIds];
  }

  const [fixed, ...rest] = teamIds;
  const rotated = [fixed, rest[rest.length - 1], ...rest.slice(0, -1)];
  return rotated;
}

function createRoundMatches({
  groupId,
  roundNumber,
  rotatedTeamIds,
  tournamentId
}: {
  groupId: string;
  roundNumber: number;
  rotatedTeamIds: string[];
  tournamentId: string;
}) {
  const matches: RoundRobinMatch[] = [];
  let byeTeamId: string | null = null;

  for (let index = 0; index < rotatedTeamIds.length / 2; index += 1) {
    const leftTeamId = rotatedTeamIds[index];
    const rightTeamId = rotatedTeamIds[rotatedTeamIds.length - 1 - index];

    if (leftTeamId === BYE_TEAM_ID || rightTeamId === BYE_TEAM_ID) {
      byeTeamId = leftTeamId === BYE_TEAM_ID ? rightTeamId : leftTeamId;
      continue;
    }

    const useNaturalOrder = (roundNumber + index) % 2 === 1;
    const homeTeamId = useNaturalOrder ? leftTeamId : rightTeamId;
    const awayTeamId = useNaturalOrder ? rightTeamId : leftTeamId;

    matches.push({
      awayTeamId,
      groupId,
      homeTeamId,
      matchNumber: matches.length + 1,
      roundNumber,
      tournamentId
    });
  }

  return {
    byeTeamId,
    matches
  };
}

export function generateRoundRobinSchedule(input: RoundRobinGenerationInput): RoundRobinGenerationResult {
  const validationErrors = validateTeams(input.teams);

  if (validationErrors.length > 0) {
    return {
      errors: validationErrors,
      ok: false
    };
  }

  const orderedTeamIds = input.teams.map((team) => team.id);
  const workingTeamIds = orderedTeamIds.length % 2 === 0 ? [...orderedTeamIds] : [...orderedTeamIds, BYE_TEAM_ID];
  const totalRounds = workingTeamIds.length - 1;
  let rotatedTeamIds = [...workingTeamIds];
  const rounds: RoundRobinRound[] = [];

  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex += 1) {
    const roundNumber = roundIndex + 1;
    const { byeTeamId, matches } = createRoundMatches({
      groupId: input.groupId,
      roundNumber,
      rotatedTeamIds,
      tournamentId: input.tournamentId
    });

    rounds.push({
      byeTeamId,
      groupId: input.groupId,
      matches,
      roundNumber,
      tournamentId: input.tournamentId
    });

    rotatedTeamIds = rotateTeams(rotatedTeamIds);
  }

  return {
    ok: true,
    schedule: {
      groupId: input.groupId,
      rounds,
      teamIds: orderedTeamIds,
      totalMatches: rounds.reduce((total, round) => total + round.matches.length, 0),
      totalRounds,
      tournamentId: input.tournamentId
    }
  };
}
