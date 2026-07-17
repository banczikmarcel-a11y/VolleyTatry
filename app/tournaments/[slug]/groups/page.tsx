import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { TournamentSectionNav } from "@/components/tournaments/public-section-nav";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createTournamentRepository, createTournamentService } from "@/src/server/tournaments";
import type { GroupStandingsSnapshot } from "@/src/server/tournaments";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ group?: string }>;
};

export default async function TournamentGroupsPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const repository = await createTournamentRepository();
  const service = await createTournamentService();
  const bundleResult = await repository.getTournamentBundleBySlug(slug);

  if (!bundleResult.ok) {
    notFound();
  }

  const bundle = bundleResult.data;
  const standingsResult = await service.recalculateStandings(bundle.tournament.id);

  if (!standingsResult.ok) {
    return (
      <Card className="border-red-200 bg-red-50">
        <p className="text-sm font-bold text-red-700">{standingsResult.error.message}</p>
      </Card>
    );
  }

  const standings = standingsResult.data as GroupStandingsSnapshot[];
  const selectedGroup = query?.group === "B" ? "B" : "A";
  const snapshot = standings.find((item) => item.groupCode === selectedGroup) ?? standings[0];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Turnaj" title={`${bundle.tournament.name} · Skupiny`} description="Jednoduchá tabuľka skupiny s poradím, bodmi, setmi a loptami." homeHref={`/tournaments/${slug}`} />

      <TournamentSectionNav
        items={[
          { href: `/tournaments/${slug}`, label: "Prehľad" },
          { href: `/tournaments/${slug}/schedule`, label: "Program" },
          { href: `/tournaments/${slug}/results`, label: "Výsledky" },
          { href: `/tournaments/${slug}/playoffs`, label: "Nadstavba" }
        ]}
      />

      <div className="flex flex-wrap gap-2">
        {["A", "B"].map((groupCode) => (
          <Link
            key={groupCode}
            href={`/tournaments/${slug}/groups?group=${groupCode}`}
            className={buttonClasses({ variant: selectedGroup === groupCode ? "primary" : "secondary" })}
          >
            Skupina {groupCode}
          </Link>
        ))}
      </div>

      <div className="grid gap-3">
        {snapshot?.entries.length ? (
          <Card className="overflow-x-auto p-0">
            <table className="min-w-full text-sm">
              <thead className="bg-court-ice text-court-blue">
                <tr>
                  <th className="px-3 py-3 text-left font-black">#</th>
                  <th className="px-3 py-3 text-left font-black">Družstvo</th>
                  <th className="px-3 py-3 text-center font-black">Z</th>
                  <th className="px-3 py-3 text-center font-black">V</th>
                  <th className="px-3 py-3 text-center font-black">R</th>
                  <th className="px-3 py-3 text-center font-black">P</th>
                  <th className="px-3 py-3 text-center font-black">B</th>
                  <th className="px-3 py-3 text-center font-black">Sety</th>
                  <th className="px-3 py-3 text-center font-black">Lopty</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.entries.map((entry) => {
                  const isAdvancing = entry.position <= 2;

                  return (
                    <tr key={entry.teamId} className={isAdvancing ? "bg-court-ice/60" : "border-t border-court-line"}>
                      <td className="px-3 py-3 align-top font-black text-court-ink">
                        {entry.position}
                        {isAdvancing ? <span className="ml-1 text-xs uppercase text-court-mint">postup</span> : null}
                      </td>
                      <td className="px-3 py-3 align-top font-bold text-court-ink">{entry.teamName ?? entry.teamId}</td>
                      <td className="px-3 py-3 text-center font-bold text-court-ink">{entry.played}</td>
                      <td className="px-3 py-3 text-center font-bold text-court-ink">{entry.wins}</td>
                      <td className="px-3 py-3 text-center font-bold text-court-ink">{entry.draws}</td>
                      <td className="px-3 py-3 text-center font-bold text-court-ink">{entry.losses}</td>
                      <td className="px-3 py-3 text-center font-black text-court-ink">{entry.tablePoints}</td>
                      <td className="px-3 py-3 text-center text-court-ink">
                        {entry.setsFor}:{entry.setsAgainst}
                        <span className="ml-1 text-xs text-court-blue">({entry.setDifference >= 0 ? "+" : ""}{entry.setDifference})</span>
                      </td>
                      <td className="px-3 py-3 text-center text-court-ink">
                        {entry.rallyPointsFor}:{entry.rallyPointsAgainst}
                        <span className="ml-1 text-xs text-court-blue">({entry.rallyPointDifference >= 0 ? "+" : ""}{entry.rallyPointDifference})</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        ) : (
          <Card>
            <p className="text-sm font-bold text-court-ink">Tabuľka skupiny ešte nie je pripravená.</p>
            <p className="mt-2 text-sm text-court-blue">Výsledky sa zobrazia po odohraní a vyhodnotení skupinových zápasov.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
