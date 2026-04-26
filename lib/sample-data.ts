import type { Match, Player, RecentActivity, TeamStat } from "@/types/domain";

export const upcomingMatches: Match[] = [
  {
    id: "match-1",
    opponent: "VK Poprad",
    date: "25 Apr",
    venue: "Športová hala Tatranská Lomnica",
    type: "League",
    readiness: "82%"
  },
  {
    id: "match-2",
    opponent: "MVK Kezmarok",
    date: "02 May",
    venue: "Arena Kezmarok",
    type: "League",
    readiness: "68%"
  },
  {
    id: "match-3",
    opponent: "SK Liptovsky Hradok",
    date: "09 May",
    venue: "Domáca hala",
    type: "Cup",
    readiness: "74%"
  },
  {
    id: "match-4",
    opponent: "TJ Spisska Nova Ves",
    date: "16 May",
    venue: "Mestská športová hala",
    type: "Friendly",
    readiness: "61%"
  }
];

export const teamStats: TeamStat[] = [
  { label: "Tlak na servise", value: "77%" },
  { label: "Side-out", value: "63%" },
  { label: "Blokové dotyky", value: "31" }
];

export const recentActivities: RecentActivity[] = [
  {
    id: "activity-1",
    title: "Video príprava",
    detail: "Modely hry nahrávača proti VK Poprad sú označené na štvrtkový rozbor."
  },
  {
    id: "activity-2",
    title: "Kontrola regenerácie",
    detail: "Dvaja hráči prešli po víkendovom turnaji do ľahšieho režimu."
  },
  {
    id: "activity-3",
    title: "Poznámka z tréningu",
    detail: "Príjem podania začína v štvorčlennej rotácii."
  }
];

export const players: Player[] = [
  { id: "player-1", name: "Matus Novak", position: "OH", points: 284, blocks: 34 },
  { id: "player-2", name: "Tomas Varga", position: "MB", points: 196, blocks: 61 },
  { id: "player-3", name: "Filip Kral", position: "S", points: 88, blocks: 19 },
  { id: "player-4", name: "Adam Urban", position: "OPP", points: 242, blocks: 28 }
];
