import Link from "next/link";
import { addTournamentTeamAction, saveTournamentGroupsAction } from "@/app/admin/tournaments/actions";
import { PageHeader } from "@/components/page-header";
import { QueryToast } from "@/components/ui/query-toast";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, FormCard } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { requireAdminUser } from "@/lib/admin";
import { createTournamentRepository } from "@/src/server/tournaments";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string; message?: string }>;
};

export default async function TournamentTeamsPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  await requireAdminUser(`/admin/tournaments/${id}/teams`);
  const repository = await createTournamentRepository();
  const [bundleResult, availableTeamsResult] = await Promise.all([repository.getTournamentBundle(id), repository.listAvailableTeams()]);

  if (!bundleResult.ok) {
    return <Card className="border-red-200 bg-red-50 text-red-700"><p className="text-sm font-bold">{bundleResult.error.message}</p></Card>;
  }

  const tournament = bundleResult.data.tournament;
  const tournamentTeams = bundleResult.data.teams;
  const takenTeamIds = new Set(tournamentTeams.map((team) => team.team_id));
  const availableTeams = availableTeamsResult.ok ? availableTeamsResult.data.filter((team) => !takenTeamIds.has(team.id)) : [];
  const countA = tournamentTeams.filter((team) => team.groupCode === "A").length;
  const countB = tournamentTeams.filter((team) => team.groupCode === "B").length;
  const groupsReady = countA === 5 && countB === 5 && tournamentTeams.length === 10;

  return (
    <div className="space-y-6">
      <QueryToast error={query?.error} message={query?.message} />
      <PageHeader eyebrow="Admin" title={`${tournament.name} · Tímy`} description="Pridaj tímy, uprav skupiny a skontroluj pripravenosť rozpisu." homeHref={`/admin/tournaments/${id}`} />

      <Card className="grid gap-2 bg-court-ice">
        <p className="text-sm font-black uppercase text-court-mint">Pripravenosť skupín</p>
        <p className="text-sm text-court-blue">Skupina A: <span className="font-black text-court-ink">{countA}/5</span> · Skupina B: <span className="font-black text-court-ink">{countB}/5</span></p>
        <p className={`text-sm font-bold ${groupsReady ? "text-court-mint" : "text-court-coral"}`}>
          {groupsReady ? "Skupiny sú pripravené na generovanie rozpisu." : "Pred generovaním rozpisu musí byť presne 5 tímov v A aj 5 tímov v B."}
        </p>
      </Card>

      <FormCard action={addTournamentTeamAction} className="space-y-4">
        <input type="hidden" name="tournament_id" value={id} />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-black uppercase text-court-mint">Pridať tím</p>
          <p className="text-sm text-court-blue">Každý tím môže byť v turnaji len raz.</p>
        </div>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-court-ink">Tím</span>
          <select name="team_id" required className="focus-ring min-h-11 rounded-[8px] border border-court-line px-4 py-3 text-base">
            <option value="">Vyber tím</option>
            {availableTeams.map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-court-ink">Skupina</span>
              <select name="group_code" className="focus-ring min-h-11 rounded-[8px] border border-court-line px-4 py-3 text-base">
                <option value="">Automaticky</option>
              <option value="A">A</option>
              <option value="B">B</option>
            </select>
          </label>
          <label className="grid gap-2 sm:col-span-2">
            <span className="text-sm font-bold text-court-ink">Názov v turnaji</span>
            <input name="display_name" className="focus-ring min-h-11 rounded-[8px] border border-court-line px-4 py-3 text-base" />
          </label>
        </div>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-court-ink">Seed</span>
          <input type="number" min={1} step={1} name="seed_number" className="focus-ring min-h-11 rounded-[8px] border border-court-line px-4 py-3 text-base" />
        </label>
        <SubmitButton
          className="w-full py-3"
          idleLabel="Pridať tím do turnaja"
          pendingLabel="Pridávam tím..."
        />
      </FormCard>

      <FormCard action={saveTournamentGroupsAction} className="space-y-4">
        <input type="hidden" name="tournament_id" value={id} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-black uppercase text-court-mint">Skupiny a poradie</p>
            <p className="text-sm text-court-blue">Veľké touch targety sú pripravené aj pre mobilné triedenie cez čísla a výber skupiny.</p>
          </div>
          <SubmitButton className="w-full shrink-0 sm:w-auto" idleLabel="Uložiť" pendingLabel="Ukladám skupiny..." />
        </div>
        <div className="grid gap-3">
          {tournamentTeams.map((team, index) => (
            <Card key={team.id} className="grid gap-3 border-dashed">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-black text-court-ink">{team.display_name ?? team.teamName}</p>
                  <p className="break-words text-xs text-court-blue">{team.teamName}</p>
                </div>
                <p className="text-xs font-black uppercase text-court-mint">#{index + 1}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-2">
                  <span className="text-xs font-bold text-court-blue">Skupina</span>
                  <select
                    name={`group_for_${team.id}`}
                    defaultValue={team.groupCode}
                    className="focus-ring min-h-12 rounded-[8px] border border-court-line px-4 py-3 text-base font-bold"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-bold text-court-blue">Seed</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    name={`seed_for_${team.id}`}
                    defaultValue={team.seed_number ?? ""}
                    className="focus-ring min-h-12 rounded-[8px] border border-court-line px-4 py-3 text-base font-bold"
                  />
                </label>
              </div>
              <input type="hidden" name={`sort_for_${team.id}`} value={team.sort_order ?? index + 1} />
            </Card>
          ))}
        </div>
      </FormCard>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href={`/admin/tournaments/${id}`} className={buttonClasses({ className: "justify-center py-3", variant: "secondary" })}>Späť na prehľad</Link>
        <Link
          href={`/admin/tournaments/${id}/schedule`}
          className={buttonClasses({ className: "justify-center py-3", variant: groupsReady ? "primary" : "secondary" })}
        >
          Pokračovať na rozpis
        </Link>
      </div>
    </div>
  );
}
