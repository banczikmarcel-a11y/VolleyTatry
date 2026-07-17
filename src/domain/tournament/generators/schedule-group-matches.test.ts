import assert from "node:assert/strict";
import test from "node:test";
import { generateRoundRobinSchedule, scheduleGroupMatches } from "@/src/domain/tournament/generators";

function createTeams(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `team-${index + 1}`
  }));
}

function createRounds(teamCount: number, groupId = "group-a", tournamentId = "tournament-1") {
  const result = generateRoundRobinSchedule({
    groupId,
    teams: createTeams(teamCount),
    tournamentId
  });

  assert.equal(result.ok, true);

  if (!result.ok) {
    throw new Error("Expected successful round-robin generation.");
  }

  return result.schedule.rounds;
}

function createMultiGroupRounds(teamCountPerGroup: number, tournamentId = "tournament-1") {
  return [
    ...createRounds(teamCountPerGroup, "group-a", tournamentId),
    ...createRounds(teamCountPerGroup, "group-b", tournamentId)
  ];
}

function assertScheduled(result: ReturnType<typeof scheduleGroupMatches>) {
  assert.equal(result.ok, true);

  if (!result.ok) {
    throw new Error("Expected successful group scheduling.");
  }

  return result.schedule;
}

function flattenMatches(schedule: ReturnType<typeof assertScheduled>) {
  return schedule.rounds.flatMap((round) => round.matches);
}

test("schedule: no court overlap", () => {
  const schedule = assertScheduled(
    scheduleGroupMatches({
      breakDurationMinutes: 10,
      courtCount: 2,
      groupConfigurations: [{ groupId: "group-a", order: 1 }],
      matchDurationMinutes: 25,
      rounds: createRounds(6),
      tournamentId: "tournament-1",
      tournamentStart: "2026-07-18T08:00:00.000Z"
    })
  );

  const byCourt = new Map<number, { start: number; end: number }[]>();

  flattenMatches(schedule).forEach((match) => {
    const entries = byCourt.get(match.courtNumber) ?? [];
    entries.push({
      end: new Date(match.scheduledEnd).getTime(),
      start: new Date(match.scheduledStart).getTime()
    });
    byCourt.set(match.courtNumber, entries);
  });

  byCourt.forEach((entries) => {
    const sorted = [...entries].sort((left, right) => left.start - right.start);

    for (let index = 1; index < sorted.length; index += 1) {
      assert.ok(sorted[index].start >= sorted[index - 1].end);
    }
  });
});

test("schedule: no team overlap", () => {
  const schedule = assertScheduled(
    scheduleGroupMatches({
      breakDurationMinutes: 10,
      courtCount: 2,
      groupConfigurations: [{ groupId: "group-a", order: 1 }],
      matchDurationMinutes: 25,
      rounds: createRounds(6),
      tournamentId: "tournament-1",
      tournamentStart: "2026-07-18T08:00:00.000Z"
    })
  );

  const matches = flattenMatches(schedule);
  const teams = Array.from(new Set(matches.flatMap((match) => [match.homeTeamId, match.awayTeamId])));

  teams.forEach((teamId) => {
    const teamMatches = matches
      .filter((match) => match.homeTeamId === teamId || match.awayTeamId === teamId)
      .map((match) => ({
        end: new Date(match.scheduledEnd).getTime(),
        start: new Date(match.scheduledStart).getTime()
      }))
      .sort((left, right) => left.start - right.start);

    for (let index = 1; index < teamMatches.length; index += 1) {
      assert.ok(teamMatches[index].start >= teamMatches[index - 1].end);
    }
  });
});

test("schedule: correct match duration", () => {
  const durationMinutes = 30;
  const schedule = assertScheduled(
    scheduleGroupMatches({
      breakDurationMinutes: 5,
      courtCount: 1,
      groupConfigurations: [{ groupId: "group-a", order: 1 }],
      matchDurationMinutes: durationMinutes,
      rounds: createRounds(4),
      tournamentId: "tournament-1",
      tournamentStart: "2026-07-18T08:00:00.000Z"
    })
  );

  flattenMatches(schedule).forEach((match) => {
    const elapsedMinutes = (new Date(match.scheduledEnd).getTime() - new Date(match.scheduledStart).getTime()) / 60_000;
    assert.equal(elapsedMinutes, durationMinutes);
  });
});

test("schedule: correct break duration", () => {
  const breakDurationMinutes = 7;
  const schedule = assertScheduled(
    scheduleGroupMatches({
      breakDurationMinutes,
      courtCount: 1,
      groupConfigurations: [{ groupId: "group-a", order: 1 }],
      matchDurationMinutes: 20,
      rounds: createRounds(4),
      tournamentId: "tournament-1",
      tournamentStart: "2026-07-18T08:00:00.000Z"
    })
  );

  const matches = flattenMatches(schedule).sort((left, right) => left.sequenceNumber - right.sequenceNumber);

  for (let index = 1; index < matches.length; index += 1) {
    const gapMinutes = (new Date(matches[index].scheduledStart).getTime() - new Date(matches[index - 1].scheduledEnd).getTime()) / 60_000;
    assert.equal(gapMinutes, breakDurationMinutes);
  }
});

