import { createAdminClient } from "@/supabase/admin";
import { getSupabaseConfig } from "@/supabase/env";
import { createClient } from "@/supabase/server";
import { formatFullName, formatSortName, splitFullName } from "@/lib/player-name";
import type { TeamMembershipStatus, TeamRole } from "@/types/entities";

export type AdminPlayerMembership = {
  id: string;
  role: TeamRole;
  status: TeamMembershipStatus;
  teamId: string;
  teamName: string;
};

export type AdminPlayer = {
  email: string | null;
  firstName: string;
  fullName: string | null;
  id: string;
  lastName: string;
  memberships: AdminPlayerMembership[];
};

type ProfileRow = {
  email: string | null;
  first_name: string | null;
  full_name: string | null;
  id: string;
  last_name: string | null;
};

type MembershipRow = {
  id: string;
  profile_id: string;
  role: TeamRole;
  status: TeamMembershipStatus;
  team_id: string;
};

type TeamRow = {
  id: string;
  name: string;
};

export async function getAdminPlayers(): Promise<{
  error: string | null;
  players: AdminPlayer[];
}> {
  const config = getSupabaseConfig();
  const supabase = config.serviceRoleKey ? createAdminClient() : await createClient();
  const [profilesResult, membershipsResult, teamsResult] = await Promise.all([
    supabase.from("profiles").select("id,email,full_name,first_name,last_name").order("last_name", { ascending: true }).order("first_name", { ascending: true }),
    supabase.from("team_memberships").select("id,profile_id,team_id,role,status"),
    supabase.from("teams").select("id,name")
  ]);

  if (profilesResult.error) {
    return { error: profilesResult.error.message, players: [] };
  }

  if (membershipsResult.error) {
    return { error: membershipsResult.error.message, players: [] };
  }

  if (teamsResult.error) {
    return { error: teamsResult.error.message, players: [] };
  }

  const teamsById = new Map(((teamsResult.data ?? []) as TeamRow[]).map((team) => [team.id, team.name]));
  const membershipsByProfileId = new Map<string, AdminPlayerMembership[]>();

  ((membershipsResult.data ?? []) as MembershipRow[]).forEach((membership) => {
    const memberships = membershipsByProfileId.get(membership.profile_id) ?? [];
    memberships.push({
      id: membership.id,
      role: membership.role,
      status: membership.status,
      teamId: membership.team_id,
      teamName: teamsById.get(membership.team_id) ?? "Unknown team"
    });
    membershipsByProfileId.set(membership.profile_id, memberships);
  });

  const players = ((profilesResult.data ?? []) as ProfileRow[])
    .map((profile) => {
      const fallbackName = splitFullName(profile.full_name);
      const firstName = profile.first_name ?? fallbackName.firstName;
      const lastName = profile.last_name ?? fallbackName.lastName;

      return {
        email: profile.email,
        firstName,
        fullName: formatFullName(firstName, lastName, profile.full_name),
        id: profile.id,
        lastName,
        memberships: membershipsByProfileId.get(profile.id) ?? []
      };
    })
    .sort((left, right) => {
      const leftLabel = formatSortName(left.firstName, left.lastName, left.email);
      const rightLabel = formatSortName(right.firstName, right.lastName, right.email);
      return leftLabel.localeCompare(rightLabel, "sk");
    });

  return { error: null, players };
}
