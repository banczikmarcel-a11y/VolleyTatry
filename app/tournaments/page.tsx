import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { withTimeout } from "@/lib/async";
import { getAdminState } from "@/lib/admin";
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
  const [tournamentsResult, adminState] = await Promise.all([
    withTimeout(
      repository.listTournaments(),
      TOURNAMENT_LIST_TIMEOUT_MS,
      "Timed out while loading tournaments."
    ).catch(() => ({
      error: {
        code: "UNKNOWN" as const,
        message: "Nepodarilo sa načítať turnaje."
      },
      ok: false as const
    })),
    withTimeout(
      getAdminState(),
      TOURNAMENT_LIST_TIMEOUT_MS,
      "Timed out while loading the admin state."
    ).catch(() => ({
      error: "Nepodarilo sa overiť administrátorský prístup.",
      isAdmin: false,
      userId: null
    }))
  ]);

  const tournaments =
    tournamentsResult.ok
      ? tournamentsResult.data.filter((tournament) => tournament.is_public)
      : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          eyebrow="Turnaje"
          title="Verejné turnaje"
          description="Prehľad všetkých zverejnených turnajov a rýchly vstup do skupín a výsledkov."
          homeHref="/"
        />
        {adminState.isAdmin ? (
          <div className="grid gap-2 sm:min-w-[220px]">
            <Link href="/admin/tournaments/new" className={buttonClasses({ className: "w-full justify-center" })}>
              Nový turnaj
            </Link>
            <Link
              href="/admin/tournaments"
              className={buttonClasses({ className: "w-full justify-center", variant: "secondary" })}
            >
              Admin turnaje
            </Link>
          </div>
        ) : null}
      </div>

      {adminState.isAdmin ? (
        <Card className="space-y-3 bg-court-ice">
          <p className="text-sm font-black uppercase text-court-mint">Administrácia</p>
          <p className="text-sm leading-6 text-court-blue">
            Ako administrátor tu vieš vytvoriť nový turnaj a pri každom turnaji nájdeš skratky na družstvá,
            skupiny, priradenie družstiev aj zapisovanie zápasov.
          </p>
        </Card>
      ) : null}

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
                  href={`/tournaments/${tournament.slug}/groups`}
                  className={buttonClasses({ className: "justify-center", variant: "primary" })}
                >
                  Skupiny
                </Link>
                <Link
                  href={`/tournaments/${tournament.slug}/results`}
                  className={buttonClasses({ className: "justify-center", variant: "secondary" })}
                >
                  Výsledky
                </Link>
              </div>

              {adminState.isAdmin ? (
                <Card className="grid gap-2 border-dashed bg-white p-3 shadow-none">
                  <p className="text-xs font-black uppercase text-court-mint">Správa turnaja</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Link
                      href={`/admin/tournaments/${tournament.id}`}
                      className={buttonClasses({ className: "justify-center", variant: "secondary" })}
                    >
                      Detail
                    </Link>
                    <Link
                      href={`/admin/tournaments/${tournament.id}/teams`}
                      className={buttonClasses({ className: "justify-center", variant: "secondary" })}
                    >
                      Družstvá
                    </Link>
                    <Link
                      href={`/admin/tournaments/${tournament.id}/teams`}
                      className={buttonClasses({ className: "justify-center", variant: "secondary" })}
                    >
                      Skupiny
                    </Link>
                    <Link
                      href={`/admin/tournaments/${tournament.id}/teams`}
                      className={buttonClasses({ className: "justify-center", variant: "secondary" })}
                    >
                      Priradenie družstiev
                    </Link>
                    <Link
                      href={`/admin/tournaments/${tournament.id}`}
                      className={buttonClasses({ className: "justify-center sm:col-span-2", variant: "primary" })}
                    >
                      Zapisovať zápasy
                    </Link>
                  </div>
                </Card>
              ) : null}
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
