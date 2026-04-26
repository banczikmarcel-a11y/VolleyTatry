import Link from "next/link";
import { CreatePlayerForm } from "@/components/admin/create-player-form";
import { PlayerRoleTable } from "@/components/admin/player-role-table";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { QueryToast } from "@/components/ui/query-toast";
import { getAdminPlayers } from "@/lib/admin-players";
import { getAdminTeams, requireAdminUser } from "@/lib/admin";

type AdminPlayersPageProps = {
  searchParams?: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function AdminPlayersPage({ searchParams }: AdminPlayersPageProps) {
  const params = await searchParams;
  await requireAdminUser("/admin/players");
  const [{ error: playersError, players }, { error: teamsError, teams }] = await Promise.all([
    getAdminPlayers(),
    getAdminTeams()
  ]);

  return (
    <div className="space-y-8">
      <QueryToast error={params?.error} message={params?.message} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <PageHeader eyebrow="Admin" title="Správa hráčov" />
        <div className="flex items-center gap-3">
          {teams.length > 0 ? <CreatePlayerForm teams={teams} /> : null}
          <Link href="/matches" className="text-sm font-black text-court-ink underline decoration-court-mint underline-offset-4">
            Späť na zápasy
          </Link>
        </div>
      </div>

      {playersError || teamsError ? (
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm font-bold text-red-700">{playersError ?? teamsError}</p>
        </Card>
      ) : null}

      {teams.length === 0 ? (
        <Card>
          <p className="text-sm font-black uppercase text-court-coral">Žiadne tímy</p>
          <p className="mt-2 text-sm leading-6 text-court-blue">Najprv spusti seed pre Tatry a Ostatní.</p>
        </Card>
      ) : null}

      {players.length > 0 ? <PlayerRoleTable players={players} teams={teams} /> : null}

      {players.length === 0 ? (
        <Card>
          <p className="text-sm font-black uppercase text-court-mint">Bez hráčov</p>
          <p className="mt-2 text-sm leading-6 text-court-blue">
            Profily sa vytvárajú automaticky po registrácii používateľa.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
