import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { QueryToast } from "@/components/ui/query-toast";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { requireAdminUser } from "@/lib/admin";
import { createTournamentRepository } from "@/src/server/tournaments";

type PageProps = {
  searchParams?: Promise<{ error?: string; message?: string }>;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Bez termínu";
  }

  return new Intl.DateTimeFormat("sk-SK", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default async function AdminTournamentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  await requireAdminUser("/admin/tournaments");
  const repository = await createTournamentRepository();
  const tournamentsResult = await repository.listTournaments();

  return (
    <div className="space-y-6">
      <QueryToast error={params?.error} message={params?.message} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader eyebrow="Admin" title="Turnaje" description="Správa turnajov, skupín, rozpisu aj výsledkov." homeHref="/" inline />
        <Link href="/admin/tournaments/new" className={buttonClasses({ className: "w-full justify-center sm:w-auto" })}>
          Nový turnaj
        </Link>
      </div>

      {!tournamentsResult.ok ? (
        <Card className="border-red-200 bg-red-50 text-red-700">
          <p className="text-sm font-bold">{tournamentsResult.error.message}</p>
        </Card>
      ) : null}

      {tournamentsResult.ok && tournamentsResult.data.length === 0 ? (
        <Card>
          <p className="text-sm font-black uppercase text-court-mint">Zatiaľ nič</p>
          <p className="mt-2 text-sm leading-6 text-court-blue">Prvý turnaj vytvoríš cez formulár s termínom, miestom a formátom.</p>
        </Card>
      ) : null}

      {tournamentsResult.ok ? (
        <div className="grid gap-4">
          {tournamentsResult.data.map((tournament) => (
            <Card key={tournament.id} className="space-y-3">
              <div className="flex flex-col gap-1">
                <p className="text-xs font-black uppercase text-court-mint">{tournament.status}</p>
                <h2 className="text-xl font-black text-court-ink">{tournament.name}</h2>
                <p className="text-sm text-court-blue">{formatDate(tournament.starts_at)} · {tournament.location ?? "Miesto bude doplnené"}</p>
              </div>
              <div className="grid gap-2 text-sm text-court-blue">
                <p>Formát: <span className="font-bold text-court-ink">{tournament.format.name}</span></p>
                <p>Rozpis: {tournament.court_count} ihrisko/á · {tournament.match_duration_minutes} min zápas · {tournament.break_duration_minutes} min prestávka</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <Link href={`/admin/tournaments/${tournament.id}`} className={buttonClasses({ className: "justify-center", variant: "primary" })}>Otvoriť</Link>
                <Link href={`/admin/tournaments/${tournament.id}/teams`} className={buttonClasses({ className: "justify-center", variant: "secondary" })}>Tímy</Link>
                <Link href={`/admin/tournaments/${tournament.id}/schedule`} className={buttonClasses({ className: "justify-center", variant: "secondary" })}>Rozpis</Link>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
