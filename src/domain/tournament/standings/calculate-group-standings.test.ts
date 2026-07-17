import test from "node:test";
import assert from "node:assert/strict";

import { calculateGroupStandings, DEFAULT_GROUP_STANDINGS_TIE_BREAKERS } from "@/src/domain/tournament/standings";
import type { GroupStandingsInput, GroupStandingsMatch, GroupStandingsTeam } from "@/src/domain/tournament/standings";

const teams: readonly GroupStandingsTeam[] = [
  { id: "team-a", name: "Alpha" },
  { id: "team-b", name: "Beta" },
  { id: "team-c", name: "Gamma" }
];

function createMatch(match: Partial<GroupStandingsMatch> & Pick<GroupStandingsMatch, "awayTeamId" | "homeTeamId" | "id">): GroupStandingsMatch {
  return {
    isCompleted: true,
    sets: [],
    ...match
  };
}

function calculate(input: Partial<GroupStandingsInput> & Pick<GroupStandingsInput, "matches" | "teams">) {
  const result = calculateGroupStandings({
    ...input
  });

  assert.equal(result.ok, true);
  return result;
}

test("calculates a simple win/loss table", () => {
  const result = calculate({
    matches: [
      createMatch({
        awayTeamId: "team-b",
        homeTeamId: "team-a",
        id: "match-1",
        sets: [
          { awayPoints: 10, homePoints: 15, setNumber: 1 },
          { awayPoints: 8, homePoints: 15, setNumber: 2 }
        ]
      }),
      createMatch({
        awayTeamId: "team-c",
        homeTeamId: "team-a",
        id: "match-2",
        sets: [
          { awayPoints: 12, homePoints: 15, setNumber: 1 },
          { awayPoints: 9, homePoints: 15, setNumber: 2 }
        ]
      }),
      createMatch({
        awayTeamId: "team-c",
        homeTeamId: "team-b",
        id: "match-3",
        sets: [
          { awayPoints: 11, homePoints: 15, setNumber: 1 },
          { awayPoints: 12, homePoints: 15, setNumber: 2 }
        ]
      })
    ],
    teams
  });

  assert.deepEqual(
    result.entries.map((entry) => ({
      losses: entry.losses,
      played: entry.played,
      points: entry.tablePoints,
      teamId: entry.teamId,
      wins: entry.wins
    })),
    [
      { losses: 0, played: 2, points: 4, teamId: "team-a", wins: 2 },
      { losses: 1, played: 2, points: 2, teamId: "team-b", wins: 1 },
      { losses: 2, played: 2, points: 0, teamId: "team-c", wins: 0 }
    ]
  );
});

test("supports draw scoring with 2/1/0 table points", () => {
  const result = calculate({
    matches: [
      createMatch({
        awayTeamId: "team-b",
        homeTeamId: "team-a",
        id: "match-1",
        sets: [
          { awayPoints: 10, homePoints: 15, setNumber: 1 },
          { awayPoints: 15, homePoints: 10, setNumber: 2 }
        ]
      }),
      createMatch({
        awayTeamId: "team-c",
        homeTeamId: "team-a",
        id: "match-2",
        sets: [
          { awayPoints: 11, homePoints: 15, setNumber: 1 },
          { awayPoints: 10, homePoints: 15, setNumber: 2 }
        ]
      }),
      createMatch({
        awayTeamId: "team-c",
        homeTeamId: "team-b",
        id: "match-3",
        sets: [
          { awayPoints: 15, homePoints: 13, setNumber: 1 },
          { awayPoints: 9, homePoints: 15, setNumber: 2 }
        ]
      })
    ],
    teams
  });

  const alpha = result.entries.find((entry) => entry.teamId === "team-a");
  const beta = result.entries.find((entry) => entry.teamId === "team-b");
  const gamma = result.entries.find((entry) => entry.teamId === "team-c");

  assert.deepEqual(
    {
      alpha: { draws: alpha?.draws, losses: alpha?.losses, points: alpha?.tablePoints, wins: alpha?.wins },
      beta: { draws: beta?.draws, losses: beta?.losses, points: beta?.tablePoints, wins: beta?.wins },
      gamma: { draws: gamma?.draws, losses: gamma?.losses, points: gamma?.tablePoints, wins: gamma?.wins }
    },
    {
      alpha: { draws: 1, losses: 0, points: 3, wins: 1 },
      beta: { draws: 2, losses: 0, points: 2, wins: 0 },
      gamma: { draws: 1, losses: 1, points: 1, wins: 0 }
    }
  );
});

