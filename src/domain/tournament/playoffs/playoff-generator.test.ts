import assert from "node:assert/strict";
import test from "node:test";

import { generatePlayoffBracket, resolvePlayoffProgression } from "@/src/domain/tournament/playoffs";
import type { PlayoffProgressionMatch } from "@/src/domain/tournament/playoffs";
import type { GroupStandingsEntry } from "@/src/domain/tournament/standings";

function createStanding(groupCode: "A" | "B", position: 1 | 2 | 3 | 4 | 5): GroupStandingsEntry {
  return {
    draws: 0,
    losses: position - 1,
    played: 4,
    position,
    rallyPointDifference: 20 - position,
    rallyPointsAgainst: 50,
    rallyPointsFor: 70,
    setDifference: 4 - position,
    setsAgainst: position - 1,
    setsFor: 5 - position,
    tablePoints: 10 - position,
    teamId: `${groupCode.toLowerCase()}${position}`,
    teamName: `${groupCode}${position}`,
    wins: 5 - position
  };
}

function createGroupStandings(groupCode: "A" | "B") {
  return [1, 2, 3, 4, 5].map((position) => createStanding(groupCode, position as 1 | 2 | 3 | 4 | 5));
}

function createProgressionMatches(): PlayoffProgressionMatch[] {
  return [
    {
      awayTeamId: "b2",
      homeTeamId: "a1",
      id: "tournament-1:semifinal:1",
      phase: "semifinal",
      result: {
        sets: [
          { awayPoints: 8, homePoints: 15, setNumber: 1 },
          { awayPoints: 15, homePoints: 11, setNumber: 2 },
          { awayPoints: 10, homePoints: 15, setNumber: 3 }
        ]
      }
    },
    {
      awayTeamId: "a2",
      homeTeamId: "b1",
      id: "tournament-1:semifinal:2",
      phase: "semifinal",
      result: null
    },
    {
      awayTeamId: null,
      homeTeamId: null,
      id: "tournament-1:final",
      phase: "final",
      result: null
    },
    {
      awayTeamId: null,
      homeTeamId: null,
      id: "tournament-1:bronze",
      phase: "bronze",
      result: null
    }
  ];
}

test("generates correct semifinal pairings", () => {
  const result = generatePlayoffBracket({
    groupAStandings: createGroupStandings("A"),
    groupBStandings: createGroupStandings("B"),
    tournamentId: "tournament-1"
  });

  assert.equal(result.ok, true);
  const semifinal1 = result.matches.find((match) => match.bracketKey === "semifinal_1");
  const semifinal2 = result.matches.find((match) => match.bracketKey === "semifinal_2");

  assert.deepEqual(
    {
      semifinal1: { away: semifinal1?.awayTeamId, home: semifinal1?.homeTeamId },
      semifinal2: { away: semifinal2?.awayTeamId, home: semifinal2?.homeTeamId }
    },
    {
      semifinal1: { away: "b2", home: "a1" },
      semifinal2: { away: "a2", home: "b1" }
    }
  );
});

test("generates correct placement pairings", () => {
  const result = generatePlayoffBracket({
    groupAStandings: createGroupStandings("A"),
    groupBStandings: createGroupStandings("B"),
    tournamentId: "tournament-1"
  });

  assert.equal(result.ok, true);
  const placementMatches = result.matches.filter((match) => match.phase === "placement");

  assert.deepEqual(
    placementMatches.map((match) => ({
      away: match.awayTeamId,
      home: match.homeTeamId,
      rank: match.placementRank
    })),
    [
      { away: "b3", home: "a3", rank: 5 },
      { away: "b4", home: "a4", rank: 7 },
      { away: "b5", home: "a5", rank: 9 }
    ]
  );
});

test("generates final sources from semifinal winners", () => {
  const result = generatePlayoffBracket({
    groupAStandings: createGroupStandings("A"),
    groupBStandings: createGroupStandings("B"),
    tournamentId: "tournament-1"
  });

  assert.equal(result.ok, true);
  const finalMatch = result.matches.find((match) => match.phase === "final");

  assert.deepEqual(finalMatch?.sources, [
    { participantSlot: "home", sourceMatchId: "tournament-1:semifinal:1", sourceType: "match_winner" },
    { participantSlot: "away", sourceMatchId: "tournament-1:semifinal:2", sourceType: "match_winner" }
  ]);
});

