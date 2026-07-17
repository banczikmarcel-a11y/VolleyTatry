import type {
  AssignRefereeTeamsGenerationResult,
  AssignRefereeTeamsInput,
  RefereeAssignment,
  RefereeAssignmentError,
  RefereeAssignmentResult,
  RefereeAssignmentWarning,
  RefereeGroupTeam
} from "@/src/domain/tournament/generators/assign-referee-teams-types";
import type { ScheduledGroupMatch } from "@/src/domain/tournament/generators/schedule-group-matches-types";

function makeError(code: RefereeAssignmentError["code"], message: string, matchSequenceNumber?: number): RefereeAssignmentError {
  return { code, matchSequenceNumber, message };
}

function makeWarning(
  code: RefereeAssignmentWarning["code"],
  message: string,
  options: Pick<RefereeAssignmentWarning, "matchSequenceNumber" | "refereeTeamId"> = {}
): RefereeAssignmentWarning {
  return { code, message, ...options };
}

function overlaps(left: ScheduledGroupMatch, right: ScheduledGroupMatch) {
  const leftStart = new Date(left.scheduledStart).getTime();
  const leftEnd = new Date(left.scheduledEnd).getTime();
  const rightStart = new Date(right.scheduledStart).getTime();
  const rightEnd = new Date(right.scheduledEnd).getTime();

  return leftStart < rightEnd && rightStart < leftEnd;
}

function sameTimeMatch(teamId: string, targetMatch: ScheduledGroupMatch, matches: readonly ScheduledGroupMatch[]) {
  return matches.some((match) => {
    if (!overlaps(match, targetMatch)) {
      return false;
    }

    return match.homeTeamId === teamId || match.awayTeamId === teamId;
  });
}

function previousOwnMatch(teamId: string, targetMatch: ScheduledGroupMatch, matches: readonly ScheduledGroupMatch[]) {
  return [...matches]
    .filter((match) => match.homeTeamId === teamId || match.awayTeamId === teamId)
    .filter((match) => new Date(match.scheduledEnd).getTime() <= new Date(targetMatch.scheduledStart).getTime())
    .sort((left, right) => new Date(right.scheduledEnd).getTime() - new Date(left.scheduledEnd).getTime())[0] ?? null;
}

function nextOwnMatch(teamId: string, targetMatch: ScheduledGroupMatch, matches: readonly ScheduledGroupMatch[]) {
  return [...matches]
    .filter((match) => match.homeTeamId === teamId || match.awayTeamId === teamId)
    .filter((match) => new Date(match.scheduledStart).getTime() >= new Date(targetMatch.scheduledEnd).getTime())
    .sort((left, right) => new Date(left.scheduledStart).getTime() - new Date(right.scheduledStart).getTime())[0] ?? null;
}

function hasAdjacentOwnMatch(teamId: string, targetMatch: ScheduledGroupMatch, matches: readonly ScheduledGroupMatch[]) {
  const previous = previousOwnMatch(teamId, targetMatch, matches);
  const next = nextOwnMatch(teamId, targetMatch, matches);

  return (
    (previous && new Date(previous.scheduledEnd).getTime() === new Date(targetMatch.scheduledStart).getTime())
    || (next && new Date(next.scheduledStart).getTime() === new Date(targetMatch.scheduledEnd).getTime())
  );
}

function validateInput(input: AssignRefereeTeamsInput) {
  const errors: RefereeAssignmentError[] = [];

  if (input.teams.length === 0) {
    errors.push(makeError("EMPTY_TEAMS", "At least one team is required for referee assignment."));
  }

  if (input.matches.length === 0) {
    errors.push(makeError("NO_MATCHES", "At least one scheduled match is required for referee assignment."));
  }

  const groupIds = new Set(input.teams.map((team) => team.groupId));
  const matchGroupIds = new Set(input.matches.map((match) => match.groupId));

  if (groupIds.size > 1 || matchGroupIds.size > 1 || (groupIds.size === 1 && matchGroupIds.size === 1 && [...groupIds][0] !== [...matchGroupIds][0])) {
    errors.push(makeError("GROUP_MISMATCH", "All teams and matches must belong to the same group."));
  }

  return errors;
}

type CandidateScore = {
  adjacentPenalty: number;
  dutyPenalty: number;
  repeatedPenalty: number;
  score: number;
  team: RefereeGroupTeam;
};

