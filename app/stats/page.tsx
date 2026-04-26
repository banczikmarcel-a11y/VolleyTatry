import Link from "next/link";
import { Filter } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PlayerProfileStats } from "@/components/profile/player-profile-stats";
import { AttendanceTable } from "@/components/stats/attendance-table";
import { PlayerStatsPicker } from "@/components/stats/player-stats-picker";
import { TeamRecordCard } from "@/components/stats/team-record-card";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAttendanceStats, getStats } from "@/lib/stats";
import { getPlayerOptions, getPlayerProfileById } from "@/lib/profile";
import { cn } from "@/lib/utils";

type StatsPageProps = {
  searchParams?: Promise<{
    month?: string;
    player?: string;
    quarter?: string;
    view?: string;
    year?: string;
  }>;
};

export default async function StatsPage({ searchParams }: StatsPageProps) {
  const params = await searchParams;
  const view = params?.view === "player" ? "player" : params?.view === "attendance" ? "attendance" : "team";
  const selectedPlayerId = params?.player?.trim() ? params.player : null;
  const [
    { availableMonths, availableQuarters, error, filteredMatchesCount, isConfigured, records, selectedMonth, selectedQuarter, selectedYear, years },
    { error: playersError, players, isConfigured: playersConfigured },
    playerProfileResult,
    attendanceResult
  ] = await Promise.all([
    getStats(params?.year, params?.quarter, params?.month),
    getPlayerOptions(),
    selectedPlayerId ? getPlayerProfileById(selectedPlayerId) : Promise.resolve({ error: null, isConfigured: true, profile: null }),
    getAttendanceStats(params?.year)
  ]);

  const buildStatsHref = (year: number, quarter?: number | null, month?: number | null) => {
    const query = new URLSearchParams({ year: String(year) });

    if (quarter) {
      query.set("quarter", String(quarter));
    }

    if (month) {
      query.set("month", String(month));
    }

    return `/stats?${query.toString()}`;
  };

  const selectedPlayerProfile = playerProfileResult.profile;
  const selectedPlayerError = playerProfileResult.error;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <PageHeader
          eyebrow="Stats"
          title={view === "player" ? "Štatistika hráča" : view === "attendance" ? "Účasť" : "Tímová bilancia"}
          description={
            view === "player"
              ? "Po výbere hráča sa zobrazí ročná bilancia a história jeho zápasov."
              : view === "attendance"
                ? "Mesačný prehľad potvrdenej účasti hráčov v ukončených zápasoch."
                : "Výhry a prehry podľa tímu, filtrované podľa sezóny. Počítajú sa iba ukončené zápasy."
          }
        />
      </div>

      <div className="inline-flex rounded-[8px] border border-court-line bg-white p-1">
        <Link href="/stats" className={buttonClasses({ className: view === "team" ? "" : "bg-transparent", variant: view === "team" ? "primary" : "ghost" })}>
          Tímová bilancia
        </Link>
        <Link
          href={selectedPlayerId ? `/stats?view=player&player=${selectedPlayerId}` : "/stats?view=player"}
          className={buttonClasses({ className: view === "player" ? "" : "bg-transparent", variant: view === "player" ? "primary" : "ghost" })}
        >
          Štatistika hráča
        </Link>
        <Link
          href="/stats?view=attendance"
          className={buttonClasses({ className: view === "attendance" ? "" : "bg-transparent", variant: view === "attendance" ? "primary" : "ghost" })}
        >
          Účasť
        </Link>
      </div>

      {view === "player" ? (
        <>
          <Card className="p-4">
            <PlayerStatsPicker players={players} selectedPlayerId={selectedPlayerId} />
          </Card>

          {!playersConfigured ? (
            <Card className="border-court-coral bg-court-coral/10">
              <p className="text-sm font-black uppercase text-court-coral">Supabase</p>
              <h2 className="mt-2 text-xl font-black text-court-ink">Štatistiky hráčov čakajú na databázu.</h2>
            </Card>
          ) : null}

          {playersError ? (
            <Card className="border-red-200 bg-red-50">
              <p className="text-sm font-bold text-red-700">{playersError}</p>
            </Card>
          ) : null}

          {selectedPlayerError ? (
            <Card className="border-red-200 bg-red-50">
              <p className="text-sm font-bold text-red-700">{selectedPlayerError}</p>
            </Card>
          ) : null}

          {selectedPlayerProfile ? (
            <PlayerProfileStats
              profile={selectedPlayerProfile}
              yearlyTitle={selectedPlayerProfile.fullName}
              emptyHistoryText="Zatiaľ sa tu nezobrazil žiadny ukončený zápas s potvrdenou účasťou."
            />
          ) : (
            <Card>
              <p className="text-sm font-black uppercase text-court-mint">Výber hráča</p>
              <p className="mt-2 text-sm leading-6 text-court-blue">Vyber hráča z comboboxu a zobrazí sa jeho štatistika.</p>
            </Card>
          )}
        </>
      ) : view === "attendance" ? (
        <>
          <Card className="p-3">
            <div className="space-y-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-black uppercase text-court-mint">
                  <Filter className="h-4 w-4" />
                  Rok
                </p>
                <h2 className="mt-2 text-lg font-black text-court-ink">Účasť hráčov - {attendanceResult.selectedYear}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {attendanceResult.years.map((year) => (
                  <Link
                    key={year}
                    href={`/stats?view=attendance&year=${year}`}
                    className={cn(buttonClasses({ variant: year === attendanceResult.selectedYear ? "primary" : "secondary" }), "px-3 py-1.5 text-xs")}
                  >
                    {year}
                  </Link>
                ))}
              </div>
            </div>
          </Card>

          {!attendanceResult.isConfigured ? (
            <Card className="border-court-coral bg-court-coral/10">
              <p className="text-sm font-black uppercase text-court-coral">Supabase</p>
              <h2 className="mt-2 text-xl font-black text-court-ink">Účasť čaká na databázu.</h2>
            </Card>
          ) : null}

          {attendanceResult.error ? (
            <Card className="border-red-200 bg-red-50">
              <p className="text-sm font-bold text-red-700">{attendanceResult.error}</p>
            </Card>
          ) : null}

          {attendanceResult.rows.length > 0 ? (
            <Card className="p-0">
              <AttendanceTable rows={attendanceResult.rows} />
            </Card>
          ) : (
            <Card>
              <p className="text-sm font-black uppercase text-court-mint">Bez účasti</p>
              <p className="mt-2 text-sm leading-6 text-court-blue">Pre zvolený rok sa ešte nenašli žiadne potvrdené účasti.</p>
            </Card>
          )}
        </>
      ) : (
        <>
      <Card className="p-4">
        <div className="space-y-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-black uppercase text-court-mint">
              <Filter className="h-4 w-4" />
              Filter
            </p>
            <h2 className="mt-2 text-xl font-black text-court-ink">Sezóna {selectedYear} - Počet zápasov {filteredMatchesCount}</h2>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {years.map((year) => (
                <Link
                  key={year}
                  href={buildStatsHref(year)}
                  className={cn(buttonClasses({ variant: year === selectedYear ? "primary" : "secondary" }), "px-3 py-1.5 text-xs")}
                >
                  {year}
                </Link>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href={buildStatsHref(selectedYear)} className={cn(buttonClasses({ variant: selectedQuarter === null ? "primary" : "secondary" }), "px-3 py-1.5 text-xs")}>
                Celý rok
              </Link>
              {availableQuarters.map((quarter) => (
                <Link
                  key={quarter}
                  href={buildStatsHref(selectedYear, quarter)}
                  className={cn(buttonClasses({ variant: selectedQuarter === quarter ? "primary" : "secondary" }), "px-3 py-1.5 text-xs")}
                >
                  Štvrťrok {quarter}
                </Link>
              ))}
            </div>

            {selectedQuarter !== null ? (
              <div className="flex flex-wrap gap-2">
                <Link
                  href={buildStatsHref(selectedYear, selectedQuarter)}
                  className={cn(buttonClasses({ variant: selectedMonth === null ? "primary" : "secondary" }), "px-3 py-1.5 text-xs")}
                >
                  Celý štvrťrok
                </Link>
                {availableMonths.map((month) => (
                  <Link
                    key={month}
                    href={buildStatsHref(selectedYear, selectedQuarter, month)}
                    className={cn(buttonClasses({ variant: selectedMonth === month ? "primary" : "secondary" }), "px-3 py-1.5 text-xs")}
                  >
                    Mesiac {month}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      {!isConfigured ? (
        <Card className="border-court-coral bg-court-coral/10">
          <p className="text-sm font-black uppercase text-court-coral">Supabase</p>
          <h2 className="mt-2 text-xl font-black text-court-ink">Štatistiky čakajú na databázu.</h2>
          <p className="mt-2 text-sm leading-6 text-court-blue">
            Doplň `.env.local`, migrácie a ukončené zápasy s výsledkom.
          </p>
        </Card>
      ) : null}

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm font-bold text-red-700">{error}</p>
        </Card>
      ) : null}

      {records.length > 0 ? (
        <section className="grid grid-cols-2 gap-2">
          {records.map((record) => (
            <TeamRecordCard key={record.slug} record={record} />
          ))}
        </section>
      ) : (
        <Card>
          <p className="text-sm font-black uppercase text-court-mint">Bez vysledkov</p>
          <h2 className="mt-2 text-xl font-black text-court-ink">Žiadne ukončené zápasy pre zvolené obdobie.</h2>
          <p className="mt-2 text-sm leading-6 text-court-blue">
            Štatistiky sa zobrazia po zápise zápasu so statusom `completed` a vyplnenými setmi.
          </p>
        </Card>
      )}
        </>
      )}
    </div>
  );
}