test("generates bronze match sources from semifinal losers", () => {
  const result = generatePlayoffBracket({
    groupAStandings: createGroupStandings("A"),
    groupBStandings: createGroupStandings("B"),
    tournamentId: "tournament-1"
  });

  assert.equal(result.ok, true);
  const bronzeMatch = result.matches.find((match) => match.phase === "bronze");

  assert.deepEqual(bronzeMatch?.sources, [
    { participantSlot: "home", sourceMatchId: "tournament-1:semifinal:1", sourceType: "match_loser" },
    { participantSlot: "away", sourceMatchId: "tournament-1:semifinal:2", sourceType: "match_loser" }
  ]);
});

test("resolves progression after semifinal result", () => {
  const result = resolvePlayoffProgression({
    matches: createProgressionMatches(),
    sourceMatchId: "tournament-1:semifinal:1",
    sources: [
      {
        participantSlot: "home",
        sourceMatchId: "tournament-1:semifinal:1",
        sourceType: "match_winner",
        targetMatchId: "tournament-1:final"
      },
      {
        participantSlot: "home",
        sourceMatchId: "tournament-1:semifinal:1",
        sourceType: "match_loser",
        targetMatchId: "tournament-1:bronze"
      }
    ]
  });

  assert.equal(result.ok, true);
  const finalMatch = result.matches.find((match) => match.id === "tournament-1:final");
  const bronzeMatch = result.matches.find((match) => match.id === "tournament-1:bronze");

  assert.deepEqual(
    result.changes.map((change) => ({
      slot: change.participantSlot,
      target: change.dependentMatchId,
      teamId: change.teamId
    })),
    [
      { slot: "home", target: "tournament-1:final", teamId: "a1" },
      { slot: "home", target: "tournament-1:bronze", teamId: "b2" }
    ]
  );
  assert.equal(finalMatch?.homeTeamId, "a1");
  assert.equal(bronzeMatch?.homeTeamId, "b2");
});

test("prevents silent replacement when a corrected semifinal would affect a dependent match with result", () => {
  const matches = createProgressionMatches();
  const semifinal1 = matches.find((match) => match.id === "tournament-1:semifinal:1");
  const finalMatch = matches.find((match) => match.id === "tournament-1:final");

  if (!semifinal1 || !finalMatch) {
    throw new Error("Required fixture match is missing.");
  }

  semifinal1.result = {
    sets: [
      { awayPoints: 15, homePoints: 11, setNumber: 1 },
      { awayPoints: 15, homePoints: 13, setNumber: 2 }
    ]
  };
  finalMatch.homeTeamId = "a1";
  finalMatch.result = {
    sets: [
      { awayPoints: 10, homePoints: 15, setNumber: 1 },
      { awayPoints: 11, homePoints: 15, setNumber: 2 }
    ]
  };

  const result = resolvePlayoffProgression({
    matches,
    sourceMatchId: "tournament-1:semifinal:1",
    sources: [
      {
        participantSlot: "home",
        sourceMatchId: "tournament-1:semifinal:1",
        sourceType: "match_winner",
        targetMatchId: "tournament-1:final"
      }
    ]
  });

  assert.equal(result.ok, false);
  assert.equal(result.conflicts[0]?.code, "DEPENDENT_MATCH_RESULT_CONFLICT");
  assert.equal(result.conflicts[0]?.proposedTeamId, "b2");
});

test("progression is idempotent when the same semifinal result is applied twice", () => {
  const initial = resolvePlayoffProgression({
    matches: createProgressionMatches(),
    sourceMatchId: "tournament-1:semifinal:1",
    sources: [
      {
        participantSlot: "home",
        sourceMatchId: "tournament-1:semifinal:1",
        sourceType: "match_winner",
        targetMatchId: "tournament-1:final"
      }
    ]
  });

  assert.equal(initial.ok, true);

  const repeated = resolvePlayoffProgression({
    matches: initial.matches,
    sourceMatchId: "tournament-1:semifinal:1",
    sources: [
      {
        participantSlot: "home",
        sourceMatchId: "tournament-1:semifinal:1",
        sourceType: "match_winner",
        targetMatchId: "tournament-1:final"
      }
    ]
  });

  assert.equal(repeated.ok, true);
  assert.deepEqual(repeated.changes, []);
});

test("validates missing group positions", () => {
  const groupAStandings = createGroupStandings("A").filter((entry) => entry.position !== 5);
  const result = generatePlayoffBracket({
    groupAStandings,
    groupBStandings: createGroupStandings("B"),
    tournamentId: "tournament-1"
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.code === "MISSING_GROUP_POSITION" && error.groupCode === "A" && error.position === 5), true);
});
