export type MatchRuleProfile = "GROUP_TIMED_MATCH" | "PLAYOFF_BEST_OF_THREE_TO_15";

export type MatchOutcome = "away_win" | "draw" | "home_win";

export type MatchValidationErrorCode =
  | "DRAW_NOT_ALLOWED"
  | "EMPTY_SETS"
  | "EXTRA_SET_AFTER_WINNER_DECIDED"
  | "FOURTH_SET_NOT_ALLOWED"
  | "INVALID_COMPLETED_SET_COUNT"
  | "INVALID_PLAYOFF_WINNER"
  | "LOSING_SCORE_BELOW_TARGET"
  | "NEGATIVE_SCORE"
  | "SET_DRAW_NOT_ALLOWED"
  | "SET_MARGIN_TOO_SMALL"
  | "WINNER_SCORE_BELOW_TARGET";

export type MatchValidationError = {
  code: MatchValidationErrorCode;
  message: string;
  setNumber?: number;
};

export type MatchSetInput = {
  awayPoints: number;
  homePoints: number;
  setNumber: number;
};

export type MatchValidatedSet = MatchSetInput & {
  winner: "away" | "home";
};

export type MatchValidationInput = {
  profile: MatchRuleProfile;
  sets: MatchSetInput[];
};

export type GroupMatchSummary = {
  away: {
    result: "loss" | "draw" | "win";
    setsWon: number;
    tablePoints: number;
    totalRallyPoints: number;
  };
  home: {
    result: "loss" | "draw" | "win";
    setsWon: number;
    tablePoints: number;
    totalRallyPoints: number;
  };
  outcome: MatchOutcome;
  totalRallyPoints: number;
  totalSets: number;
};

export type PlayoffMatchSummary = {
  away: {
    isWinner: boolean;
    setsWon: number;
    totalRallyPoints: number;
  };
  home: {
    isWinner: boolean;
    setsWon: number;
    totalRallyPoints: number;
  };
  loser: "away" | "home";
  outcome: Exclude<MatchOutcome, "draw">;
  totalRallyPoints: number;
  totalSets: number;
  winner: "away" | "home";
};

export type MatchValidationSuccess =
  | {
      ok: true;
      profile: "GROUP_TIMED_MATCH";
      sets: MatchValidatedSet[];
      summary: GroupMatchSummary;
    }
  | {
      ok: true;
      profile: "PLAYOFF_BEST_OF_THREE_TO_15";
      sets: MatchValidatedSet[];
      summary: PlayoffMatchSummary;
    };

export type MatchValidationFailure = {
  errors: MatchValidationError[];
  ok: false;
  profile: MatchRuleProfile;
};

export type MatchValidationResult = MatchValidationSuccess | MatchValidationFailure;