/**
 * Penalty model:
 * - dutyPenalty: distribute duties as evenly as possible
 * - repeatedPenalty: avoid repeating the immediately previous referee where alternatives exist
 * - adjacentPenalty: avoid assigning immediately before/after own match where possible
 * Lower score is better. Final tie-break uses original team order for deterministic output.
 */
function scoreCandidate({
  dutyCounts,
  lastAssignedRefereeTeamId,
  matches,
  targetMatch,
  team
}: {
  dutyCounts: Map<string, number>;
  lastAssignedRefereeTeamId: string | null;
  matches: readonly ScheduledGroupMatch[];
  targetMatch: ScheduledGroupMatch;
  team: RefereeGroupTeam;
}): CandidateScore {
  const dutyPenalty = (dutyCounts.get(team.id) ?? 0) * 100;
  const repeatedPenalty = lastAssignedRefereeTeamId === team.id ? 25 : 0;
  const adjacentPenalty = hasAdjacentOwnMatch(team.id, targetMatch, matches) ? 10 : 0;

  return {
    adjacentPenalty,
    dutyPenalty,
    repeatedPenalty,
    score: dutyPenalty + repeatedPenalty + adjacentPenalty,
    team
  };
}

export function assignRefereeTeams(input: AssignRefereeTeamsInput): AssignRefereeTeamsGenerationResult {
  const validationErrors = validateInput(input);

  if (validationErrors.length > 0) {
    return {
      errors: validationErrors,
      ok: false
    };
  }

  const sortedTeams = [...input.teams].sort((left, right) => left.id.localeCompare(right.id));
  const sortedMatches = [...input.matches].sort((left, right) => left.sequenceNumber - right.sequenceNumber);
  const dutyCounts = new Map(sortedTeams.map((team) => [team.id, 0]));
  const assignments: RefereeAssignment[] = [];
  const warnings: RefereeAssignmentWarning[] = [];
  let lastAssignedRefereeTeamId: string | null = null;

  for (const match of sortedMatches) {
    const eligibleTeams = sortedTeams.filter((team) => {
      if (team.groupId !== match.groupId) {
        return false;
      }

      if (team.id === match.homeTeamId || team.id === match.awayTeamId) {
        return false;
      }

      return !sameTimeMatch(team.id, match, sortedMatches);
    });

    if (eligibleTeams.length === 0) {
      return {
        errors: [
          makeError(
            "NO_VALID_REFEREE_AVAILABLE",
            "No valid referee team is available for this match under the current schedule.",
            match.sequenceNumber
          )
        ],
        ok: false
      };
    }

    const scoredCandidates = eligibleTeams
      .map((team) =>
        scoreCandidate({
          dutyCounts,
          lastAssignedRefereeTeamId,
          matches: sortedMatches,
          targetMatch: match,
          team
        })
      )
      .sort((left, right) => {
        if (left.score !== right.score) {
          return left.score - right.score;
        }

        return left.team.id.localeCompare(right.team.id);
      });

    const selected = scoredCandidates[0];
    assignments.push({
      matchSequenceNumber: match.sequenceNumber,
      refereeTeamId: selected.team.id
    });

    dutyCounts.set(selected.team.id, (dutyCounts.get(selected.team.id) ?? 0) + 1);

    if (selected.adjacentPenalty > 0) {
      warnings.push(
        makeWarning(
          "ADJACENT_TO_OWN_MATCH",
          "Referee assignment is immediately before or after the team's own match because no better option was available.",
          {
            matchSequenceNumber: match.sequenceNumber,
            refereeTeamId: selected.team.id
          }
        )
      );
    }

    if (selected.repeatedPenalty > 0 && eligibleTeams.length > 1) {
      warnings.push(
        makeWarning(
          "REPEATED_TEAM_WHEN_ALTERNATIVES_LIMITED",
          "A referee team had to be reused sooner than ideal because the schedule was constrained.",
          {
            matchSequenceNumber: match.sequenceNumber,
            refereeTeamId: selected.team.id
          }
        )
      );
    }

    lastAssignedRefereeTeamId = selected.team.id;
  }

  const result: RefereeAssignmentResult = {
    assignments,
    dutyCounts: Object.fromEntries(sortedTeams.map((team) => [team.id, dutyCounts.get(team.id) ?? 0])),
    warnings
  };

  return {
    ok: true,
    result
  };
}
