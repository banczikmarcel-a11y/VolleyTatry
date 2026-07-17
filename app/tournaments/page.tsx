import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { withTimeout } from "@/lib/async";
import { formatTournamentDateTime } from "@/lib/tournament-public";
import { createTournamentRepository } from "@/src/server/tournaments";

const TOURNAMENT_LIST_TIMEOUT_MS = 3500;

function getTournamentStatusLabel(status: string) {
  switch (status) {
    case "draft":
      return "Príprava";
    case "group_stage":
      return "Skupinová fáza";
    case "playoff":
      return "Nadstavba";
    case "completed":
      return "Ukončené";
    case "cancelled":
      return "Zrušené";
    default:
      return status;
  }
}

export default async function TournamentsPage() {
  const repository = await createTournamentRepository();
  const tournamentsResult = await withTimeout(
    repository.listTournaments(),
    TOURNAMENT_LIST_TIMEOUT_MS,
    "Timed out while loading tournaments."
  ).catch(() => ({
    error: {
      code: "UNKNOWN" as const,
      message: "Nepodarilo sa načítať turnaje."
    },
    ok: false as const
  }));

  const tournaments =
    tournamentsResult.ok
      ? tournamentsResult.data.filter((tournament) => tournament.is_public)
      : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Turnaje"
        title="Verejné turnaje"
        description="Prehľad všetkých zverejnených turnajov, programu, výsledkov, skupín a nadstavby."
        homeHref="/"
      />

      {!tournamentsResult.ok ? (
        <Card className="border-red-200 bg-red-50 text-red-700">
          <p className="text-sm font-bold">{tournamentsResult.error.message}</p>
        </Card>
      ) : null}

      {tournamentsResult.ok && tournaments.length === 0 ? (
        <Card>
          <p className="text-sm font-black uppercase text-court-mint">Zatiaľ nič</p>
          <p className="mt-2 text-sm leading-6 text-court-blue">
            Momentálne ešte nie je zverejnený žiaden turnaj.
          </p>
        </Card>
      ) : null}

      {tournaments.length > 0 ? (
        <div className="grid gap-4">
          {tournaments.map((tournament) => (
            <Card key={tournament.id} className="space-y-3">
              <div className="flex flex-col gap-1">
                <p className="text-xs font-black uppercase text-court-mint">
                  {getTournamentStatusLabel(tournament.status)}
                </p>
                <h2 className="text-xl font-black text-court-ink">{tournament.name}</h2>
                <p className="text-sm text-court-blue">
                  {formatTournamentDateTime(tournament.starts_at, { dateStyle: "full", timeStyle: "short" })}
                </p>
                <p className="text-sm text-court-blue">{tournament.location ?? "Miesto bude doplnené"}</p>
              </div>

              <div className="grid gap-2 text-sm text-court-blue">
                <p>
                  Formát: <span className="font-bold text-court-ink">{tournament.format.name}</span>
                </p>
                <p>
                  Rozpis: {tournament.court_count} ihrisko/á · {tournament.match_duration_minutes} min zápas ·{" "}
                  {tournament.break_duration_minutes} min prestávka
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Link
                  href={`/tournaments/${tournament.slug}`}
                  className={buttonClasses({ className: "justify-center", variant: "primary" })}
                >
                  Otvoriť turnaj
                </Link>
                <Link
                  href={`/tournaments/${tournament.slug}/schedule`}
                  className={buttonClasses({ className: "justify-center", variant: "secondary" })}
                >
                  Program
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
