import assert from "node:assert/strict";
import test from "node:test";
import { generateRoundRobinSchedule } from "@/src/domain/tournament/generators";

function createTeams(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `team-${index + 1}`
  }));
}

function assertSuccessfulSchedule(result: ReturnType<typeof generateRoundRobinSchedule>) {
  assert.equal(result.ok, true);

  if (!result.ok) {
    throw new Error("Expected successful round-robin generation.");
  }

  return result.schedule;
}

function collectMatches(schedule: ReturnType<typeof assertSuccessfulSchedule>) {
  return schedule.rounds.flatMap((round) => round.matches);
}

function toPairKey(homeTeamId: string, awayTeamId: string) {
  return [homeTeamId, awayTeamId].sort().join("::");
}

test("round robin: 5 teams produces exactly 10 matches", () => {
  const schedule = assertSuccessfulSchedule(
    generateRoundRobinSchedule({
      groupId: "group-a",
      teams: createTeams(5),
      tournamentId: "tournament-1"
    })
  );

  assert.equal(schedule.totalMatches, 10);
  assert.equal(collectMatches(schedule).length, 10);
});

test("round robin: 5 teams every pair appears exactly once", () => {
  const schedule = assertSuccessfulSchedule(
    generateRoundRobinSchedule({
      groupId: "group-a",
      teams: createTeams(5),
      tournamentId: "tournament-1"
    })
  );

  const pairCounts = new Map<string, number>();

  collectMatches(schedule).forEach((match) => {
    const key = toPairKey(match.homeTeamId, match.awayTeamId);
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
  });

  assert.equal(pairCounts.size, 10);
  pairCounts.forEach((count) => assert.equal(count, 1));
});

test("round robin: 5 teams each team plays 4 matches", () => {
  const schedule = assertSuccessfulSchedule(
    generateRoundRobinSchedule({
      groupId: "group-a",
      teams: createTeams(5),
      tournamentId: "tournament-1"
    })
  );

  const appearances = new Map<string, number>();

  collectMatches(schedule).forEach((match) => {
    appearances.set(match.homeTeamId, (appearances.get(match.homeTeamId) ?? 0) + 1);
    appearances.set(match.awayTeamId, (appearances.get(match.awayTeamId) ?? 0) + 1);
  });

  schedule.teamIds.forEach((teamId) => {
    assert.equal(appearances.get(teamId), 4);
  });
});

test("round robin: 5 teams no team plays twice in the same round", () => {
  const schedule = assertSuccessfulSchedule(
    generateRoundRobinSchedule({
      groupId: "group-a",
      teams: createTeams(5),
      tournamentId: "tournament-1"
    })
  );

  schedule.rounds.forEach((round) => {
    const seen = new Set<string>();

    round.matches.forEach((match) => {
      assert.equal(seen.has(match.homeTeamId), false);
      assert.equal(seen.has(match.awayTeamId), false);
      seen.add(match.homeTeamId);
      seen.add(match.awayTeamId);
    });
  });
});

test("round robin: 5 teams bye distribution is valid", () => {
  const schedule = assertSuccessfulSchedule(
    generateRoundRobinSchedule({
      groupId: "group-a",
      teams: createTeams(5),
      tournamentId: "tournament-1"
    })
  );

  const byeCounts = new Map<string, number>();

  schedule.rounds.forEach((round) => {
    assert.notEqual(round.byeTeamId, null);

    if (round.byeTeamId) {
      byeCounts.set(round.byeTeamId, (byeCounts.get(round.byeTeamId) ?? 0) + 1);
    }
  });

  schedule.teamIds.forEach((teamId) => {
    assert.equal(byeCounts.get(teamId), 1);
  });
});

test("round robin: output is deterministic", () => {
  const input = {
    groupId: "group-a",
    teams: createTeams(5),
    tournamentId: "tournament-1"
  };

  const first = generateRoundRobinSchedule(input);
  const second = generateRoundRobinSchedule(input);

  assert.deepEqual(first, second);
});

test("round robin: 4 teams works", () => {
  const schedule = assertSuccessfulSchedule(
    generateRoundRobinSchedule({
      groupId: "group-a",
      teams: createTeams(4),
      tournamentId: "tournament-1"
    })
  );

  assert.equal(schedule.totalRounds, 3);
  assert.equal(schedule.totalMatches, 6);
  schedule.rounds.forEach((round) => {
    assert.equal(round.matches.length, 2);
    assert.equal(round.byeTeamId, null);
  });
});

test("round robin: 6 teams works", () => {
  const schedule = assertSuccessfulSchedule(
    generateRoundRobinSchedule({
      groupId: "group-a",
      teams: createTeams(6),
      tournamentId: "tournament-1"
    })
  );

  assert.equal(schedule.totalRounds, 5);
  assert.equal(schedule.totalMatches, 15);
  schedule.rounds.forEach((round) => {
    assert.equal(round.matches.length, 3);
    assert.equal(round.byeTeamId, null);
  });
});

test("round robin: invalid duplicate team IDs", () => {
  const result = generateRoundRobinSchedule({
    groupId: "group-a",
    teams: [{ id: "team-1" }, { id: "team-1" }, { id: "team-2" }],
    tournamentId: "tournament-1"
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.errors.some((error) => error.code === "DUPLICATE_TEAM_ID"));
});

test("round robin: fewer than 2 teams is invalid", () => {
  const result = generateRoundRobinSchedule({
    groupId: "group-a",
    teams: [{ id: "team-1" }],
    tournamentId: "tournament-1"
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.errors.some((error) => error.code === "TOO_FEW_TEAMS"));
});
