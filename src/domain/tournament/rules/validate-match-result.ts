import { getRuleProfile } from "@/src/domain/tournament/rules/profiles";
import type {
  GroupMatchSummary,
  MatchOutcome,
  MatchSetInput,
  MatchValidatedSet,
  MatchValidationError,
  MatchValidationInput,
  MatchValidationResult,
  PlayoffMatchSummary
} from "@/src/domain/tournament/rules/types";

function makeError(code: MatchValidationError["code"], message: string, setNumber?: number): MatchValidationError {
  return { code, message, setNumber };
}

function normalizeSets(sets: MatchSetInput[]) {
  return [...sets].sort((left, right) => left.setNumber - right.setNumber);
}

function validateGroupScores(sets: MatchSetInput[]) {
  const errors: MatchValidationError[] = [];
  const validatedSets: MatchValidatedSet[] = [];

  if (sets.length === 0) {
    errors.push(makeError("EMPTY_SETS", "At least one completed score entry is required."));
    return { errors, sets: validatedSets };
  }

  normalizeSets(sets).forEach((set) => {
    if (set.homePoints < 0 || set.awayPoints < 0) {
      errors.push(makeError("NEGATIVE_SCORE", "Scores must be zero or greater.", set.setNumber));
      return;
    }

    validatedSets.push({
      ...set,
      winner: set.homePoints > set.awayPoints ? "home" : "away"
    });
  });

  return { errors, sets: validatedSets };
}

function validatePlayoffBaseSets(sets: MatchSetInput[]) {
  const errors: MatchValidationError[] = [];
  const validatedSets: MatchValidatedSet[] = [];

  if (sets.length === 0) {
    errors.push(makeError("EMPTY_SETS", "At least one completed set is required."));
    return { errors, sets: validatedSets };
  }

  normalizeSets(sets).forEach((set) => {
    if (set.homePoints < 0 || set.awayPoints < 0) {
      errors.push(makeError("NEGATIVE_SCORE", "Set scores must be zero or greater.", set.setNumber));
      return;
    }

    if (set.homePoints === set.awayPoints) {
      errors.push(makeError("SET_DRAW_NOT_ALLOWED", "A completed set must have exactly one winner.", set.setNumber));
      return;
    }

    validatedSets.push({
      ...set,
      winner: set.homePoints > set.awayPoints ? "home" : "away"
    });
  });

  return { errors, sets: validatedSets };
}

function buildOutcome(homeSetsWon: number, awaySetsWon: number): MatchOutcome {
  if (homeSetsWon > awaySetsWon) {
    return "home_win";
  }

  if (awaySetsWon > homeSetsWon) {
    return "away_win";
  }

  return "draw";
}

function buildGroupSummary(validatedSets: MatchValidatedSet[]): GroupMatchSummary {
  const homeSetsWon = validatedSets.filter((set) => set.winner === "home").length;
  const awaySetsWon = validatedSets.length - homeSetsWon;
  const homeTotalRallyPoints = validatedSets.reduce((total, set) => total + set.homePoints, 0);
  const awayTotalRallyPoints = validatedSets.reduce((total, set) => total + set.awayPoints, 0);
  const outcome =
    homeTotalRallyPoints > awayTotalRallyPoints
      ? "home_win"
      : awayTotalRallyPoints > homeTotalRallyPoints
        ? "away_win"
        : "draw";

  return {
    away: {
      result: outcome === "away_win" ? "win" : outcome === "draw" ? "draw" : "loss",
      setsWon: awaySetsWon,
      tablePoints: outcome === "away_win" ? 2 : outcome === "draw" ? 1 : 0,
      totalRallyPoints: awayTotalRallyPoints
    },
    home: {
      result: outcome === "home_win" ? "win" : outcome === "draw" ? "draw" : "loss",
      setsWon: homeSetsWon,
      tablePoints: outcome === "home_win" ? 2 : outcome === "draw" ? 1 : 0,
      totalRallyPoints: homeTotalRallyPoints
    },
    outcome,
    totalRallyPoints: homeTotalRallyPoints + awayTotalRallyPoints,
    totalSets: validatedSets.length
  };
}

