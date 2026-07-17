import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { TournamentSectionNav } from "@/components/tournaments/public-section-nav";
import { TournamentPublicMatchCard } from "@/components/tournaments/public-match-card";
import { Card } from "@/components/ui/card";
import { createTournamentRepository } from "@/src/server/tournaments";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const bracketOrder = [
  "semifinal_1",
  "semifinal_2",
  "final",
  "bronze",
  "placement_5",
  "placement_7",
  "placement_9"
] as const;

export default async function TournamentPlayoffsPage({ params }: PageProps) {
  const { slug } = await params;
  const repository = await createTournamentRepository();
  const bundleResult = await repository.getTournamentBundleBySlug(slug);

  if (!bundleResult.ok) {
    notFound();
  }

  const bundle = bundleResult.data;
  const playoffMatches = bracketOrder
    .map((key) => bundle.matches.find((match) => match.bracket_key === key))
    .filter((match): match is NonNullable<typeof match> => match !== undefined);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Turnaj" title={`${bundle.tournament.name} · Nadstavba`} description="Vertikálny mobilný bracket s unresolved placeholdermi aj finálnym poradím." homeHref={`/tournaments/${slug}`} />

      <TournamentSectionNav
        items={[
          { href: `/tournaments/${slug}`, label: "Prehľad" },
          { href: `/tournaments/${slug}/schedule`, label: "Program" },
          { href: `/tournaments/${slug}/results`, label: "Výsledky" },
          { href: `/tournaments/${slug}/groups`, label: "Skupiny" }
        ]}
      />

      <div className="grid gap-3">
        {playoffMatches.length > 0 ? (
          playoffMatches.map((match) => <TournamentPublicMatchCard key={match.id} bundle={bundle} match={match} />)
        ) : (
          <Card>
            <p className="text-sm text-court-blue">Nadstavba ešte nebola vygenerovaná.</p>
          </Card>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-black text-court-ink">Konečné poradie</h2>
        {bundle.finalStandings.length > 0 ? (
          <div className="grid gap-3">
            {bundle.finalStandings
              .slice()
              .sort((left, right) => left.final_position - right.final_position)
              .map((standing) => {
                const team = bundle.teams.find((item) => item.id === standing.tournament_team_id);

                return (
                  <Card key={standing.id} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase text-court-mint">#{standing.final_position}</p>
                      <h3 className="mt-1 text-lg font-black text-court-ink">{team?.display_name ?? team?.teamName ?? standing.tournament_team_id}</h3>
                    </div>
                    {standing.notes ? <p className="text-sm text-court-blue">{standing.notes}</p> : null}
                  </Card>
                );
              })}
          </div>
        ) : (
          <Card>
            <p className="text-sm text-court-blue">Finálne poradie sa zobrazí po uzavretí turnaja.</p>
          </Card>
        )}
      </section>
    </div>
  );
}
