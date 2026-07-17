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
      <PageHeader eyebrow="Turnaj" title={`${bundle.tournament.name} · Skupiny`} description="Tabuľka skupiny je čitateľná na mobile, detailné sety a body sa rozbalia po riadkoch." homeHref={`/tournaments/${slug}`} />

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
        {snapshot?.entries.length ? snapshot.entries.map((entry) => {
          const isAdvancing = entry.position <= 2;

          return (
            <Card key={entry.teamId} className={isAdvancing ? "border-court-mint" : undefined}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-court-mint">#{entry.position}{isAdvancing ? " · postup" : ""}</p>
                  <h3 className="mt-1 text-lg font-black text-court-ink">{entry.teamName ?? entry.teamId}</h3>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black uppercase text-court-blue">Body</p>
                  <p className="text-2xl font-black text-court-ink">{entry.tablePoints}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2 text-center text-sm">
                <div className="rounded-[8px] bg-court-ice px-2 py-2">
                  <p className="text-[11px] font-black uppercase text-court-blue">Z</p>
                  <p className="font-black text-court-ink">{entry.played}</p>
                </div>
                <div className="rounded-[8px] bg-court-ice px-2 py-2">
                  <p className="text-[11px] font-black uppercase text-court-blue">V</p>
                  <p className="font-black text-court-ink">{entry.wins}</p>
                </div>
                <div className="rounded-[8px] bg-court-ice px-2 py-2">
                  <p className="text-[11px] font-black uppercase text-court-blue">R</p>
                  <p className="font-black text-court-ink">{entry.draws}</p>
                </div>
                <div className="rounded-[8px] bg-court-ice px-2 py-2">
                  <p className="text-[11px] font-black uppercase text-court-blue">P</p>
                  <p className="font-black text-court-ink">{entry.losses}</p>
                </div>
              </div>

              <details className="mt-4 rounded-[8px] border border-court-line px-4 py-3">
                <summary className="cursor-pointer text-sm font-black text-court-ink">Sety a body</summary>
                <div className="mt-3 grid gap-2 text-sm text-court-blue">
                  <p>Sety: <span className="font-bold text-court-ink">{entry.setsFor}:{entry.setsAgainst}</span> ({entry.setDifference >= 0 ? "+" : ""}{entry.setDifference})</p>
                  <p>Body: <span className="font-bold text-court-ink">{entry.rallyPointsFor}:{entry.rallyPointsAgainst}</span> ({entry.rallyPointDifference >= 0 ? "+" : ""}{entry.rallyPointDifference})</p>
                </div>
              </details>
            </Card>
          );
        }) : (
          <Card>
            <p className="text-sm font-bold text-court-ink">Tabuľka skupiny ešte nie je pripravená.</p>
            <p className="mt-2 text-sm text-court-blue">Výsledky sa zobrazia po odohraní a vyhodnotení skupinových zápasov.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
