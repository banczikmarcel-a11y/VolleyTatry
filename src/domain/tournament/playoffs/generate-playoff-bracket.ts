import type { GroupStandingsEntry } from "@/src/domain/tournament/standings";
import type {
  PlayoffGenerationError,
  PlayoffGenerationInput,
  PlayoffGenerationResult,
  PlayoffGroupCode,
  PlayoffMatchDefinition,
  PlayoffMatchSource
} from "@/src/domain/tournament/playoffs/types";

const REQUIRED_GROUP_POSITIONS = [1, 2, 3, 4, 5] as const;

function makeError(code: PlayoffGenerationError["code"], groupCode: PlayoffGroupCode, message: string, position?: number): PlayoffGenerationError {
  return {
    code,
    groupCode,
    message,
    position
  };
}

function validateStandings(groupCode: PlayoffGroupCode, standings: readonly GroupStandingsEntry[]) {
  const errors: PlayoffGenerationError[] = [];
  const seen = new Set<number>();

  standings.forEach((entry) => {
    if (entry.position < 1 || entry.position > 5) {
      return;
    }

    if (seen.has(entry.position)) {
      errors.push(
        makeError(
          "DUPLICATE_GROUP_POSITION",
          groupCode,
          `Group ${groupCode} contains duplicate position ${entry.position}.`,
          entry.position
        )
      );
      return;
    }

    seen.add(entry.position);
  });

  REQUIRED_GROUP_POSITIONS.forEach((position) => {
    if (!seen.has(position)) {
      errors.push(
        makeError("MISSING_GROUP_POSITION", groupCode, `Group ${groupCode} is missing position ${position}.`, position)
      );
    }
  });

  if (standings.length !== REQUIRED_GROUP_POSITIONS.length) {
    errors.push(
      makeError(
        "UNEXPECTED_GROUP_SIZE",
        groupCode,
        `Group ${groupCode} must contain exactly ${REQUIRED_GROUP_POSITIONS.length} positioned teams.`
      )
    );
  }

  return errors;
}

function getTeamIdByPosition(standings: readonly GroupStandingsEntry[], position: number) {
  return standings.find((entry) => entry.position === position)?.teamId ?? null;
}

function createGroupPositionSource(groupCode: PlayoffGroupCode, groupPosition: number, participantSlot: "away" | "home"): PlayoffMatchSource {
  return {
    groupCode,
    groupPosition,
    participantSlot,
    sourceType: "group_position"
  };
}

function createPlayoffMatch(definition: Omit<PlayoffMatchDefinition, "ruleProfile">): PlayoffMatchDefinition {
  return {
    ...definition,
    ruleProfile: "PLAYOFF_BEST_OF_THREE_TO_15"
  };
}

export function generatePlayoffBracket(input: PlayoffGenerationInput): PlayoffGenerationResult {
  const errors = [...validateStandings("A", input.groupAStandings), ...validateStandings("B", input.groupBStandings)];

  if (errors.length > 0) {
    return {
      errors,
      ok: false
    };
  }

  const semifinal1Id = `${input.tournamentId}:semifinal:1`;
  const semifinal2Id = `${input.tournamentId}:semifinal:2`;

  const matches: PlayoffMatchDefinition[] = [
    createPlayoffMatch({
      awayTeamId: getTeamIdByPosition(input.groupBStandings, 2),
      bracketKey: "semifinal_1",
      homeTeamId: getTeamIdByPosition(input.groupAStandings, 1),
      id: semifinal1Id,
      label: "Semifinále 1",
      phase: "semifinal",
      placementRank: null,
      roundNumber: 1,
      slotNumber: 1,
      sources: [createGroupPositionSource("A", 1, "home"), createGroupPositionSource("B", 2, "away")],
      tournamentId: input.tournamentId
    }),
    createPlayoffMatch({
      awayTeamId: getTeamIdByPosition(input.groupAStandings, 2),
      bracketKey: "semifinal_2",
      homeTeamId: getTeamIdByPosition(input.groupBStandings, 1),
      id: semifinal2Id,
      label: "Semifinále 2",
      phase: "semifinal",
      placementRank: null,
      roundNumber: 1,
      slotNumber: 2,
      sources: [createGroupPositionSource("B", 1, "home"), createGroupPositionSource("A", 2, "away")],
      tournamentId: input.tournamentId
    }),
    createPlayoffMatch({
      awayTeamId: getTeamIdByPosition(input.groupBStandings, 3),
      bracketKey: "placement_5",
      homeTeamId: getTeamIdByPosition(input.groupAStandings, 3),
      id: `${input.tournamentId}:placement:5`,
      label: "O 5. miesto",
      phase: "placement",
      placementRank: 5,
      roundNumber: 1,
      slotNumber: 3,
      sources: [createGroupPositionSource("A", 3, "home"), createGroupPositionSource("B", 3, "away")],
      tournamentId: input.tournamentId
    }),
    createPlayoffMatch({
      awayTeamId: getTeamIdByPosition(input.groupBStandings, 4),
      bracketKey: "placement_7",
      homeTeamId: getTeamIdByPosition(input.groupAStandings, 4),
      id: `${input.tournamentId}:placement:7`,
      label: "O 7. miesto",
      phase: "placement",
      placementRank: 7,
      roundNumber: 1,
      slotNumber: 4,
      sources: [createGroupPositionSource("A", 4, "home"), createGroupPositionSource("B", 4, "away")],
      tournamentId: input.tournamentId
    }),
    createPlayoffMatch({
      awayTeamId: getTeamIdByPosition(input.groupBStandings, 5),
      bracketKey: "placement_9",
      homeTeamId: getTeamIdByPosition(input.groupAStandings, 5),
      id: `${input.tournamentId}:placement:9`,
      label: "O 9. miesto",
      phase: "placement",
      placementRank: 9,
      roundNumber: 1,
      slotNumber: 5,
      sources: [createGroupPositionSource("A", 5, "home"), createGroupPositionSource("B", 5, "away")],
      tournamentId: input.tournamentId
    }),
    createPlayoffMatch({
      awayTeamId: null,
      bracketKey: "bronze",
      homeTeamId: null,
      id: `${input.tournamentId}:bronze`,
      label: "O 3. miesto",
      phase: "bronze",
      placementRank: 3,
      roundNumber: 2,
      slotNumber: 1,
      sources: [
        { participantSlot: "home", sourceMatchId: semifinal1Id, sourceType: "match_loser" },
        { participantSlot: "away", sourceMatchId: semifinal2Id, sourceType: "match_loser" }
      ],
      tournamentId: input.tournamentId
    }),
    createPlayoffMatch({
      awayTeamId: null,
      bracketKey: "final",
      homeTeamId: null,
      id: `${input.tournamentId}:final`,
      label: "Finále",
      phase: "final",
      placementRank: null,
      roundNumber: 2,
      slotNumber: 2,
      sources: [
        { participantSlot: "home", sourceMatchId: semifinal1Id, sourceType: "match_winner" },
        { participantSlot: "away", sourceMatchId: semifinal2Id, sourceType: "match_winner" }
      ],
      tournamentId: input.tournamentId
    })
  ];

  return {
    matches,
    ok: true
  };
}
