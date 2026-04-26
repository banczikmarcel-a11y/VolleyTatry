import { savePlayerRole } from "@/app/admin/players/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AdminPlayer } from "@/lib/admin-players";
import type { Team } from "@/types/entities";

type PlayerRoleCardProps = {
  player: AdminPlayer;
  teams: Pick<Team, "id" | "name" | "slug">[];
};

function getInitials(player: AdminPlayer) {
  const label = player.fullName || player.email || "?";
  return label
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function PlayerRoleCard({ player, teams }: PlayerRoleCardProps) {
  const primaryMembership = player.memberships[0];

  return (
    <Card as="article" className="space-y-5">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] bg-court-ink text-sm font-black text-court-mint">
          {getInitials(player)}
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-xl font-black text-court-ink">{player.fullName || "Bez mena"}</h2>
          <p className="truncate text-sm font-bold text-court-blue">{player.email ?? "Bez emailu"}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {player.memberships.length > 0 ? (
              player.memberships.map((membership) => (
                <Badge key={membership.id} tone={membership.role === "player" ? "neutral" : "mint"}>
                  {membership.teamName} · {membership.role} · {membership.status}
                </Badge>
              ))
            ) : (
              <Badge tone="coral">bez timu</Badge>
            )}
          </div>
        </div>
      </div>

      <form action={savePlayerRole} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="profile_id" value={player.id} />

        <label className="block">
          <span className="text-sm font-bold text-court-ink">Tim</span>
          <select
            name="team_id"
            defaultValue={primaryMembership?.teamId ?? teams[0]?.id ?? ""}
            className="focus-ring mt-2 w-full rounded-[8px] border border-court-line bg-white px-3 py-3 text-sm text-court-ink"
            required
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-bold text-court-ink">Rola</span>
          <select
            name="role"
            defaultValue={primaryMembership?.role ?? "player"}
            className="focus-ring mt-2 w-full rounded-[8px] border border-court-line bg-white px-3 py-3 text-sm text-court-ink"
            required
          >
            <option value="player">Player</option>
            <option value="coach">Coach</option>
            <option value="owner">Owner</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-bold text-court-ink">Stav</span>
          <select
            name="status"
            defaultValue={primaryMembership?.status ?? "active"}
            className="focus-ring mt-2 w-full rounded-[8px] border border-court-line bg-white px-3 py-3 text-sm text-court-ink"
            required
          >
            <option value="active">Active</option>
            <option value="invited">Invited</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>

        <div className="flex items-end">
          <Button type="submit" className="w-full py-3">
            Ulozit rolu
          </Button>
        </div>
      </form>
    </Card>
  );
}
