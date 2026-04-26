import Link from "next/link";
import { AlertCircle, CalendarPlus } from "lucide-react";
import { MatchListCard } from "@/components/matches/match-list-card";
import { MatchesListView } from "@/components/matches/matches-list-view";
import { PageHeader } from "@/components/page-header";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QueryToast } from "@/components/ui/query-toast";
import { getMatches } from "@/lib/matches";
import { getCurrentUser } from "@/supabase/server";

type MatchesPageProps = {
  searchParams?: Promise<{
    error?: string;
    message?: string;
    view?: string;
  }>;
};

export default async function MatchesPage({ searchParams }: MatchesPageProps) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const { error, isConfigured, matches } = await getMatches(user?.id);
  const view = params?.view === "card" ? "card" : "list";

  return (
    <div className="space-y-8">
      <QueryToast error={params?.error} message={params?.message} />
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader eyebrow="Zápasy" title="Zápasový kalendár" description="Prehľad termínov, miest a tímov s rýchlou cestou k potvrdeniu účasti." />
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="inline-flex rounded-[8px] border border-court-line bg-white p-1">
            <Link href="/matches?view=list" className={buttonClasses({ className: view === "list" ? "" : "bg-transparent", variant: view === "list" ? "primary" : "ghost" })}>
              Zoznam
            </Link>
            <Link href="/matches?view=card" className={buttonClasses({ className: view === "card" ? "" : "bg-transparent", variant: view === "card" ? "primary" : "ghost" })}>
              Karta
            </Link>
          </div>
          <Link href="/admin/matches/new" className={buttonClasses({ variant: "secondary" })}>
            <CalendarPlus className="mr-2 h-4 w-4" />
            Nový zápas
          </Link>
        </div>
      </div>

      {!isConfigured ? (
        <Card className="border-court-coral bg-court-coral/10">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-court-coral" />
            <div>
              <h2 className="font-black text-court-ink">Supabase nie je nakonfigurovaný</h2>
              <p className="mt-1 text-sm leading-6 text-court-blue">
                Doplň `.env.local`, spusti migrácie a zoznam zápasov sa načíta z databázy.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm font-bold text-red-700">{error}</p>
        </Card>
      ) : null}

      {matches.length > 0 ? (
        view === "card" ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {matches.map((match) => (
              <MatchListCard key={match.id} match={match} />
            ))}
          </div>
        ) : (
          <MatchesListView matches={matches} />
        )
      ) : (
        <Card>
          <p className="text-sm font-black uppercase text-court-mint">Žiadne zápasy</p>
          <h2 className="mt-2 text-2xl font-black text-court-ink">Kalendár je pripravený.</h2>
          <p className="mt-2 text-sm leading-6 text-court-blue">
            Po pridaní zápasov do tabuľky `matches` sa tu zobrazia karty alebo zoznam s detailom a odpoveďami.
          </p>
        </Card>
      )}
    </div>
  );
}
