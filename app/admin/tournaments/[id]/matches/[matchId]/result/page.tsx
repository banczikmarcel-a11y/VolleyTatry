import Link from "next/link";
import { saveTournamentResultAction } from "@/app/admin/tournaments/actions";
import { PageHeader } from "@/components/page-header";
import { QueryToast } from "@/components/ui/query-toast";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, FormCard } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { requireAdminUser } from "@/lib/admin";
import { createTournamentRepository } from "@/src/server/tournaments";
import type { TournamentResultAuditLogRecord } from "@/src/server/tournaments";

type PageProps = {
  params: Promise<{ id: string; matchId: string }>;
  searchParams?: Promise<{ error?: string; message?: string }>;
};

export default async function TournamentMatchResultPage({ params, searchParams }: PageProps) {
  const { id: tournamentId, matchId } = await params;
  const query = await searchParams;
  await requireAdminUser(`/admin/tournaments/${tournamentId}/matches/${matchId}/result`);
  const repository = await createTournamentRepository();
  const bundleResult = await repository.getTournamentBundle(tournamentId);

  if (!bundleResult.ok) {
    return <Card className="border-red-200 bg-red-50 text-red-700"><p className="text-sm font-bold">{bundleResult.error.message}</p></Card>;
  }

  const tournament = bundleResult.data.tournament;
  const match = bundleResult.data.matches.find((item) => item.id === matchId);
  const auditLogsResult = await repository.listTournamentResultAuditLogs(tournamentId, matchId);
  const teamsById = new Map(bundleResult.data.teams.map((team) => [team.id, team.display_name ?? team.teamName]));

  if (!match) {
    return <Card className="border-red-200 bg-red-50 text-red-700"><p className="text-sm font-bold">Zápas sa nenašiel.</p></Card>;
  }

  const homeName = match.home_tournament_team_id ? teamsById.get(match.home_tournament_team_id) ?? match.home_tournament_team_id : "Čaká sa na tím";
  const awayName = match.away_tournament_team_id ? teamsById.get(match.away_tournament_team_id) ?? match.away_tournament_team_id : "Čaká sa na tím";
  const totalHome = match.sets.reduce((sum, set) => sum + set.home_points, 0);
  const totalAway = match.sets.reduce((sum, set) => sum + set.away_points, 0);
  const auditLogs = auditLogsResult.ok ? auditLogsResult.data : [];
  const isGroupStageMatch = match.phase === "group_stage";

  const renderAuditSnapshot = (snapshot: TournamentResultAuditLogRecord["new_result"] | TournamentResultAuditLogRecord["previous_result"]) => {
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
      return "Bez predchádzajúceho výsledku";
    }

    const status = "status" in snapshot && typeof snapshot.status === "string" ? snapshot.status : "nezadaný";
    const sets =
      "sets" in snapshot && Array.isArray(snapshot.sets)
        ? snapshot.sets
            .map((set) =>
              set && typeof set === "object" && !Array.isArray(set) && typeof set.homePoints === "number" && typeof set.awayPoints === "number"
                ? `${set.homePoints}:${set.awayPoints}`
                : null
            )
            .filter((item): item is string => item !== null)
        : [];

    return `${status}${sets.length ? ` · ${sets.join(", ")}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <QueryToast error={query?.error} message={query?.message} />
      <PageHeader eyebrow="Admin" title={`${tournament.name} · Výsledok`} description={isGroupStageMatch ? "V skupine zapisuješ len celkový počet získaných lôpt oboch družstiev." : "Zadaj sety cez numerické mobilné inputy, validácia beží na serveri podľa fázy zápasu."} homeHref={`/admin/tournaments/${tournamentId}`} />

      <Card className="space-y-2 bg-court-ice">
        <p className="text-sm font-black uppercase text-court-mint">{match.phase}</p>
        <h2 className="break-words text-xl font-black text-court-ink">{homeName} vs {awayName}</h2>
        <p className="text-sm text-court-blue">
          {match.scheduled_at ? new Intl.DateTimeFormat("sk-SK", { dateStyle: "medium", timeStyle: "short" }).format(new Date(match.scheduled_at)) : "Bez času"} · {match.location ?? "Bez ihriska"}
        </p>
        <p className="text-sm text-court-blue">Aktuálny súčet bodov: <span className="font-black text-court-ink">{totalHome}:{totalAway}</span></p>
      </Card>

      <FormCard action={saveTournamentResultAction} className="space-y-4">
        <input type="hidden" name="tournament_id" value={tournamentId} />
        <input type="hidden" name="match_id" value={matchId} />
        <input type="hidden" name="status" value="completed" />
        {(isGroupStageMatch ? [1] : [1, 2, 3]).map((setNumber) => {
          const currentSet = match.sets.find((set) => set.set_number === setNumber);

          return (
            <Card key={setNumber} className="space-y-3 border-dashed">
              <p className="text-sm font-black uppercase text-court-mint">{isGroupStageMatch ? "Lopty" : `Set ${setNumber}`}</p>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-court-ink">{homeName}</span>
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    type="number"
                    min={0}
                    step={1}
                    name={`home_points_${setNumber}`}
                    defaultValue={currentSet?.home_points ?? ""}
                    className="focus-ring min-h-14 rounded-[8px] border border-court-line px-4 py-3 text-lg font-black"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-court-ink">{awayName}</span>
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    type="number"
                    min={0}
                    step={1}
                    name={`away_points_${setNumber}`}
                    defaultValue={currentSet?.away_points ?? ""}
                    className="focus-ring min-h-14 rounded-[8px] border border-court-line px-4 py-3 text-lg font-black"
                  />
                </label>
              </div>
            </Card>
          );
        })}

        <label className="grid gap-2">
          <span className="text-sm font-bold text-court-ink">Dôvod opravy (voliteľné)</span>
          <textarea
            name="correction_reason"
            rows={3}
            placeholder="Napr. opravený prepis bodov v 2. sete."
            className="focus-ring min-h-24 rounded-[8px] border border-court-line px-4 py-3 text-base"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <SubmitButton className="w-full py-3" idleLabel="Uložiť výsledok" pendingLabel="Ukladám výsledok..." />
          <Link href={`/admin/tournaments/${tournamentId}`} className={buttonClasses({ className: "w-full justify-center py-3", variant: "secondary" })}>
            Späť na prehľad
          </Link>
        </div>
      </FormCard>

      <Card className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-black uppercase text-court-mint">Audit výsledkov</p>
          <h2 className="text-lg font-black text-court-ink">História opráv</h2>
          <p className="text-sm text-court-blue">Detailný audit vidí iba administrátor. Verejná časť nezobrazuje mená administrátorov ani interné poznámky.</p>
        </div>

        {!auditLogsResult.ok ? (
          <Card className="border-red-200 bg-red-50 text-red-700">
            <p className="text-sm font-bold">{auditLogsResult.error.message}</p>
          </Card>
        ) : auditLogs.length === 0 ? (
          <Card className="border-dashed">
            <p className="text-sm text-court-blue">Tento zápas zatiaľ nemá uloženú históriu zmien výsledku.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {auditLogs.map((auditLog) => (
              <Card key={auditLog.id} className="space-y-3 border-dashed">
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="break-words text-sm font-black text-court-ink">
                    {auditLog.changedByIdentity?.fullName || auditLog.changedByIdentity?.email || auditLog.changed_by || "Administrátor"}
                  </p>
                  <p className="text-xs uppercase tracking-[0.18em] text-court-blue">
                    {new Intl.DateTimeFormat("sk-SK", { dateStyle: "medium", timeStyle: "short" }).format(new Date(auditLog.changed_at))}
                  </p>
                </div>

                <div className="grid gap-2 text-sm text-court-ink">
                  <p className="break-words"><span className="font-black">Predtým:</span> {renderAuditSnapshot(auditLog.previous_result)}</p>
                  <p className="break-words"><span className="font-black">Nový stav:</span> {renderAuditSnapshot(auditLog.new_result)}</p>
                  {auditLog.correction_reason ? <p className="break-words"><span className="font-black">Dôvod:</span> {auditLog.correction_reason}</p> : null}
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
