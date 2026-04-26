export type Profile = {
  id: string;
  email: string | null;
  firstName: string | null;
  fullName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Team = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

export type TeamRole = "owner" | "coach" | "player";

export type TeamMembershipStatus = "active" | "invited" | "inactive";

export type TeamMembership = {
  id: string;
  teamId: string;
  profileId: string;
  role: TeamRole;
  status: TeamMembershipStatus;
  joinedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MatchStatus = "scheduled" | "cancelled" | "completed";

export type Match = {
  id: string;
  teamId: string;
  opponentTeamId: string | null;
  title: string;
  startsAt: string;
  matchDate: string;
  location: string | null;
  notes: string | null;
  seasonYear: number;
  status: MatchStatus;
  homeTeamId: string;
  awayTeamId: string;
  homeSets: number | null;
  awaySets: number | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MatchResponseStatus = "available" | "unavailable" | "maybe";

export type MatchResponse = {
  id: string;
  matchId: string;
  profileId: string;
  status: MatchResponseStatus;
  note: string | null;
  respondedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type EntityInsert<T extends { id: string; createdAt: string; updatedAt: string }> =
  Omit<T, "id" | "createdAt" | "updatedAt"> & Partial<Pick<T, "id" | "createdAt" | "updatedAt">>;

export type EntityUpdate<T extends { id: string; createdAt: string; updatedAt: string }> =
  Partial<Omit<T, "id" | "createdAt" | "updatedAt">>;
