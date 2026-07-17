import type {
  GroupMatchSchedule,
  ScheduleGroupMatchesError,
  ScheduleGroupMatchesInput,
  ScheduleGroupMatchesResult,
  ScheduledGroupMatch,
  ScheduledGroupRound
} from "@/src/domain/tournament/generators/schedule-group-matches-types";
import type { RoundRobinMatch, RoundRobinRound } from "@/src/domain/tournament/generators/round-robin-types";

function makeError(code: ScheduleGroupMatchesError["code"], message: string, extra: Partial<ScheduleGroupMatchesError> = {}): ScheduleGroupMatchesError {
  return { code, message, ...extra };
}

function addMinutes(isoValue: string, minutes: number) {
  return new Date(new Date(isoValue).getTime() + minutes * 60_000).toISOString();
}

function validateInput(input: ScheduleGroupMatchesInput) {
  const errors: ScheduleGroupMatchesError[] = [];
  const start = new Date(input.tournamentStart);

  if (!Number.isInteger(input.courtCount) || input.courtCount < 1) {
    errors.push(makeError("INVALID_COURT_COUNT", "Court count must be at least 1."));
  }

  if (!Number.isInteger(input.matchDurationMinutes) || input.matchDurationMinutes <= 0) {
    errors.push(makeError("INVALID_MATCH_DURATION", "Match duration must be a positive integer."));
  }

  if (!Number.isInteger(input.breakDurationMinutes) || input.breakDurationMinutes < 0) {
    errors.push(makeError("INVALID_BREAK_DURATION", "Break duration must be zero or a positive integer."));
  }

  if (Number.isNaN(start.getTime())) {
    errors.push(makeError("INVALID_START_DATETIME", "Tournament start must be a valid datetime."));
  }

  const groupOrderMap = new Map(input.groupConfigurations.map((config) => [config.groupId, config.order]));

  input.rounds.forEach((round) => {
    if (round.tournamentId !== input.tournamentId) {
      errors.push(
        makeError("MIXED_TOURNAMENT_IDS", "All rounds must belong to the same tournament as the scheduling input.", {
          groupId: round.groupId,
          roundNumber: round.roundNumber
        })
      );
    }

    if (!groupOrderMap.has(round.groupId)) {
      errors.push(
        makeError("MISSING_GROUP_CONFIGURATION", "Each round group must have a matching group configuration.", {
          groupId: round.groupId,
          roundNumber: round.roundNumber
        })
      );
    }

    const seenTeams = new Set<string>();

    round.matches.forEach((match) => {
      if (seenTeams.has(match.homeTeamId)) {
        errors.push(
          makeError("TEAM_OVERLAP", "A team cannot play twice in the same round.", {
            groupId: round.groupId,
            roundNumber: round.roundNumber,
            teamId: match.homeTeamId
          })
        );
      }

      if (seenTeams.has(match.awayTeamId)) {
        errors.push(
          makeError("TEAM_OVERLAP", "A team cannot play twice in the same round.", {
            groupId: round.groupId,
            roundNumber: round.roundNumber,
            teamId: match.awayTeamId
          })
        );
      }

      seenTeams.add(match.homeTeamId);
      seenTeams.add(match.awayTeamId);
    });
  });

  return errors;
}

function sortRounds(rounds: readonly RoundRobinRound[], groupConfigurations: ScheduleGroupMatchesInput["groupConfigurations"]) {
  const groupOrderMap = new Map(groupConfigurations.map((config) => [config.groupId, config.order]));

  return [...rounds].sort((left, right) => {
    if (left.roundNumber !== right.roundNumber) {
      return left.roundNumber - right.roundNumber;
    }

    const leftOrder = groupOrderMap.get(left.groupId) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = groupOrderMap.get(right.groupId) ?? Number.MAX_SAFE_INTEGER;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.groupId.localeCompare(right.groupId);
  });
}

function scheduleMatchesForRounds({
  breakDurationMinutes,
  courtCount,
  matchDurationMinutes,
  rounds,
  tournamentId,
  tournamentStart
}: {
  breakDurationMinutes: number;
  courtCount: number;
  matchDurationMinutes: number;
  rounds: RoundRobinRound[];
  tournamentId: string;
  tournamentStart: string;
}) {
  let currentSlotStart = tournamentStart;
  let sequenceNumber = 1;
  const scheduledRounds: ScheduledGroupRound[] = [];

  rounds.forEach((round) => {
    const roundMatches: ScheduledGroupMatch[] = [];
    let batchStart = currentSlotStart;
    let courtNumber = 1;

    round.matches.forEach((match, index) => {
      if (index > 0 && index % courtCount === 0) {
        batchStart = addMinutes(batchStart, matchDurationMinutes + breakDurationMinutes);
        courtNumber = 1;
      }

      roundMatches.push({
        ...match,
        courtNumber,
        scheduledEnd: addMinutes(batchStart, matchDurationMinutes),
        scheduledStart: batchStart,
        sequenceNumber
      });

      courtNumber += 1;
      sequenceNumber += 1;
    });

    const slotCount = round.matches.length === 0 ? 0 : Math.ceil(round.matches.length / courtCount);
    const roundEnd = slotCount === 0 ? currentSlotStart : addMinutes(currentSlotStart, slotCount * matchDurationMinutes + Math.max(0, slotCount - 1) * breakDurationMinutes);

    scheduledRounds.push({
      ...round,
      matches: roundMatches
    });

    currentSlotStart = addMinutes(roundEnd, breakDurationMinutes);
  });

  const totalMatches = scheduledRounds.reduce((total, round) => total + round.matches.length, 0);

  const schedule: GroupMatchSchedule = {
    groupId: scheduledRounds.length === 1 ? scheduledRounds[0].groupId : "multi-group",
    rounds: scheduledRounds,
    teamIds: Array.from(
      new Set(
        scheduledRounds.flatMap((round) =>
          round.matches.flatMap((match) => [match.homeTeamId, match.awayTeamId])
        )
      )
    ),
    totalMatches,
    totalRounds: Array.from(new Set(scheduledRounds.map((round) => `${round.groupId}:${round.roundNumber}`))).length,
    tournamentId
  };

  return schedule;
}

export function scheduleGroupMatches(input: ScheduleGroupMatchesInput): ScheduleGroupMatchesResult {
  const validationErrors = validateInput(input);

  if (validationErrors.length > 0) {
    return {
      errors: validationErrors,
      ok: false
    };
  }

  const sortedRounds = sortRounds(input.rounds, input.groupConfigurations);

  return {
    ok: true,
    schedule: scheduleMatchesForRounds({
      breakDurationMinutes: input.breakDurationMinutes,
      courtCount: input.courtCount,
      matchDurationMinutes: input.matchDurationMinutes,
      rounds: sortedRounds,
      tournamentId: input.tournamentId,
      tournamentStart: new Date(input.tournamentStart).toISOString()
    })
  };
}