test("uses set difference as a tie-breaker", () => {
  const result = calculate({
    matches: [
      createMatch({
        awayTeamId: "team-b",
        homeTeamId: "team-a",
        id: "match-1",
        sets: [
          { awayPoints: 8, homePoints: 15, setNumber: 1 },
          { awayPoints: 11, homePoints: 15, setNumber: 2 }
        ]
      }),
      createMatch({
        awayTeamId: "team-c",
        homeTeamId: "team-a",
        id: "match-2",
        sets: [
          { awayPoints: 15, homePoints: 10, setNumber: 1 },
          { awayPoints: 15, homePoints: 12, setNumber: 2 }
        ]
      }),
      createMatch({
        awayTeamId: "team-c",
        homeTeamId: "team-b",
        id: "match-3",
        sets: [
          { awayPoints: 7, homePoints: 15, setNumber: 1 },
          { awayPoints: 12, homePoints: 15, setNumber: 2 }
        ]
      })
    ],
    teams
  });

  assert.deepEqual(result.entries.map((entry) => entry.teamId), ["team-a", "team-b", "team-c"]);
  assert.equal(result.entries[0].setDifference, 0);
  assert.equal(result.entries[1].setDifference, 0);
  assert.equal(result.entries[2].setDifference, 0);
});

test("uses sets won as a tie-breaker after set difference", () => {
  const result = calculate({
    matches: [
      createMatch({
        awayTeamId: "team-b",
        homeTeamId: "team-a",
        id: "match-1",
        sets: [
          { awayPoints: 10, homePoints: 15, setNumber: 1 },
          { awayPoints: 15, homePoints: 8, setNumber: 2 }
        ]
      }),
      createMatch({
        awayTeamId: "team-c",
        homeTeamId: "team-a",
        id: "match-2",
        sets: [
          { awayPoints: 15, homePoints: 13, setNumber: 1 },
          { awayPoints: 15, homePoints: 11, setNumber: 2 }
        ]
      }),
      createMatch({
        awayTeamId: "team-c",
        homeTeamId: "team-b",
        id: "match-3",
        sets: [
          { awayPoints: 15, homePoints: 13, setNumber: 1 },
          { awayPoints: 12, homePoints: 15, setNumber: 2 },
          { awayPoints: 15, homePoints: 10, setNumber: 3 },
          { awayPoints: 15, homePoints: 9, setNumber: 4 }
        ]
      })
    ],
    teams
  });

  assert.deepEqual(result.entries.map((entry) => entry.teamId), ["team-c", "team-b", "team-a"]);
  assert.equal(result.entries[1].setDifference, -2);
  assert.equal(result.entries[2].setDifference, -2);
  assert.equal(result.entries[1].setsFor, 2);
  assert.equal(result.entries[2].setsFor, 1);
});

test("uses rally point difference as a tie-breaker after sets won", () => {
  const result = calculate({
    matches: [
      createMatch({
        awayTeamId: "team-b",
        homeTeamId: "team-a",
        id: "match-1",
        sets: [
          { awayPoints: 10, homePoints: 15, setNumber: 1 },
          { awayPoints: 15, homePoints: 8, setNumber: 2 }
        ]
      }),
      createMatch({
        awayTeamId: "team-c",
        homeTeamId: "team-a",
        id: "match-2",
        sets: [
          { awayPoints: 15, homePoints: 13, setNumber: 1 },
          { awayPoints: 15, homePoints: 13, setNumber: 2 }
        ]
      }),
      createMatch({
        awayTeamId: "team-c",
        homeTeamId: "team-b",
        id: "match-3",
        sets: [
          { awayPoints: 15, homePoints: 5, setNumber: 1 },
          { awayPoints: 15, homePoints: 5, setNumber: 2 }
        ]
      })
    ],
    teams
  });

  assert.deepEqual(result.entries.map((entry) => entry.teamId), ["team-c", "team-a", "team-b"]);
  assert.equal(result.entries[1].setsFor, 1);
  assert.equal(result.entries[2].setsFor, 1);
  assert.equal(result.entries[1].rallyPointDifference, -6);
  assert.equal(result.entries[2].rallyPointDifference, -18);
});

