import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { TournamentSectionNav } from "@/components/tournaments/public-section-nav";
import { TournamentPublicMatchCard } from "@/components/tournaments/public-match-card";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { filterTournamentMatches, sortTournamentMatchesChronologically } from "@/lib/tournament-public";
import { createTournamentRepository } from "@/src/server/tournaments";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ court?: string; filter?: string }>;
};

const filters = [
  { key: "all", label: "Všetko" },
  { key: "group-a", label: "Sk. A" },
  { key: "group-b", label: "Sk. B" },
  { key: "playoffs", label: "Playoff" },
  { key: "completed", label: "Odohrané" },
  { key: "upcoming", label: "Najbližšie" }
] as const;

export default async function TournamentSchedulePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const repository = await createTournamentRepository();
  const bundleResult = await repository.getTournamentBundleBySlug(slug);

  if (!bundleResult.ok) {
    notFound();
  }

  const bundle = bundleResult.data;
  const selectedFilter = filters.some((item) => item.key === query?.filter) ? (query?.filter as typeof filters[number]["key"]) : "all";
  const uniqueCourts = Array.from(new Set(bundle.matches.map((match) => match.location?.trim()).filter((value): value is string => Boolean(value)))).sort((left, right) =>
    left.localeCompare(right, "sk")
  );
  const selectedCourt = query?.court ?? "all";
  const filteredMatches = sortTournamentMatchesChronologically(filterTournamentMatches(bundle, selectedFilter, selectedCourt));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Turnaj" title={`${bundle.tournament.name} · Program`} description="Chronologický program zápasov optimalizovaný pre mobilný prehľad." homeHref={`/tournaments/${slug}`} />

      <TournamentSectionNav
        items={[
          { href: `/tournaments/${slug}`, label: "Prehľad" },
          { href: `/tournaments/${slug}/results`, label: "Výsledky" },
          { href: `/tournaments/${slug}/groups`, label: "Skupiny" },
          { href: `/tournaments/${slug}/playoffs`, label: "Nadstavba" }
        ]}
      />

      <div className="space-y-3">
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-2">
            {filters.map((filter) => (
              <Link
                key={filter.key}
                href={`/tournaments/${slug}/schedule?filter=${filter.key}${selectedCourt !== "all" ? `&court=${encodeURIComponent(selectedCourt)}` : ""}`}
                className={buttonClasses({ className: "shrink-0", variant: selectedFilter === filter.key ? "primary" : "secondary" })}
              >
                {filter.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="flex gap-2">
            <Link
              href={`/tournaments/${slug}/schedule?filter=${selectedFilter}`}
              className={buttonClasses({ className: "shrink-0", variant: selectedCourt === "all" ? "primary" : "secondary" })}
            >
              Všetky ihriská
            </Link>
            {uniqueCourts.map((court) => (
              <Link
                key={court}
                href={`/tournaments/${slug}/schedule?filter=${selectedFilter}&court=${encodeURIComponent(court)}`}
                className={buttonClasses({ className: "shrink-0", variant: selectedCourt === court ? "primary" : "secondary" })}
              >
                {court}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {filteredMatches.length > 0 ? (
        <div className="grid gap-3">
          {filteredMatches.map((match) => (
            <TournamentPublicMatchCard key={match.id} bundle={bundle} match={match} />
          ))}
        </div>
      ) : (
        <Card>
          <p className="text-sm text-court-blue">Tomuto filtru momentálne nezodpovedá žiaden zápas.</p>
        </Card>
      )}
    </div>
  );
}
