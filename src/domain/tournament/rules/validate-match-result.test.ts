import test from "node:test";
import assert from "node:assert/strict";
import { validateMatchResult } from "@/src/domain/tournament/rules";

function assertPlayoffSuccess(result: ReturnType<typeof validateMatchResult>) {
  assert.equal(result.ok, true);

  if (!result.ok || result.profile !== "PLAYOFF_BEST_OF_THREE_TO_15") {
    throw new Error("Expected successful playoff validation.");
  }

  return result;
}

function assertGroupSuccess(result: ReturnType<typeof validateMatchResult>) {
  assert.equal(result.ok, true);

  if (!result.ok || result.profile !== "GROUP_TIMED_MATCH") {
    throw new Error("Expected successful group validation.");
  }

  return result;
}

test("playoff: valid 2:0 match", () => {
  const result = validateMatchResult({
    profile: "PLAYOFF_BEST_OF_THREE_TO_15",
    sets: [
      { awayPoints: 10, homePoints: 15, setNumber: 1 },
      { awayPoints: 13, homePoints: 15, setNumber: 2 }
    ]
  });

  const success = assertPlayoffSuccess(result);
  assert.equal(success.summary.winner, "home");
  assert.equal(success.summary.home.setsWon, 2);
  assert.equal(success.summary.away.setsWon, 0);
});

test("playoff: valid 2:1 match", () => {
  const result = validateMatchResult({
    profile: "PLAYOFF_BEST_OF_THREE_TO_15",
    sets: [
      { awayPoints: 15, homePoints: 12, setNumber: 1 },
      { awayPoints: 9, homePoints: 15, setNumber: 2 },
      { awayPoints: 11, homePoints: 15, setNumber: 3 }
    ]
  });

  const success = assertPlayoffSuccess(result);
  assert.equal(success.summary.winner, "home");
  assert.equal(success.summary.totalSets, 3);
});

test("playoff: valid 16:14 set", () => {
  const result = validateMatchResult({
    profile: "PLAYOFF_BEST_OF_THREE_TO_15",
    sets: [
      { awayPoints: 14, homePoints: 16, setNumber: 1 },
      { awayPoints: 10, homePoints: 15, setNumber: 2 }
    ]
  });

  assert.equal(result.ok, true);
});

test("playoff: valid 21:19 set", () => {
  const result = validateMatchResult({
    profile: "PLAYOFF_BEST_OF_THREE_TO_15",
    sets: [
      { awayPoints: 19, homePoints: 21, setNumber: 1 },
      { awayPoints: 10, homePoints: 15, setNumber: 2 }
    ]
  });

  assert.equal(result.ok, true);
});