test("schedule: stable ordering", () => {
  const input = {
    breakDurationMinutes: 10,
    courtCount: 2,
    groupConfigurations: [{ groupId: "group-a", order: 1 }],
    matchDurationMinutes: 25,
    rounds: createRounds(6),
    tournamentId: "tournament-1",
    tournamentStart: "2026-07-18T08:00:00.000Z"
  } as const;

  const first = scheduleGroupMatches(input);
  const second = scheduleGroupMatches(input);

  assert.deepEqual(first, second);
});

test("schedule: correct behavior with 1 court", () => {
  const schedule = assertScheduled(
    scheduleGroupMatches({
      breakDurationMinutes: 5,
      courtCount: 1,
      groupConfigurations: [{ groupId: "group-a", order: 1 }],
      matchDurationMinutes: 20,
      rounds: createRounds(4),
      tournamentId: "tournament-1",
      tournamentStart: "2026-07-18T08:00:00.000Z"
    })
  );

  const courts = new Set(flattenMatches(schedule).map((match) => match.courtNumber));
  assert.deepEqual([...courts], [1]);
});

test("schedule: correct behavior with 2 courts", () => {
  const schedule = assertScheduled(
    scheduleGroupMatches({
      breakDurationMinutes: 5,
      courtCount: 2,
      groupConfigurations: [{ groupId: "group-a", order: 1 }],
      matchDurationMinutes: 20,
      rounds: createRounds(6),
      tournamentId: "tournament-1",
      tournamentStart: "2026-07-18T08:00:00.000Z"
    })
  );

  const firstRound = schedule.rounds[0];
  assert.ok(firstRound.matches.some((match) => match.courtNumber === 1));
  assert.ok(firstRound.matches.some((match) => match.courtNumber === 2));
});

test("schedule: separate groups use dedicated courts when enough courts are available", () => {
  const schedule = assertScheduled(
    scheduleGroupMatches({
      breakDurationMinutes: 5,
      courtCount: 2,
      groupConfigurations: [
        { groupId: "group-a", order: 1 },
        { groupId: "group-b", order: 2 }
      ],
      matchDurationMinutes: 20,
      rounds: createMultiGroupRounds(5),
      tournamentId: "tournament-1",
      tournamentStart: "2026-07-18T08:00:00.000Z"
    })
  );

  const matches = flattenMatches(schedule);
  const groupAMatches = matches.filter((match) => match.groupId === "group-a");
  const groupBMatches = matches.filter((match) => match.groupId === "group-b");

  assert.equal(groupAMatches.length, 10);
  assert.equal(groupBMatches.length, 10);
  assert.ok(groupAMatches.every((match) => match.courtNumber === 1));
  assert.ok(groupBMatches.every((match) => match.courtNumber === 2));
});

test("schedule: invalid court count", () => {
  const result = scheduleGroupMatches({
    breakDurationMinutes: 5,
    courtCount: 0,
    groupConfigurations: [{ groupId: "group-a", order: 1 }],
    matchDurationMinutes: 20,
    rounds: createRounds(4),
    tournamentId: "tournament-1",
    tournamentStart: "2026-07-18T08:00:00.000Z"
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.errors.some((error) => error.code === "INVALID_COURT_COUNT"));
});

test("schedule: invalid duration values", () => {
  const invalidMatchDuration = scheduleGroupMatches({
    breakDurationMinutes: 5,
    courtCount: 1,
    groupConfigurations: [{ groupId: "group-a", order: 1 }],
    matchDurationMinutes: 0,
    rounds: createRounds(4),
    tournamentId: "tournament-1",
    tournamentStart: "2026-07-18T08:00:00.000Z"
  });

  const invalidBreakDuration = scheduleGroupMatches({
    breakDurationMinutes: -1,
    courtCount: 1,
    groupConfigurations: [{ groupId: "group-a", order: 1 }],
    matchDurationMinutes: 20,
    rounds: createRounds(4),
    tournamentId: "tournament-1",
    tournamentStart: "2026-07-18T08:00:00.000Z"
  });

  assert.equal(invalidMatchDuration.ok, false);
  assert.equal(invalidBreakDuration.ok, false);

  if (!invalidMatchDuration.ok) {
    assert.ok(invalidMatchDuration.errors.some((error) => error.code === "INVALID_MATCH_DURATION"));
  }

  if (!invalidBreakDuration.ok) {
    assert.ok(invalidBreakDuration.errors.some((error) => error.code === "INVALID_BREAK_DURATION"));
  }
});
