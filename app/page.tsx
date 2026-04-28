import Image from "next/image";
import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { HomeMatchSignupPanel } from "@/components/matches/home-match-signup-panel";
import { MatchListCard } from "@/components/matches/match-list-card";
import { PageHeader } from "@/components/page-header";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QueryToast } from "@/components/ui/query-toast";
import { getAdminState } from "@/lib/admin";
import { getRecentCompletedMatches, getUpcomingProgramMatches } from "@/lib/matches";
import { getHeadToHeadSummary } from "@/lib/stats";
import { getCurrentUser } from "@/supabase/server";

type HomePageProps = {
  searchParams?: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const [currentUser, headToHeadResult, adminState] = await Promise.all([getCurrentUser(), getHeadToHeadSummary(), getAdminState()]);
  const [programResultResolved, recentResultResolved] = await Promise.all([
    getUpcomingProgramMatches(3, currentUser?.id),
    getRecentCompletedMatches(3, currentUser?.id)
  ]);
  const { error, isConfigured, matches } = programResultResolved;
  const recentMatches = recentResultResolved.matches;
  const heroSummary = headToHeadResult.summary;

  return (
    <div className="space-y-10 sm:space-y-14">
      <QueryToast error={params?.error} message={params?.message} />

      <section className="mx-auto grid max-w-5xl gap-3 rounded-[8px] bg-court-navy p-3 text-white shadow-panel md:grid-cols-[1.05fr_0.95fr] md:gap-4 md:p-5">
        <div className="flex flex-col justify-center gap-4 sm:gap-6">
          <div className="space-y-3 sm:space-y-4">
            <p className="text-[13px] font-semibold uppercase text-court-cyan sm:text-sm">
              Volejbal Tatry
            </p>
            <h1 className="max-w-2xl text-xl font-black leading-tight sm:text-3xl">
              Energia pod sieťou, prehľad pre celý tím.
            </h1>
          </div>
        </div>
        <div className="relative min-h-[140px] overflow-hidden rounded-[8px] border border-white/10 sm:min-h-[160px]">
          <Image
            src="https://images.unsplash.com/photo-1592656094267-764a45160876?auto=format&fit=crop&w=1200&q=80"
            alt="Volleyball team preparing on an indoor court"
            fill
            priority
            sizes="(min-width: 768px) 44vw, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-court-navy/30" />
          <div className="absolute bottom-2.5 left-2.5 right-2.5 rounded-[8px] bg-court-navy/85 p-2.5 sm:bottom-3 sm:left-3 sm:right-3 sm:p-3">
            <p className="text-xs font-black uppercase text-court-cyan">
              {heroSummary ? `${heroSummary.leftName} vs. ${heroSummary.rightName}` : "Tatry vs. Ostatní"}
            </p>
            <div className="mt-2.5 space-y-2 text-[13px] sm:mt-3 sm:text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="font-bold text-court-line">Víťazné zápasy</span>
                <span className="font-black text-white">
                  {heroSummary ? `${heroSummary.leftWins} - ${heroSummary.rightWins}` : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="font-bold text-court-line">Víťazné sety</span>
                <span className="font-black text-white">
                  {heroSummary ? `${heroSummary.leftSetWins} - ${heroSummary.rightSetWins}` : "-"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <PageHeader
            eyebrow="Program"
            title="Najbližšie zápasy"
          />
          {adminState.isAdmin ? (
            <Link href="/admin/matches/new" className={buttonClasses({ variant: "secondary" })}>
              <CalendarPlus className="mr-2 h-4 w-4" />
              Nový zápas
            </Link>
          ) : null}
        </div>
        {error ? (
          <Card className="border-red-200 bg-red-50">
            <p className="text-sm font-bold text-red-700">{error}</p>
          </Card>
        ) : null}
        {!isConfigured ? (
          <Card>
            <p className="text-sm leading-6 text-court-blue">
              Program sa načíta z databázy po nakonfigurovaní Supabase.
            </p>
          </Card>
        ) : null}
        {isConfigured && matches.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {matches.map((match) => (
              <MatchListCard
                key={match.id}
                match={match}
              >
                <HomeMatchSignupPanel
                  isConfigured={isConfigured}
                  matchId={match.id}
                  currentUserResponse={match.currentUserResponse}
                  players={match.signupPlayers}
                  returnPath="/"
                  userId={currentUser?.id ?? null}
                />
              </MatchListCard>
            ))}
          </div>
        ) : null}
        {isConfigured && matches.length === 0 ? (
          <Card>
            <p className="text-sm font-black uppercase text-court-mint">Bez plánu</p>
            <p className="mt-2 text-sm leading-6 text-court-blue">
              Zatiaľ nie je naplánovaný žiaden ďalší zápas od dnešného dátumu.
            </p>
          </Card>
        ) : null}
      </section>

      <section className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <PageHeader eyebrow="Výsledky" title="Posledné zápasy" />
          <Link href="/matches" className={buttonClasses({ variant: "secondary" })}>
            Zápasy
          </Link>
        </div>

        {isConfigured && recentMatches.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {recentMatches.map((match) => (
              <MatchListCard key={match.id} match={match} />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
