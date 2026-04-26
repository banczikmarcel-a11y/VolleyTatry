import Link from "next/link";
import { notFound } from "next/navigation";
import { updateMatch } from "@/app/admin/matches/actions";
import { MatchForm } from "@/components/admin/match-form";
import { Card } from "@/components/ui/card";
import { getAdminTeams, requireAdminUser } from "@/lib/admin";
import { getAdminMatch } from "@/lib/admin-matches";

type EditMatchPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function EditMatchPage({ params, searchParams }: EditMatchPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  await requireAdminUser(`/admin/matches/${id}/edit`);
  const [{ error: teamsError, teams }, { error: matchError, match }] = await Promise.all([
    getAdminTeams(),
    getAdminMatch(id)
  ]);

  if (!match && !matchError) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/matches/${id}`} className="text-sm font-black text-court-ink underline decoration-court-mint underline-offset-4">
        Spat na detail
      </Link>

      {teamsError || matchError ? (
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm font-bold text-red-700">{teamsError ?? matchError}</p>
        </Card>
      ) : null}

      {match ? (
        <MatchForm action={updateMatch} error={query?.error} match={match} submitLabel="Update match" teams={teams} />
      ) : null}
    </div>
  );
}
