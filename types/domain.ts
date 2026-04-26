export type Match = {
  id: string;
  opponent: string;
  date: string;
  venue: string;
  type: "League" | "Away" | "Cup" | "Friendly";
  readiness: `${number}%`;
};

export type TeamStat = {
  label: string;
  value: string;
};

export type RecentActivity = {
  id: string;
  title: string;
  detail: string;
};

export type Player = {
  id: string;
  name: string;
  position: "OH" | "MB" | "S" | "OPP" | "L";
  points: number;
  blocks: number;
};
