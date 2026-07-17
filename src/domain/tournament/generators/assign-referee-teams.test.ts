import assert from "node:assert/strict";
import test from "node:test";
import { assignRefereeTeams } from "@/src/domain/tournament/generators";
import type { ScheduledGroupMatch } from "@/src/domain/tournament/generators/schedule-group-matches-types";

function makeMatch({
  awayTeamId,
  courtNumber = 1,
  groupId = "group-a",
  homeTeamId,
  roundNumber = 1,
  scheduledEnd,
  scheduledStart,
  sequenceNumber
}: {
  awayTeamId: string;
  courtNumber?: number;
  groupId?: string;
  homeTeamId: string;
  roundNumber?: number;
  scheduledEnd: string;
  scheduledStart: string;
  sequenceNumber: number;
}): ScheduledGroupMatch {
  return {
    awayTeamId,
    courtNumber,
    groupId,
    homeTeamId,
    matchNumber: sequenceNumber,
    roundNumber,
    scheduledEnd,
    scheduledStart,
    sequenceNumber,
    tournamentId: "tournament-1"
  };
}

function assertAssigned(result: ReturnType<typeof assignRefereeTeams>) {
  assert.equal(result.ok, true);

  if (!result.ok) {
    throw new Error("Expected successful referee assignment.");
  }

  return result.result;
}

test("referee: referee team never plays at the same time", () => {
  const matches = [
    makeMatch({
      awayTeamId: "team-2",
      homeTeamId: "team-1",
      scheduledEnd: "2026-07-18T08:20:00.000Z",
      scheduledStart: "2026-07-18T08:00:00.000Z",
      sequenceNumber: 1
    }),
    makeMatch({
      awayTeamId: "team-4",
      courtNumber: 2,
      homeTeamId: "team-3",
      scheduledEnd: "2026-07-18T08:20:00.000Z",
      scheduledStart: "2026-07-18T08:00:00.000Z",
      sequenceNumber: 2
    })
  ];

  const assigned = assertAssigned(
    assignRefereeTeams({
      matches,
      teams: ["team-1", "team-2", "team-3", "team-4", "team-5"].map((id) => ({ groupId: "group-a", id }))
    })
  );

  assigned.assignments.forEach((assignment) => {
    const match = matches.find((item) => item.sequenceNumber === assignment.matchSequenceNumber);
    assert.ok(match);
    assert.notEqual(assignment.refereeTeamId, match?.homeTeamId);
    assert.notEqual(assignment.refereeTeamId, match?.awayTeamId);
  });
});

test("referee: referee belongs to the same group", () => {
  const matches = [
    makeMatch({
      awayTeamId: "team-2",
      homeTeamId: "team-1",
      scheduledEnd: "2026-07-18T08:20:00.000Z",
      scheduledStart: "2026-07-18T08:00:00.000Z",
      sequenceNumber: 1
    })
  ];

  const assigned = assertAssigned(
    assignRefereeTeams({
      matches,
      teams: [{ groupId: "group-a", id: "team-1" }, { groupId: "group-a", id: "team-2" }, { groupId: "group-a", id: "team-3" }]
    })
  );

  assert.equal(assigned.assignments[0]?.refereeTeamId, "team-3");
});

test("referee: every match receives a referee when possible", () => {
  const matches = [
    makeMatch({
      awayTeamId: "team-2",
      homeTeamId: "team-1",
      scheduledEnd: "2026-07-18T08:20:00.000Z",
      scheduledStart: "2026-07-18T08:00:00.000Z",
      sequenceNumber: 1
    }),
    makeMatch({
      awayTeamId: "team-4",
      homeTeamId: "team-3",
      scheduledEnd: "2026-07-18T08:50:00.000Z",
      scheduledStart: "2026-07-18T08:30:00.000Z",
      sequenceNumber: 2
    })
  ];

  const assigned = assertAssigned(
    assignRefereeTeams({
      matches,
      teams: ["team-1", "team-2", "team-3", "team-4", "team-5"].map((id) => ({ groupId: "group-a", id }))
    })
  );

  assert.equal(assigned.assignments.length, matches.length);
});

