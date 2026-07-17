import Link from "next/link";
import { closeGroupStageAction, finishTournamentAction, generatePlayoffsAction } from "@/app/admin/tournaments/actions";
import { PageHeader } from "@/components/page-header";
import { QueryToast } from "@/components/ui/query-toast";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonClasses } from "@/components/ui/button";
import { Card, FormCard } from "@/components/ui/card";
import { requireAdminUser } from "@/lib/admin";
import { createTournamentRepository, createTournamentService } from "@/src/server/tournaments";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string; message?: string }>;
};

export default async function TournamentAdminOverviewPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  await requireAdminUser(`/admin/tournaments/${id}`);
  const repository = await createTournamentRepository();
  const service = await createTournamentService();
  const bundleResult = await repository.getTournamentBundle(id);

  if (!bundleResult.ok) {
    return <Card className="border-red-200 bg-red-50 text-red-700"><p className="text-sm font-bold">{bundleResult.error.message}</p></Card>;
  }

  const bundle = bundleResult.data;
  const tournament = bundle.tournament;
  const groupMatches = bundle.matches.filter((match) => match.phase === "group_stage");
  const playoffMatches = bundle.matches.filter((match) => match.phase !== "group_stage");
  const completedGroupMatches = groupMatches.filter((match) => match.status === "completed").length;
  const completedPlayoffMatches = playoffMatches.filter((match) => match.status === "completed").length;
  const missingResults = bundle.matches.filter((match) => match.status !== "completed");
  const completedResults = bundle.matches.filter((match) => match.status === "completed");
  const teamNamesById = new Map(bundle.teams.map((team) => [team.id, team.display_name ?? team.teamName]));
  const getMatchTeamsLabel = (match: (typeof bundle.matches)[number]) =>
    `${match.home_tournament_team_id ? teamNamesById.get(match.home_tournament_team_id) ?? match.home_tournament_team_id : "Čaká sa na tím"} - ${match.away_tournament_team_id ? teamNamesById.get(match.away_tournament_team_id) ?? match.away_tournament_team_id : "Čaká sa na tím"}`;
  const countA = bundle.teams.filter((team) => team.groupCode === "A").length;
  const countB = bundle.teams.filter((team) => team.groupCode === "B").length;
  const standingsReady = countA >= 2 && countB >= 2;
  const standingsResult = standingsReady ? await service.recalculateStandings(id) : null;

  return (
    <div className="space-y-6">
      <QueryToast error={query?.error} message={query?.message} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader eyebrow="Admin" title={tournament.name} description="Kontrolné centrum turnaja pre pripravenosť, výsledky a uzatváranie jednotlivých fáz." homeHref="/admin/tournaments" />
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Link href={`/admin/tournaments/${id}/teams`} className={buttonClasses({ className: "justify-center", variant: "secondary" })}>Tímy</Link>
          <Link href={`/admin/tournaments/${id}/schedule`} className={buttonClasses({ className: "justify-center", variant: "secondary" })}>Rozpis</Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <p className="text-xs font-black uppercase text-court-mint">Stav turnaja</p>
          <p className="mt-2 text-2xl font-black text-court-ink">{tournament.status}</p>
          <p className="mt-2 text-sm text-court-blue">Skupiny A/B: {countA}/5 · {countB}/5</p>
        </Card>
        <Card>
          <p className="text-xs font-black uppercase text-court-mint">Dokončenie zápasov</p>
          <p className="mt-2 text-sm text-court-blue">Skupina: {completedGroupMatches}/{groupMatches.length}</p>
          <p className="mt-1 text-sm text-court-blue">Nadstavba: {completedPlayoffMatches}/{playoffMatches.length}</p>
        </Card>
      </div>

      <Card className="space-y-2">
        <p className="text-sm font-black uppercase text-court-mint">Pripravenosť</p>
        <p className="text-sm text-court-blue">Tímy a skupiny: <span className="font-bold text-court-ink">{countA === 5 && countB === 5 ? "pripravené" : "neúplné"}</span></p>
        <p className="text-sm text-court-blue">Chýbajúce výsledky: <span className="font-bold text-court-ink">{missingResults.length}</span></p>
        <p className="text-sm text-court-blue">
          Tabuľky:{" "}
          <span className="font-bold text-court-ink">
            {!standingsReady
              ? "najprv doplň aspoň 2 družstvá do každej skupiny"
              : standingsResult?.ok
                ? "vypočítateľné"
                : standingsResult?.error.message ?? "zatiaľ nepripravené"}
          </span>
        </p>
        <p className="text-sm text-court-blue">Playoff stav: <span className="font-bold text-court-ink">{playoffMatches.length > 0 ? `${playoffMatches.length} zápasov` : "ešte nevygenerované"}</span></p>
        <p className="text-sm text-court-blue">Finálne poradie: <span className="font-bold text-court-ink">{bundle.finalStandings.length > 0 ? `${bundle.finalStandings.length} pozícií` : "zatiaľ neuzavreté"}</span></p>
      </Card>

      {missingResults.length > 0 ? (
        <Card className="space-y-3">
          <p className="text-sm font-black uppercase text-court-coral">Chýbajúce výsledky</p>
          <div className="grid gap-2">
            {missingResults.map((match) => (
              <div key={match.id} className="flex flex-col gap-3 rounded-[8px] border border-court-line px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-bold text-court-ink">
                    {match.label ?? match.phase}
                    {" - "}
                    {getMatchTeamsLabel(match)}
                  </p>
                  <p className="text-xs text-court-blue">{match.status}</p>
                </div>
                <Link href={`/admin/tournaments/${id}/matches/${match.id}/result`} className={buttonClasses({ className: "w-full justify-center sm:w-auto", variant: "primary" })}>
                  Výsledok
                </Link>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {completedResults.length > 0 ? (
        <Card className="space-y-3">
          <p className="text-sm font-black uppercase text-court-mint">Uložené výsledky</p>
          <div className="grid gap-2">
            {completedResults.map((match) => (
              <div key={match.id} className="flex flex-col gap-3 rounded-[8px] border border-court-line px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-bold text-court-ink">
                    {match.label ?? match.phase}
                    {" - "}
                    {getMatchTeamsLabel(match)}
                  </p>
                  <p className="text-xs text-court-blue">Výsledok uložený</p>
                </div>
                <Link href={`/admin/tournaments/${id}/matches/${match.id}/result`} className={buttonClasses({ className: "w-full justify-center sm:w-auto", variant: "secondary" })}>
                  Upraviť výsledok
                </Link>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4">
        <FormCard action={closeGroupStageAction} className="space-y-3">
          <input type="hidden" name="tournament_id" value={id} />
          <p className="text-sm font-black uppercase text-court-mint">Uzavrieť skupinu</p>
          <p className="text-sm text-court-blue">Kontroluje dokončenie všetkých skupinových zápasov a pripravenosť tabuľky.</p>
          <SubmitButton className="w-full py-3" idleLabel="Uzavrieť skupinovú fázu" pendingLabel="Uzatváram skupinu..." />
        </FormCard>

        <FormCard action={generatePlayoffsAction} className="space-y-3">
          <input type="hidden" name="tournament_id" value={id} />
          <p className="text-sm font-black uppercase text-court-mint">Generovať nadstavbu</p>
          <p className="text-sm text-court-blue">Použije tabuľky skupín A a B a vytvorí semifinále aj zápasy o umiestnenie.</p>
          <SubmitButton className="w-full py-3" idleLabel="Generovať playoffs" pendingLabel="Generujem nadstavbu..." />
        </FormCard>

        <FormCard action={finishTournamentAction} className="space-y-3">
          <input type="hidden" name="tournament_id" value={id} />
          <p className="text-sm font-black uppercase text-court-mint">Ukončiť turnaj</p>
          <p className="text-sm text-court-blue">Spočíta finálne poradie až po dohraní finále, bronzu a všetkých placement zápasov.</p>
          <SubmitButton className="w-full py-3" idleLabel="Ukončiť turnaj" pendingLabel="Ukončujem turnaj..." />
        </FormCard>
      </div>
    </div>
  );
}
