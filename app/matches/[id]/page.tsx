import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Pencil, Users } from "lucide-react";
import { DeleteMatchButton } from "@/components/matches/delete-match-button";
import { HomeMatchSignupPanel } from "@/components/matches/home-match-signup-panel";
import { MatchResponsePanel } from "@/components/matches/match-response-panel";
import { MatchResultForm } from "@/components/matches/match-result-form";
import { TeamAssignmentBoard } from "@/components/matches/team-assignment-board";
import { UnavailablePlayersList } from "@/components/matches/unavailable-players-list";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QueryToast } from "@/components/ui/query-toast";
import { getAdminEmailRecipients, getAdminState } from "@/lib/admin";
import { formatMatchDate, getMatchResultState } from "@/lib/match-display";
import { formatMatchStatus, getMatchDetail } from "@/lib/matches";
import { getCurrentUser } from "@/supabase/server";

type MatchDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    message?: string;
  }>;
};

const statusTone = {
  cancelled: "coral",
  completed: "neutral",
  scheduled: "mint"
} as const;

export default async function MatchDetailPage({ params, searchParams }: MatchDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  const [{ error, isConfigured, match }, adminState, adminRecipients] = await Promise.all([
    getMatchDetail(id, user?.id),
    getAdminState(),
    getAdminEmailRecipients()
  ]);

  if (isConfigured && !match && !error) {
    notFound();
  }

  if (!match) {
    return (
      <div className="space-y-6">
        <Link href="/matches" className="text-sm font-black text-court-ink underline decoration-court-mint underline-offset-4">
          Späť na zápasy
        </Link>
        <Card className="border-court-coral bg-court-coral/10">
          <p className="text-sm font-black uppercase text-court-coral">Detail zápasu</p>
          <h1 className="mt-2 text-3xl font-black text-court-ink">Zápas sa nepodarilo načítať</h1>
          <p className="mt-2 text-sm leading-6 text-court-blue">
            {error ?? "Supabase nie je nakonfigurovaný alebo zápas ešte neexistuje."}
          </p>
        </Card>
      </div>
    );
  }

  const resultTone = getMatchResultState(match.homeSets, match.awaySets);
  const hasResult = match.homeSets !== null && match.awaySets !== null;
  const isCompleted = match.status === "completed";

  return (
    <div className="space-y-8">
      <QueryToast error={query?.error} message={query?.message} />
      <Link href="/matches" className="text-sm font-black text-court-ink underline decoration-court-mint underline-offset-4">
        Späť na zápasy
      </Link>

      <section className="overflow-hidden rounded-[8px] bg-court-ink text-white shadow-panel">
        <div className="grid gap-4 p-3 sm:p-4 md:p-5">
          <div>
            <Badge tone={statusTone[match.status]}>{formatMatchStatus(match.status)}</Badge>
            <h1 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">{match.title}</h1>
            <div className="mt-4 grid gap-2 text-court-line">
              <p className="flex items-center gap-3 text-base font-black sm:text-xl">
                <CalendarDays className="h-5 w-5 text-court-mint" />
                {formatMatchDate(match.startsAt)}
              </p>
              <p className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-court-mint" />
                {match.location ?? "Miesto bude doplnené"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className={`grid gap-4 ${hasResult ? "xl:grid-cols-[0.8fr_1.2fr]" : ""}`}>
            {hasResult ? (
              <Card className="p-3">
                <div className="rounded-[8px] border border-court-line bg-court-ice p-3 text-center">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <p className={`truncate text-sm font-black ${resultTone.homeClassName}`}>{match.team?.name ?? "Tatry"}</p>
                    <span className="text-[11px] font-black uppercase text-court-blue">vs</span>
                    <p className={`truncate text-sm font-black ${resultTone.awayClassName}`}>{match.opponent?.name ?? "Ostatní"}</p>
                  </div>
                  <div className="mt-3 rounded-[8px] border border-court-line bg-white px-3 py-3">
                    <p className="text-[11px] font-black uppercase text-court-blue">Výsledok</p>
                    <p className="mt-1 text-2xl font-black text-court-ink">
                      {match.homeSets}:{match.awaySets}
                    </p>
                    <p className="mt-1 text-xs font-black text-court-blue">{resultTone.label}</p>
                  </div>
                </div>
              </Card>
            ) : null}

            <Card className="p-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black uppercase text-court-mint">Odpovede</p>
                  <h2 className="mt-1 text-lg font-black text-court-ink">Prehľad účasti</h2>
                </div>
                <Users className="h-5 w-5 text-court-mint" />
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-[8px] bg-court-ice p-3">
                  <p className="text-xs font-black uppercase text-court-blue">Idem</p>
                  <p className="mt-1 text-lg font-black text-court-ink">{match.responseCounts.available}</p>
                </div>
                <div className="rounded-[8px] bg-court-ice p-3">
                  <p className="text-xs font-black uppercase text-court-blue">Nejdem</p>
                  <p className="mt-1 text-lg font-black text-court-ink">{match.responseCounts.unavailable}</p>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xs font-black uppercase text-court-blue">Zoznam hráčov Nejdem</p>
                <UnavailablePlayersList isConfigured={isConfigured} matchId={match.id} players={match.unavailablePlayers} />
              </div>
            </Card>
          </div>

          <Card className="p-4">
            <TeamAssignmentBoard
              matchId={match.id}
              adminEmailRecipients={adminRecipients.emails}
              homeTeamName={match.team?.name ?? "Domáci"}
              awayTeamName={match.opponent?.name ?? "Hostia"}
              homeSets={match.homeSets}
              awaySets={match.awaySets}
              canEmailAdmin={adminState.isAdmin}
              isLocked={isCompleted}
              matchDateLabel={formatMatchDate(match.startsAt)}
              matchTitle={match.title}
              players={match.availablePlayers}
            />
          </Card>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24">
          {!isCompleted ? (
            <>
              <HomeMatchSignupPanel
                currentUserResponse={match.userResponse}
                isConfigured={isConfigured}
                matchId={match.id}
                players={match.signupPlayers}
                returnPath={`/matches/${match.id}`}
                userId={user?.id ?? null}
              />

              <MatchResponsePanel
                isConfigured={isConfigured}
                matchId={match.id}
                userResponse={match.userResponse}
              />
            </>
          ) : null}

          {adminState.isAdmin ? (
            <>
              <MatchResultForm matchId={match.id} homeSets={match.homeSets} awaySets={match.awaySets} />

              <Card className="p-4">
                <p className="text-sm font-black uppercase text-court-coral">Admin</p>
                <h2 className="mt-2 text-lg font-black text-court-ink">Editácia zápasu</h2>
                <p className="mt-2 text-sm leading-6 text-court-blue">
                  Uprav dátum, miesto, sezónu, stav, tímy a výsledok zápasu.
                </p>
                <Link
                  href={`/admin/matches/${match.id}/edit`}
                  className={buttonClasses({ className: "mt-4 w-full", variant: "secondary" })}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Upraviť zápas
                </Link>
                <div className="mt-3">
                  <DeleteMatchButton matchId={match.id} />
                </div>
              </Card>
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