test("referee: counts are as balanced as possible", () => {
  const matches = [
    makeMatch({
      awayTeamId: "team-2",
      homeTeamId: "team-1",
      scheduledEnd: "2026-07-18T08:20:00.000Z",
      scheduledStart: "2026-07-18T08:00:00.000Z",
      sequenceNumber: 1
    }),
    makeMatch({
      awayTeamId: "team-4",
      homeTeamId: "team-3",
      scheduledEnd: "2026-07-18T08:50:00.000Z",
      scheduledStart: "2026-07-18T08:30:00.000Z",
      sequenceNumber: 2
    }),
    makeMatch({
      awayTeamId: "team-5",
      homeTeamId: "team-1",
      scheduledEnd: "2026-07-18T09:20:00.000Z",
      scheduledStart: "2026-07-18T09:00:00.000Z",
      sequenceNumber: 3
    })
  ];

  const assigned = assertAssigned(
    assignRefereeTeams({
      matches,
      teams: ["team-1", "team-2", "team-3", "team-4", "team-5"].map((id) => ({ groupId: "group-a", id }))
    })
  );

  const counts = Object.values(assigned.dutyCounts);
  const max = Math.max(...counts);
  const min = Math.min(...counts);
  assert.ok(max - min <= 1);
});

test("referee: output is deterministic", () => {
  const input = {
    matches: [
      makeMatch({
        awayTeamId: "team-2",
        homeTeamId: "team-1",
        scheduledEnd: "2026-07-18T08:20:00.000Z",
        scheduledStart: "2026-07-18T08:00:00.000Z",
        sequenceNumber: 1
      }),
      makeMatch({
        awayTeamId: "team-4",
        homeTeamId: "team-3",
        scheduledEnd: "2026-07-18T08:50:00.000Z",
        scheduledStart: "2026-07-18T08:30:00.000Z",
        sequenceNumber: 2
      })
    ],
    teams: ["team-1", "team-2", "team-3", "team-4", "team-5"].map((id) => ({ groupId: "group-a", id }))
  } as const;

  const first = assignRefereeTeams(input);
  const second = assignRefereeTeams(input);

  assert.deepEqual(first, second);
});

test("referee: warnings are returned for constrained schedules", () => {
  const matches = [
    makeMatch({
      awayTeamId: "team-2",
      homeTeamId: "team-1",
      scheduledEnd: "2026-07-18T08:20:00.000Z",
      scheduledStart: "2026-07-18T08:00:00.000Z",
      sequenceNumber: 1
    }),
    makeMatch({
      awayTeamId: "team-3",
      homeTeamId: "team-4",
      scheduledEnd: "2026-07-18T08:50:00.000Z",
      scheduledStart: "2026-07-18T08:20:00.000Z",
      sequenceNumber: 2
    })
  ];

  const assigned = assertAssigned(
    assignRefereeTeams({
      matches,
      teams: ["team-1", "team-2", "team-3", "team-4", "team-5"].map((id) => ({ groupId: "group-a", id }))
    })
  );

  assert.ok(assigned.warnings.length > 0);
});

test("referee: impossible schedule returns failure", () => {
  const result = assignRefereeTeams({
    matches: [
      makeMatch({
        awayTeamId: "team-2",
        homeTeamId: "team-1",
        scheduledEnd: "2026-07-18T08:20:00.000Z",
        scheduledStart: "2026-07-18T08:00:00.000Z",
        sequenceNumber: 1
      })
    ],
    teams: [{ groupId: "group-a", id: "team-1" }, { groupId: "group-a", id: "team-2" }]
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.errors.some((error) => error.code === "NO_VALID_REFEREE_AVAILABLE"));
});
