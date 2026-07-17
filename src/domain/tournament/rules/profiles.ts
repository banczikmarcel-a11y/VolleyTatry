import type { MatchRuleProfile } from "@/src/domain/tournament/rules/types";

export type RuleProfileConfig = {
  allowsDraw: boolean;
  code: MatchRuleProfile;
  kind: "group" | "playoff";
  maxSets?: number;
  minCompletedSets?: number;
  setTargetPoints?: number;
  setsToWin?: number;
  tablePoints?: {
    draw: number;
    loss: number;
    win: number;
  };
  winningMargin?: number;
};

export const RULE_PROFILES: Record<MatchRuleProfile, RuleProfileConfig> = {
  GROUP_TIMED_MATCH: {
    allowsDraw: true,
    code: "GROUP_TIMED_MATCH",
    kind: "group",
    tablePoints: {
      draw: 1,
      loss: 0,
      win: 2
    }
  },
  PLAYOFF_BEST_OF_THREE_TO_15: {
    allowsDraw: false,
    code: "PLAYOFF_BEST_OF_THREE_TO_15",
    kind: "playoff",
    maxSets: 3,
    minCompletedSets: 2,
    setTargetPoints: 15,
    setsToWin: 2,
    winningMargin: 2
  }
};

export function getRuleProfile(profile: MatchRuleProfile) {
  return RULE_PROFILES[profile];
}
