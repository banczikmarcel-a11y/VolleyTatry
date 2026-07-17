import type { GroupStandingsConfig, GroupStandingsTieBreakerKey } from "@/src/domain/tournament/standings/types";

export const DEFAULT_GROUP_STANDINGS_TIE_BREAKERS = [
  "table_points",
  "set_difference",
  "sets_won",
  "rally_point_difference",
  "rally_points_won",
  "head_to_head_result",
  "stable_fallback"
] as const satisfies readonly GroupStandingsTieBreakerKey[];

export const DEFAULT_GROUP_STANDINGS_CONFIG: GroupStandingsConfig = {
  tieBreakers: DEFAULT_GROUP_STANDINGS_TIE_BREAKERS
};

export function resolveGroupStandingsConfig(config?: Partial<GroupStandingsConfig>): GroupStandingsConfig {
  return {
    tieBreakers: config?.tieBreakers ?? DEFAULT_GROUP_STANDINGS_CONFIG.tieBreakers
  };
}
