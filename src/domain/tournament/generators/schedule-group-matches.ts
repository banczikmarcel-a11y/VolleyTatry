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

function scheduleSingleTrackRounds({
  breakDurationMinutes,
  courtNumberOffset = 0,
  matchDurationMinutes,
  rounds,
  tournamentStart
}: {
  breakDurationMinutes: number;
  courtNumberOffset?: number;
  matchDurationMinutes: number;
  rounds: RoundRobinRound[];
  tournamentStart: string;
}) {
  let currentSlotStart = tournamentStart;
  const scheduledRounds: ScheduledGroupRound[] = [];

  rounds.forEach((round) => {
    const roundMatches: ScheduledGroupMatch[] = [];
    let slotStart = currentSlotStart;

    round.matches.forEach((match) => {
      roundMatches.push({
        ...match,
        courtNumber: courtNumberOffset + 1,
        scheduledEnd: addMinutes(slotStart, matchDurationMinutes),
        scheduledStart: slotStart,
        sequenceNumber: 0
      });

      slotStart = addMinutes(slotStart, matchDurationMinutes + breakDurationMinutes);
    });

    const roundEnd = roundMatches.at(-1)?.scheduledEnd ?? currentSlotStart;

    scheduledRounds.push({
      ...round,
      matches: roundMatches
    });

    currentSlotStart = addMinutes(roundEnd, breakDurationMinutes);
  });

  return scheduledRounds;
}

function scheduleSharedCourtRounds({
  breakDurationMinutes,
  courtCount,
  matchDurationMinutes,
  rounds,
  tournamentStart
}: {
  breakDurationMinutes: number;
  courtCount: number;
  matchDurationMinutes: number;
  rounds: RoundRobinRound[];
  tournamentStart: string;
}) {
  let currentSlotStart = tournamentStart;
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
        sequenceNumber: 0
      });

      courtNumber += 1;
    });

    const slotCount = round.matches.length === 0 ? 0 : Math.ceil(round.matches.length / courtCount);
    const roundEnd = slotCount === 0 ? currentSlotStart : addMinutes(currentSlotStart, slotCount * matchDurationMinutes + Math.max(0, slotCount - 1) * breakDurationMinutes);

    scheduledRounds.push({
      ...round,
      matches: roundMatches
    });

    currentSlotStart = addMinutes(roundEnd, breakDurationMinutes);
  });

  return scheduledRounds;
}

function assignSequenceNumbers(rounds: ScheduledGroupRound[]) {
  const sortedMatches = rounds
    .flatMap((round) => round.matches)
    .sort((left, right) => {
      const startDifference = new Date(left.scheduledStart).getTime() - new Date(right.scheduledStart).getTime();

      if (startDifference !== 0) {
        return startDifference;
      }

      if (left.courtNumber !== right.courtNumber) {
        return left.courtNumber - right.courtNumber;
      }

      if (left.groupId !== right.groupId) {
        return left.groupId.localeCompare(right.groupId);
      }

      if (left.roundNumber !== right.roundNumber) {
        return left.roundNumber - right.roundNumber;
      }

      return left.matchNumber - right.matchNumber;
    });

  const sequenceByKey = new Map(
    sortedMatches.map((match, index) => [
      `${match.groupId}:${match.roundNumber}:${match.matchNumber}:${match.homeTeamId}:${match.awayTeamId}`,
      index + 1
    ])
  );

  return rounds.map((round) => ({
    ...round,
    matches: round.matches.map((match) => ({
      ...match,
      sequenceNumber:
        sequenceByKey.get(`${match.groupId}:${match.roundNumber}:${match.matchNumber}:${match.homeTeamId}:${match.awayTeamId}`) ?? 0
    }))
  }));
}

function scheduleMatchesForRounds({
  breakDurationMinutes,
  courtCount,
  groupConfigurations,
  matchDurationMinutes,
  rounds,
  tournamentId,
  tournamentStart
}: {
  breakDurationMinutes: number;
  courtCount: number;
  groupConfigurations: ScheduleGroupMatchesInput["groupConfigurations"];
  matchDurationMinutes: number;
  rounds: RoundRobinRound[];
  tournamentId: string;
  tournamentStart: string;
}) {
  const distinctGroupIds = Array.from(new Set(rounds.map((round) => round.groupId)));
  const groupOrderMap = new Map(groupConfigurations.map((config) => [config.groupId, config.order]));

  const scheduledRounds =
    distinctGroupIds.length > 1 && courtCount >= distinctGroupIds.length
      ? distinctGroupIds
          .sort((left, right) => {
            const leftOrder = groupOrderMap.get(left) ?? Number.MAX_SAFE_INTEGER;
            const rightOrder = groupOrderMap.get(right) ?? Number.MAX_SAFE_INTEGER;

            if (leftOrder !== rightOrder) {
              return leftOrder - rightOrder;
            }

            return left.localeCompare(right);
          })
          .flatMap((groupId, index) =>
            scheduleSingleTrackRounds({
              breakDurationMinutes,
              courtNumberOffset: index,
              matchDurationMinutes,
              rounds: rounds.filter((round) => round.groupId === groupId),
              tournamentStart
            })
          )
      : scheduleSharedCourtRounds({
          breakDurationMinutes,
          courtCount,
          matchDurationMinutes,
          rounds,
          tournamentStart
        });

  const roundsWithSequence = assignSequenceNumbers(scheduledRounds);
  const totalMatches = roundsWithSequence.reduce((total, round) => total + round.matches.length, 0);

  const schedule: GroupMatchSchedule = {
    groupId: roundsWithSequence.length === 1 ? roundsWithSequence[0].groupId : "multi-group",
    rounds: roundsWithSequence,
    teamIds: Array.from(
      new Set(
        roundsWithSequence.flatMap((round) =>
          round.matches.flatMap((match) => [match.homeTeamId, match.awayTeamId])
        )
      )
    ),
    totalMatches,
    totalRounds: Array.from(new Set(roundsWithSequence.map((round) => `${round.groupId}:${round.roundNumber}`))).length,
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
      groupConfigurations: input.groupConfigurations,
      matchDurationMinutes: input.matchDurationMinutes,
      rounds: sortedRounds,
      tournamentId: input.tournamentId,
      tournamentStart: new Date(input.tournamentStart).toISOString()
    })
  };
}
