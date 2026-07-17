import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { TournamentSectionNav } from "@/components/tournaments/public-section-nav";
import { TournamentPublicMatchCard } from "@/components/tournaments/public-match-card";
import { Card } from "@/components/ui/card";
import {
  formatTournamentDateTime,
  sortTournamentMatchesChronologically,
  sortTournamentMatchesLatestFirst
} from "@/lib/tournament-public";
import { createTournamentRepository } from "@/src/server/tournaments";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function TournamentOverviewPage({ params }: PageProps) {
  const { slug } = await params;
  const repository = await createTournamentRepository();
  const bundleResult = await repository.getTournamentBundleBySlug(slug);

  if (!bundleResult.ok) {
    notFound();
  }

  const bundle = bundleResult.data;
  const nextMatches = sortTournamentMatchesChronologically(
    bundle.matches.filter((match) => match.status !== "completed" && match.status !== "cancelled")
  ).slice(0, 3);
  const latestResults = sortTournamentMatchesLatestFirst(bundle.matches.filter((match) => match.status === "completed")).slice(0, 3);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Turnaj"
        title={bundle.tournament.name}
        description={`${formatTournamentDateTime(bundle.tournament.starts_at, { dateStyle: "full", timeStyle: "short" })} · ${bundle.tournament.location ?? "Miesto bude doplnené"}`}
        homeHref="/"
      />

      <TournamentSectionNav
        items={[
          { href: `/tournaments/${slug}/groups`, label: "Skupiny" },
          { href: `/tournaments/${slug}/results`, label: "Výsledky" }
        ]}
      />

      <Card className="grid gap-2 bg-court-ice">
        <p className="text-sm font-black uppercase text-court-mint">Aktuálny stav</p>
        <p className="text-lg font-black text-court-ink">{bundle.tournament.status}</p>
        <p className="text-sm text-court-blue">
          Zápasy: {bundle.matches.filter((match) => match.status === "completed").length}/{bundle.matches.length} dokončených
        </p>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-court-ink">Najbližšie zápasy</h2>
        </div>
        {nextMatches.length > 0 ? (
          <div className="grid gap-3">
            {nextMatches.map((match) => (
              <TournamentPublicMatchCard key={match.id} bundle={bundle} match={match} showDetails={false} />
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-sm text-court-blue">Ďalšie zápasy zatiaľ nie sú naplánované.</p>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-black text-court-ink">Posledné výsledky</h2>
        {latestResults.length > 0 ? (
          <div className="grid gap-3">
            {latestResults.map((match) => (
              <TournamentPublicMatchCard key={match.id} bundle={bundle} match={match} />
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-sm text-court-blue">Zatiaľ nie je zverejnený žiaden výsledok.</p>
          </Card>
        )}
      </section>
    </div>
  );
}