test("playoff: invalid 15:14 set", () => {
  const result = validateMatchResult({
    profile: "PLAYOFF_BEST_OF_THREE_TO_15",
    sets: [
      { awayPoints: 14, homePoints: 15, setNumber: 1 },
      { awayPoints: 10, homePoints: 15, setNumber: 2 }
    ]
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.errors.some((error) => error.code === "SET_MARGIN_TOO_SMALL"));
});

test("playoff: invalid 14:12 set", () => {
  const result = validateMatchResult({
    profile: "PLAYOFF_BEST_OF_THREE_TO_15",
    sets: [
      { awayPoints: 12, homePoints: 14, setNumber: 1 },
      { awayPoints: 10, homePoints: 15, setNumber: 2 }
    ]
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.errors.some((error) => error.code === "WINNER_SCORE_BELOW_TARGET"));
});

test("playoff: invalid draw", () => {
  const result = validateMatchResult({
    profile: "PLAYOFF_BEST_OF_THREE_TO_15",
    sets: [
      { awayPoints: 15, homePoints: 10, setNumber: 1 },
      { awayPoints: 10, homePoints: 15, setNumber: 2 }
    ]
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.errors.some((error) => error.code === "DRAW_NOT_ALLOWED"));
});

test("playoff: invalid fourth set", () => {
  const result = validateMatchResult({
    profile: "PLAYOFF_BEST_OF_THREE_TO_15",
    sets: [
      { awayPoints: 10, homePoints: 15, setNumber: 1 },
      { awayPoints: 11, homePoints: 15, setNumber: 2 },
      { awayPoints: 15, homePoints: 12, setNumber: 3 },
      { awayPoints: 15, homePoints: 13, setNumber: 4 }
    ]
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.errors.some((error) => error.code === "INVALID_COMPLETED_SET_COUNT"));
});

test("playoff: invalid third set after a 2:0 result", () => {
  const result = validateMatchResult({
    profile: "PLAYOFF_BEST_OF_THREE_TO_15",
    sets: [
      { awayPoints: 10, homePoints: 15, setNumber: 1 },
      { awayPoints: 11, homePoints: 15, setNumber: 2 },
      { awayPoints: 15, homePoints: 8, setNumber: 3 }
    ]
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.errors.some((error) => error.code === "EXTRA_SET_AFTER_WINNER_DECIDED"));
});

test("playoff: invalid match where neither team wins 2 sets", () => {
  const result = validateMatchResult({
    profile: "PLAYOFF_BEST_OF_THREE_TO_15",
    sets: [
      { awayPoints: 15, homePoints: 11, setNumber: 1 },
      { awayPoints: 10, homePoints: 15, setNumber: 2 }
    ]
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.errors.some((error) => error.code === "INVALID_PLAYOFF_WINNER"));
});

test("group: home win", () => {
  const result = validateMatchResult({
    profile: "GROUP_TIMED_MATCH",
    sets: [
      { awayPoints: 20, homePoints: 25, setNumber: 1 },
      { awayPoints: 18, homePoints: 25, setNumber: 2 }
    ]
  });

  const success = assertGroupSuccess(result);
  assert.equal(success.summary.outcome, "home_win");
  assert.equal(success.summary.home.result, "win");
});

test("group: away win", () => {
  const result = validateMatchResult({
    profile: "GROUP_TIMED_MATCH",
    sets: [
      { awayPoints: 25, homePoints: 20, setNumber: 1 },
      { awayPoints: 25, homePoints: 18, setNumber: 2 }
    ]
  });

  const success = assertGroupSuccess(result);
  assert.equal(success.summary.outcome, "away_win");
  assert.equal(success.summary.away.result, "win");
});

test("group: draw", () => {
  const result = validateMatchResult({
    profile: "GROUP_TIMED_MATCH",
    sets: [
      { awayPoints: 25, homePoints: 18, setNumber: 1 },
      { awayPoints: 16, homePoints: 25, setNumber: 2 }
    ]
  });

  const success = assertGroupSuccess(result);
  assert.equal(success.summary.outcome, "draw");
  assert.equal(success.summary.home.result, "draw");
  assert.equal(success.summary.away.result, "draw");
});

test("group: correct calculation of table points", () => {
  const winResult = validateMatchResult({
    profile: "GROUP_TIMED_MATCH",
    sets: [
      { awayPoints: 18, homePoints: 25, setNumber: 1 },
      { awayPoints: 21, homePoints: 25, setNumber: 2 }
    ]
  });

  const drawResult = validateMatchResult({
    profile: "GROUP_TIMED_MATCH",
    sets: [
      { awayPoints: 25, homePoints: 23, setNumber: 1 },
      { awayPoints: 20, homePoints: 25, setNumber: 2 }
    ]
  });

  const winSuccess = assertGroupSuccess(winResult);
  const drawSuccess = assertGroupSuccess(drawResult);
  assert.equal(winSuccess.summary.home.tablePoints, 2);
  assert.equal(winSuccess.summary.away.tablePoints, 0);
  assert.equal(drawSuccess.summary.home.tablePoints, 1);
  assert.equal(drawSuccess.summary.away.tablePoints, 1);
});

test("group: correct aggregation of sets", () => {
  const result = validateMatchResult({
    profile: "GROUP_TIMED_MATCH",
    sets: [
      { awayPoints: 21, homePoints: 25, setNumber: 1 },
      { awayPoints: 25, homePoints: 23, setNumber: 2 },
      { awayPoints: 18, homePoints: 25, setNumber: 3 }
    ]
  });

  const success = assertGroupSuccess(result);
  assert.equal(success.summary.home.setsWon, 2);
  assert.equal(success.summary.away.setsWon, 1);
  assert.equal(success.summary.totalSets, 3);
});

test("group: correct aggregation of rally points", () => {
  const result = validateMatchResult({
    profile: "GROUP_TIMED_MATCH",
    sets: [
      { awayPoints: 20, homePoints: 25, setNumber: 1 },
      { awayPoints: 25, homePoints: 23, setNumber: 2 },
      { awayPoints: 18, homePoints: 25, setNumber: 3 }
    ]
  });

  const success = assertGroupSuccess(result);
  assert.equal(success.summary.home.totalRallyPoints, 73);
  assert.equal(success.summary.away.totalRallyPoints, 63);
  assert.equal(success.summary.totalRallyPoints, 136);
});