test("uses head-to-head result as a tie-breaker", () => {
  const result = calculate({
    matches: [
      createMatch({
        awayTeamId: "team-b",
        homeTeamId: "team-a",
        id: "match-1",
        sets: [
          { awayPoints: 15, homePoints: 10, setNumber: 1 },
          { awayPoints: 15, homePoints: 10, setNumber: 2 }
        ]
      }),
      createMatch({
        awayTeamId: "team-c",
        homeTeamId: "team-a",
        id: "match-2",
        sets: [
          { awayPoints: 10, homePoints: 15, setNumber: 1 },
          { awayPoints: 10, homePoints: 15, setNumber: 2 }
        ]
      }),
      createMatch({
        awayTeamId: "team-c",
        homeTeamId: "team-b",
        id: "match-3",
        sets: [
          { awayPoints: 15, homePoints: 10, setNumber: 1 },
          { awayPoints: 15, homePoints: 10, setNumber: 2 }
        ]
      }),
      createMatch({
        awayTeamId: "team-d",
        homeTeamId: "team-a",
        id: "match-4",
        sets: [
          { awayPoints: 10, homePoints: 15, setNumber: 1 },
          { awayPoints: 15, homePoints: 10, setNumber: 2 }
        ]
      }),
      createMatch({
        awayTeamId: "team-d",
        homeTeamId: "team-b",
        id: "match-5",
        sets: [
          { awayPoints: 10, homePoints: 15, setNumber: 1 },
          { awayPoints: 15, homePoints: 10, setNumber: 2 }
        ]
      }),
      createMatch({
        awayTeamId: "team-d",
        homeTeamId: "team-c",
        id: "match-6",
        sets: [
          { awayPoints: 10, homePoints: 15, setNumber: 1 },
          { awayPoints: 10, homePoints: 15, setNumber: 2 }
        ]
      })
    ],
    teams: [...teams, { id: "team-d", name: "Delta" }]
  });

  assert.deepEqual(result.entries.map((entry) => entry.teamId), ["team-c", "team-b", "team-a", "team-d"]);
  assert.equal(result.entries[1].tablePoints, result.entries[2].tablePoints);
  assert.equal(result.entries[1].setDifference, result.entries[2].setDifference);
  assert.equal(result.entries[1].setsFor, result.entries[2].setsFor);
  assert.equal(result.entries[1].rallyPointDifference, result.entries[2].rallyPointDifference);
  assert.equal(result.entries[1].rallyPointsFor, result.entries[2].rallyPointsFor);
});

test("excludes incomplete matches from the table", () => {
  const result = calculate({
    matches: [
      createMatch({
        awayTeamId: "team-b",
        homeTeamId: "team-a",
        id: "match-1",
        isCompleted: false,
        sets: [
          { awayPoints: 10, homePoints: 15, setNumber: 1 },
          { awayPoints: 8, homePoints: 15, setNumber: 2 }
        ]
      }),
      createMatch({
        awayTeamId: "team-c",
        homeTeamId: "team-a",
        id: "match-2",
        sets: [
          { awayPoints: 11, homePoints: 15, setNumber: 1 },
          { awayPoints: 10, homePoints: 15, setNumber: 2 }
        ]
      })
    ],
    teams
  });

  const alpha = result.entries.find((entry) => entry.teamId === "team-a");
  const beta = result.entries.find((entry) => entry.teamId === "team-b");

  assert.equal(alpha?.played, 1);
  assert.equal(beta?.played, 0);
});

test("falls back to stable team ordering when all sporting criteria are equal", () => {
  const equalTeams: readonly GroupStandingsTeam[] = [
    { id: "team-z", name: "Zeta" },
    { id: "team-a", name: "Alpha" }
  ];

  const result = calculate({
    matches: [
      createMatch({
        awayTeamId: "team-a",
        homeTeamId: "team-z",
        id: "match-1",
        sets: [
          { awayPoints: 12, homePoints: 15, setNumber: 1 },
          { awayPoints: 15, homePoints: 12, setNumber: 2 }
        ]
      })
    ],
    teams: equalTeams
  });

  assert.deepEqual(result.config.tieBreakers, DEFAULT_GROUP_STANDINGS_TIE_BREAKERS);
  assert.deepEqual(result.entries.map((entry) => entry.teamId), ["team-a", "team-z"]);
});

test("does not mutate input data", () => {
  const mutableTeams: GroupStandingsTeam[] = [
    { id: "team-b", name: "Beta" },
    { id: "team-a", name: "Alpha" }
  ];
  const mutableMatches: GroupStandingsMatch[] = [
    createMatch({
      awayTeamId: "team-a",
      homeTeamId: "team-b",
      id: "match-1",
      sets: [
        { awayPoints: 15, homePoints: 12, setNumber: 2 },
        { awayPoints: 10, homePoints: 15, setNumber: 1 }
      ]
    })
  ];

  const teamsSnapshot = structuredClone(mutableTeams);
  const matchesSnapshot = structuredClone(mutableMatches);

  calculate({
    matches: mutableMatches,
    teams: mutableTeams
  });

  assert.deepEqual(mutableTeams, teamsSnapshot);
  assert.deepEqual(mutableMatches, matchesSnapshot);
});
