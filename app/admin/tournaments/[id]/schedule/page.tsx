import { saveScheduleAction } from "@/app/admin/tournaments/actions";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { QueryToast } from "@/components/ui/query-toast";
import { Card, FormCard } from "@/components/ui/card";
import { Button, buttonClasses } from "@/components/ui/button";
import { requireAdminUser } from "@/lib/admin";
import { createTournamentRepository, createTournamentService } from "@/src/server/tournaments";
import type { GeneratedTournamentMatchDraft } from "@/src/server/tournaments";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string; message?: string; preview?: string; regenerate?: string }>;
};

function getPreviewFlag(value?: string) {
  return value === "1";
}

export default async function TournamentSchedulePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  await requireAdminUser(`/admin/tournaments/${id}/schedule`);
  const repository = await createTournamentRepository();
  const service = await createTournamentService();
  const bundleResult = await repository.getTournamentBundle(id);

  if (!bundleResult.ok) {
    return <Card className="border-red-200 bg-red-50 text-red-700"><p className="text-sm font-bold">{bundleResult.error.message}</p></Card>;
  }

  const { tournament, teams, matches } = bundleResult.data;
  const teamNamesById = new Map(teams.map((team) => [team.id, team.display_name ?? team.teamName]));
  const countA = teams.filter((team) => team.groupCode === "A").length;
  const countB = teams.filter((team) => team.groupCode === "B").length;
  const groupsReady = countA === 5 && countB === 5 && teams.length === 10;
  const existingGroupMatches = matches.filter((match) => match.phase === "group_stage");
  const shouldPreview = groupsReady && getPreviewFlag(query?.preview);
  const previewResult = shouldPreview
    ? await service.generateGroupStageSchedule({
        breakDurationMinutes: tournament.break_duration_minutes,
        courtCount: tournament.court_count,
        matchDurationMinutes: tournament.match_duration_minutes,
        tournamentId: tournament.id,
        tournamentStart: tournament.starts_at ?? new Date().toISOString()
      })
    : null;
  const previewData: { matches: GeneratedTournamentMatchDraft[]; warnings: { code: string; message: string }[] } | null =
    previewResult && previewResult.ok
      ? (previewResult.data as { matches: GeneratedTournamentMatchDraft[]; warnings: { code: string; message: string }[] })
      : null;

  return (
    <div className="space-y-6">
      <QueryToast error={query?.error} message={query?.message} />
      <PageHeader eyebrow="Admin" title={`${tournament.name} · Rozpis`} description="Skontroluj konfiguráciu, preview zápasov a až potom potvrď uloženie." homeHref={`/admin/tournaments/${id}`} />

      <Card className="grid gap-2 bg-court-ice">
        <p className="text-sm font-black uppercase text-court-mint">Konfigurácia</p>
        <p className="text-sm text-court-blue">{tournament.court_count} ihrisko/á · {tournament.match_duration_minutes} min zápas · {tournament.break_duration_minutes} min prestávka</p>
        <p className="text-sm text-court-blue">Začiatok: <span className="font-bold text-court-ink">{tournament.starts_at ? new Intl.DateTimeFormat("sk-SK", { dateStyle: "medium", timeStyle: "short" }).format(new Date(tournament.starts_at)) : "Nezadaný"}</span></p>
        <p className={`text-sm font-bold ${groupsReady ? "text-court-mint" : "text-court-coral"}`}>
          {groupsReady ? "Skupiny sú pripravené na generovanie." : "Pred generovaním musí byť 5 tímov v A a 5 tímov v B."}
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href={`/admin/tournaments/${id}/teams`} className={buttonClasses({ className: "justify-center py-3", variant: "secondary" })}>Upraviť tímy</Link>
        <Link href={`/admin/tournaments/${id}/schedule?preview=1${query?.regenerate === "1" ? "&regenerate=1" : ""}`} className={buttonClasses({ className: "justify-center py-3", variant: groupsReady ? "primary" : "secondary" })}>
          Vygenerovať preview
        </Link>
      </div>

      {existingGroupMatches.length > 0 ? (
        <Card className="border-amber-200 bg-amber-50">
          <p className="text-sm font-bold text-amber-800">Rozpis už existuje. Nové uloženie povoľ až po potvrdení regenerácie.</p>
          <Link href={`/admin/tournaments/${id}/schedule?preview=1&regenerate=1`} className={buttonClasses({ className: "mt-3 justify-center", variant: "secondary" })}>
            Preview s potvrdením regenerácie
          </Link>
        </Card>
      ) : null}

      {previewResult && !previewResult.ok ? (
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm font-bold text-red-700">{previewResult.error.message}</p>
        </Card>
      ) : null}

      {previewData ? (
        <>
          {previewData.warnings.length > 0 ? (
            <Card className="border-amber-200 bg-amber-50">
              <p className="text-sm font-black uppercase text-amber-800">Upozornenia rozhodcov</p>
              <div className="mt-2 grid gap-2">
                {previewData.warnings.map((warning, index) => (
                  <p key={`${warning.code}-${index}`} className="text-sm text-amber-900">{warning.message}</p>
                ))}
              </div>
            </Card>
          ) : null}

          <div className="grid gap-3">
            {previewData.matches.map((match) => (
              <Card key={`${match.phase}-${match.roundNumber}-${match.slotNumber}`} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 flex-1 break-words text-sm font-black text-court-ink">{match.label}</p>
                  <p className="shrink-0 text-xs font-black uppercase text-court-mint">{match.location}</p>
                </div>
                <p className="break-words text-sm text-court-blue">
                  {match.homeTournamentTeamId ? teamNamesById.get(match.homeTournamentTeamId) ?? match.homeTournamentTeamId : "Čaká sa na tím"} vs{" "}
                  {match.awayTournamentTeamId ? teamNamesById.get(match.awayTournamentTeamId) ?? match.awayTournamentTeamId : "Čaká sa na tím"}
                </p>
                <p className="break-words text-xs text-court-blue">
                  {match.scheduledAt ? new Intl.DateTimeFormat("sk-SK", { dateStyle: "short", timeStyle: "short" }).format(new Date(match.scheduledAt)) : "Bez času"} · Rozhodca:{" "}
                  {match.refereeTournamentTeamId ? teamNamesById.get(match.refereeTournamentTeamId) ?? match.refereeTournamentTeamId : "bez rozhodcu"}
                </p>
              </Card>
            ))}
          </div>

          <FormCard action={saveScheduleAction} className="space-y-4">
            <input type="hidden" name="tournament_id" value={id} />
            <input type="hidden" name="court_count" value={String(tournament.court_count)} />
            <input type="hidden" name="match_duration_minutes" value={String(tournament.match_duration_minutes)} />
            <input type="hidden" name="break_duration_minutes" value={String(tournament.break_duration_minutes)} />
            <input type="hidden" name="tournament_start" value={tournament.starts_at ?? ""} />
            <input type="hidden" name="regenerate" value={query?.regenerate === "1" ? "true" : "false"} />
            <p className="text-sm text-court-blue">Uloženie zopakuje serverové generovanie s touto konfiguráciou a persistuje výsledok až po tomto potvrdení.</p>
            <Button type="submit" className="w-full py-3">Potvrdiť a uložiť rozpis</Button>
          </FormCard>
        </>
      ) : null}
    </div>
  );
}