function validatePlayoffSets(validatedSets: MatchValidatedSet[]) {
  const config = getRuleProfile("PLAYOFF_BEST_OF_THREE_TO_15");
  const errors: MatchValidationError[] = [];
  let homeSetsWon = 0;
  let awaySetsWon = 0;

  if (validatedSets.length < (config.minCompletedSets ?? 2) || validatedSets.length > (config.maxSets ?? 3)) {
    errors.push(
      makeError(
        "INVALID_COMPLETED_SET_COUNT",
        `Playoff matches require between ${config.minCompletedSets ?? 2} and ${config.maxSets ?? 3} completed sets.`
      )
    );
  }

  validatedSets.forEach((set, index) => {
    const winnerPoints = Math.max(set.homePoints, set.awayPoints);
    const loserPoints = Math.min(set.homePoints, set.awayPoints);
    const setNumber = set.setNumber;

    if (winnerPoints < (config.setTargetPoints ?? 15)) {
      errors.push(
        makeError(
          "WINNER_SCORE_BELOW_TARGET",
          `Set winner must reach at least ${config.setTargetPoints ?? 15} points.`,
          setNumber
        )
      );
    }

    if (loserPoints > winnerPoints - (config.winningMargin ?? 2)) {
      errors.push(
        makeError(
          "SET_MARGIN_TOO_SMALL",
          `Set winner must lead by at least ${config.winningMargin ?? 2} points.`,
          setNumber
        )
      );
    }

    if (winnerPoints === (config.setTargetPoints ?? 15) && loserPoints > winnerPoints - (config.winningMargin ?? 2)) {
      errors.push(
        makeError(
          "LOSING_SCORE_BELOW_TARGET",
          `A ${winnerPoints}:${loserPoints} set score is invalid for playoff rules.`,
          setNumber
        )
      );
    }

    if (set.winner === "home") {
      homeSetsWon += 1;
    } else {
      awaySetsWon += 1;
    }

    if (index < validatedSets.length - 1 && (homeSetsWon === (config.setsToWin ?? 2) || awaySetsWon === (config.setsToWin ?? 2))) {
      errors.push(
        makeError(
          validatedSets.length > (index + 1) + 1 ? "FOURTH_SET_NOT_ALLOWED" : "EXTRA_SET_AFTER_WINNER_DECIDED",
          "No extra set is allowed after a team has already won the match.",
          validatedSets[index + 1].setNumber
        )
      );
    }
  });

  if (homeSetsWon === awaySetsWon) {
    errors.push(makeError("DRAW_NOT_ALLOWED", "Playoff match cannot end in a draw."));
  }

  if (homeSetsWon !== (config.setsToWin ?? 2) && awaySetsWon !== (config.setsToWin ?? 2)) {
    errors.push(makeError("INVALID_PLAYOFF_WINNER", `One team must win exactly ${config.setsToWin ?? 2} sets.`));
  }

  if (homeSetsWon > (config.setsToWin ?? 2) || awaySetsWon > (config.setsToWin ?? 2)) {
    errors.push(makeError("INVALID_PLAYOFF_WINNER", `No team may win more than ${config.setsToWin ?? 2} sets.`));
  }

  return { awaySetsWon, errors, homeSetsWon };
}

function buildPlayoffSummary(validatedSets: MatchValidatedSet[], homeSetsWon: number, awaySetsWon: number): PlayoffMatchSummary {
  const homeTotalRallyPoints = validatedSets.reduce((total, set) => total + set.homePoints, 0);
  const awayTotalRallyPoints = validatedSets.reduce((total, set) => total + set.awayPoints, 0);
  const winner = homeSetsWon > awaySetsWon ? "home" : "away";
  const loser = winner === "home" ? "away" : "home";

  return {
    away: {
      isWinner: winner === "away",
      setsWon: awaySetsWon,
      totalRallyPoints: awayTotalRallyPoints
    },
    home: {
      isWinner: winner === "home",
      setsWon: homeSetsWon,
      totalRallyPoints: homeTotalRallyPoints
    },
    loser,
    outcome: winner === "home" ? "home_win" : "away_win",
    totalRallyPoints: homeTotalRallyPoints + awayTotalRallyPoints,
    totalSets: validatedSets.length,
    winner
  };
}

export function validateMatchResult(input: MatchValidationInput): MatchValidationResult {
  const profile = getRuleProfile(input.profile);

  if (profile.kind === "group") {
    const groupValidation = validateGroupScores(input.sets);

    if (groupValidation.errors.length > 0) {
      return {
        errors: groupValidation.errors,
        ok: false,
        profile: input.profile
      };
    }

    return {
      ok: true,
      profile: "GROUP_TIMED_MATCH",
      sets: groupValidation.sets,
      summary: buildGroupSummary(groupValidation.sets)
    };
  }

  const baseValidation = validatePlayoffBaseSets(input.sets);

  if (baseValidation.errors.length > 0) {
    return {
      errors: baseValidation.errors,
      ok: false,
      profile: input.profile
    };
  }

  const playoffValidation = validatePlayoffSets(baseValidation.sets);

  if (playoffValidation.errors.length > 0) {
    return {
      errors: playoffValidation.errors,
      ok: false,
      profile: input.profile
    };
  }

  return {
    ok: true,
    profile: "PLAYOFF_BEST_OF_THREE_TO_15",
    sets: baseValidation.sets,
    summary: buildPlayoffSummary(baseValidation.sets, playoffValidation.homeSetsWon, playoffValidation.awaySetsWon)
  };
}
