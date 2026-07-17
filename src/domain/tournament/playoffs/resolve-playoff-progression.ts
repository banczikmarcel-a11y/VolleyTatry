import { validateMatchResult } from "@/src/domain/tournament/rules";
import type {
  PlayoffProgressionChange,
  PlayoffProgressionConflict,
  PlayoffProgressionInput,
  PlayoffProgressionMatch,
  PlayoffProgressionResult
} from "@/src/domain/tournament/playoffs/types";

function cloneMatch(match: PlayoffProgressionMatch): PlayoffProgressionMatch {
  return {
    ...match,
    result: match.result ? { sets: [...match.result.sets] } : match.result ?? null
  };
}

function hasRecordedResult(match: PlayoffProgressionMatch) {
  return Boolean(match.result && match.result.sets.length > 0);
}

function makeConflict(conflict: PlayoffProgressionConflict): PlayoffProgressionConflict {
  return conflict;
}

function buildResolvedTeamIds(sourceMatch: PlayoffProgressionMatch) {
  const validationResult = validateMatchResult({
    profile: "PLAYOFF_BEST_OF_THREE_TO_15",
    sets: [...(sourceMatch.result?.sets ?? [])]
  });

  if (!validationResult.ok) {
    return {
      errors: validationResult.errors,
      ok: false as const
    };
  }

  if (validationResult.profile !== "PLAYOFF_BEST_OF_THREE_TO_15") {
    return {
      errors: [],
      ok: false as const
    };
  }

  const winnerTeamId = validationResult.summary.winner === "home" ? sourceMatch.homeTeamId : sourceMatch.awayTeamId;
  const loserTeamId = validationResult.summary.loser === "home" ? sourceMatch.homeTeamId : sourceMatch.awayTeamId;

  return {
    loserTeamId,
    ok: true as const,
    winnerTeamId
  };
}

export function resolvePlayoffProgression(input: PlayoffProgressionInput): PlayoffProgressionResult {
  const matches = input.matches.map(cloneMatch);
  const sourceMatch = matches.find((match) => match.id === input.sourceMatchId);

  if (!sourceMatch) {
    return {
      changes: [],
      conflicts: [
        makeConflict({
          code: "INVALID_SOURCE_MATCH_RESULT",
          matchId: input.sourceMatchId,
          message: `Source match '${input.sourceMatchId}' was not found.`
        })
      ],
      matches,
      ok: false
    };
  }

  const resolved = buildResolvedTeamIds(sourceMatch);

  if (!resolved.ok || !resolved.winnerTeamId || !resolved.loserTeamId) {
    return {
      changes: [],
      conflicts: [
        makeConflict({
          code: "INVALID_SOURCE_MATCH_RESULT",
          matchId: input.sourceMatchId,
          message: `Source match '${input.sourceMatchId}' does not yet contain a valid playoff result.`,
          validationErrors: resolved.ok ? undefined : resolved.errors
        })
      ],
      matches,
      ok: false
    };
  }

  const conflicts: PlayoffProgressionConflict[] = [];
  const changes: PlayoffProgressionChange[] = [];

  input.sources
    .filter((source) => source.sourceMatchId === input.sourceMatchId)
    .forEach((source) => {
      const dependentMatch = matches.find((match) => match.id === source.targetMatchId);

      if (!dependentMatch) {
        return;
      }

      const resolvedTeamId = source.sourceType === "match_winner" ? resolved.winnerTeamId : resolved.loserTeamId;
      const currentTeamId = source.participantSlot === "home" ? dependentMatch.homeTeamId : dependentMatch.awayTeamId;

      if (currentTeamId === resolvedTeamId) {
        return;
      }

      if (hasRecordedResult(dependentMatch)) {
        conflicts.push(
          makeConflict({
            code: "DEPENDENT_MATCH_RESULT_CONFLICT",
            dependentMatchId: dependentMatch.id,
            matchId: input.sourceMatchId,
            message: `Dependent match '${dependentMatch.id}' already has a result and cannot be silently updated.`,
            participantSlot: source.participantSlot,
            proposedTeamId: resolvedTeamId ?? undefined
          })
        );
        return;
      }

      changes.push({
        dependentMatchId: dependentMatch.id,
        participantSlot: source.participantSlot,
        previousTeamId: currentTeamId,
        teamId: resolvedTeamId
      });

      if (source.participantSlot === "home") {
        dependentMatch.homeTeamId = resolvedTeamId;
      } else {
        dependentMatch.awayTeamId = resolvedTeamId;
      }
    });

  if (conflicts.length > 0) {
    return {
      changes,
      conflicts,
      matches,
      ok: false
    };
  }

  return {
    changes,
    conflicts: [],
    matches,
    ok: true
  };
}
