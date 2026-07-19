import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { TournamentSectionNav } from "@/components/tournaments/public-section-nav";
import { TournamentPublicMatchCard } from "@/components/tournaments/public-match-card";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { filterTournamentMatches, getTournamentFinalStandingsOverview, sortTournamentMatchesLatestFirst } from "@/lib/tournament-public";
import { createTournamentRepository } from "@/src/server/tournaments";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ tab?: string }>;
};

const tabs = [
  { key: "all", label: "Všetko" },
  { key: "group-a", label: "Sk. A" },
  { key: "group-b", label: "Sk. B" },
  { key: "playoffs", label: "Playoff" }
] as const;

export default async function TournamentResultsPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const repository = await createTournamentRepository();
  const bundleResult = await repository.getTournamentBundleBySlug(slug);

  if (!bundleResult.ok) {
    notFound();
  }

  const bundle = bundleResult.data;
  const selectedTab = tabs.some((item) => item.key === query?.tab) ? (query?.tab as typeof tabs[number]["key"]) : "all";
  const matches = sortTournamentMatchesLatestFirst(
    filterTournamentMatches(bundle, selectedTab, null).filter((match) => match.status === "completed")
  );
  const finalStandings = getTournamentFinalStandingsOverview(bundle);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Turnaj" title={`${bundle.tournament.name} · Výsledky`} description="História odohraných zápasov so setmi aj celkovými bodmi." homeHref={`/tournaments/${slug}`} />

      <TournamentSectionNav
        items={[
          { href: `/tournaments/${slug}`, label: "Prehľad" },
          { href: `/tournaments/${slug}/schedule`, label: "Program" },
          { href: `/tournaments/${slug}/groups`, label: "Skupiny" },
          { href: `/tournaments/${slug}/playoffs`, label: "Nadstavba" }
        ]}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-black text-court-ink">Konečné poradie</h2>
        {finalStandings.length > 0 ? (
          <Card className="overflow-x-auto p-0">
            <table className="min-w-full text-sm">
              <thead className="bg-court-ice text-court-blue">
                <tr>
                  <th className="px-3 py-3 text-left font-black">#</th>
                  <th className="px-3 py-3 text-left font-black">Družstvo</th>
                  <th className="px-3 py-3 text-center font-black">Z</th>
                  <th className="px-3 py-3 text-center font-black">V</th>
                  <th className="px-3 py-3 text-center font-black">P</th>
                  <th className="px-3 py-3 text-center font-black">Lopty</th>
                  <th className="px-3 py-3 text-center font-black">Sk.</th>
                </tr>
              </thead>
              <tbody>
                {finalStandings.map((row, index) => (
                  <tr key={row.teamId} className={index < finalStandings.length - 1 ? "border-b border-court-line" : undefined}>
                    <td className="px-3 py-3 font-black text-court-mint">{row.position}</td>
                    <td className="px-3 py-3 font-bold text-court-ink">{row.teamName}</td>
                    <td className="px-3 py-3 text-center text-court-blue">{row.played}</td>
                    <td className="px-3 py-3 text-center text-court-blue">{row.wins}</td>
                    <td className="px-3 py-3 text-center text-court-blue">{row.losses}</td>
                    <td className="px-3 py-3 text-center text-court-blue">{row.pointsFor}:{row.pointsAgainst}</td>
                    <td className="px-3 py-3 text-center text-court-blue">{row.groupCode ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-court-blue">Konečné poradie sa zobrazí po uzavretí turnaja.</p>
          </Card>
        )}
      </section>

      <div className="overflow-x-auto pb-1">
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={`/tournaments/${slug}/results?tab=${tab.key}`}
              className={buttonClasses({ className: "shrink-0", variant: selectedTab === tab.key ? "primary" : "secondary" })}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {matches.length > 0 ? (
        <div className="grid gap-3">
          {matches.map((match) => (
            <TournamentPublicMatchCard key={match.id} bundle={bundle} match={match} />
          ))}
        </div>
      ) : (
        <Card>
          <p className="text-sm text-court-blue">Pre tento výber zatiaľ nie sú k dispozícii žiadne odohrané zápasy.</p>
        </Card>
      )}
    </div>
  );
}
