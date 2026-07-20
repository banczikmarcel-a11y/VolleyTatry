import Link from "next/link";
import { AlertCircle, CalendarPlus } from "lucide-react";
import { MatchesListView } from "@/components/matches/matches-list-view";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QueryToast } from "@/components/ui/query-toast";
import { getMatches } from "@/lib/matches";
import { requireApplicationUser } from "@/src/server/auth";

type MatchesPageProps = {
  searchParams?: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function MatchesPage({ searchParams }: MatchesPageProps) {
  const params = await searchParams;
  const session = await requireApplicationUser("/matches");
  const { error, isConfigured, matches } = await getMatches(session.profileId);

  return (
    <div className="space-y-6 sm:space-y-8">
      <QueryToast error={params?.error} message={params?.message} />
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <Link href="/" className="text-sm font-black text-court-blue underline decoration-court-mint underline-offset-4">
            Domov
          </Link>
          <h1 className="text-[25px] font-black leading-tight text-court-ink">Zápasy</h1>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:gap-3">
          <Link href="/admin/matches/new" className={buttonClasses({ className: "shrink-0", variant: "secondary" })}>
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
        <MatchesListView matches={matches} />
      ) : (
        <Card>
          <p className="text-sm font-black uppercase text-court-mint">Žiadne zápasy</p>
          <h2 className="mt-2 text-2xl font-black text-court-ink">Kalendár je pripravený.</h2>
          <p className="mt-2 text-sm leading-6 text-court-blue">
            Po pridaní zápasov do tabuľky `matches` sa tu zobrazí zoznam s detailom a odpoveďami.
          </p>
        </Card>
      )}
    </div>
  );
}
