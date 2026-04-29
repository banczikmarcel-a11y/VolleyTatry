import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { getYearlyWins } from "@/lib/stats";

const TEAM_COLORS = {
  ostatni: {
    chart: "#ff8f6b",
    row: "bg-court-coral/10",
    text: "text-court-coral"
  },
  tatry: {
    chart: "#18c7a7",
    row: "bg-court-mint/15",
    text: "text-court-forest"
  }
} as const;

function getPieStyle(leftWins: number, rightWins: number) {
  const total = leftWins + rightWins;
  const leftRatio = total === 0 ? 50 : Math.round((leftWins / total) * 100);

  return {
    background: `conic-gradient(${TEAM_COLORS.tatry.chart} 0 ${leftRatio}%, ${TEAM_COLORS.ostatni.chart} ${leftRatio}% 100%)`
  };
}

export default async function DashboardPage() {
  const { error: yearlyWinsError, isConfigured, years } = await getYearlyWins();

  const totalSummary = years.reduce(
    (summary, yearRecord) => {
      yearRecord.teams.forEach((team) => {
        if (team.slug === "tatry") {
          summary.tatry += team.wins;
        }

        if (team.slug === "ostatni") {
          summary.ostatni += team.wins;
        }
      });

      return summary;
    },
    { ostatni: 0, tatry: 0 }
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader eyebrow="Dashboard" title="Tímový prehľad" homeHref="/" />

      <section className="space-y-4">
        <div>
          <p className="text-sm font-black uppercase text-court-mint">Výhry po rokoch</p>
          <h2 className="mt-2 text-2xl font-black text-court-ink">Tatry vs. Ostatní</h2>
        </div>

        {yearlyWinsError ? (
          <Card className="border-red-200 bg-red-50">
            <p className="text-sm font-bold text-red-700">{yearlyWinsError}</p>
          </Card>
        ) : null}

        {!isConfigured ? (
          <Card>
            <p className="text-sm leading-6 text-court-blue">
              Štatistiky sa zobrazia po pripojení Supabase a doplnení zápasov so stavom completed.
            </p>
          </Card>
        ) : null}

        {isConfigured && years.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="grid gap-4 xl:grid-cols-2">
              {years.map((yearRecord) => (
                <Card key={yearRecord.year}>
                  <p className="text-[13px] font-black uppercase text-court-blue sm:text-sm">{yearRecord.year}</p>
                  <div className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">
                    {yearRecord.teams.map((team) => (
                      <div
                        key={`${yearRecord.year}-${team.slug}`}
                        className={`flex items-center justify-between rounded-[8px] px-3 py-2.5 sm:px-4 sm:py-3 ${team.slug === "tatry" ? TEAM_COLORS.tatry.row : TEAM_COLORS.ostatni.row}`}
                      >
                        <p className="font-black text-court-ink">{team.name}</p>
                        <span className={`text-lg font-black sm:text-xl ${team.slug === "tatry" ? TEAM_COLORS.tatry.text : TEAM_COLORS.ostatni.text}`}>{team.wins}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>

            <Card className="flex flex-col items-center justify-center">
              <p className="text-[13px] font-black uppercase text-court-blue sm:text-sm">Tatry vs. Ostatní</p>
              <div className="mt-4 h-36 w-36 rounded-full sm:mt-5 sm:h-44 sm:w-44" style={getPieStyle(totalSummary.tatry, totalSummary.ostatni)} />
              <div className="mt-4 grid w-full gap-2.5 sm:mt-5 sm:gap-3">
                <div className="flex items-center justify-between rounded-[8px] bg-court-ice px-3 py-2.5 sm:px-4 sm:py-3">
                  <p className="font-black text-court-ink">Tatry</p>
                  <span className={`font-black ${TEAM_COLORS.tatry.text}`}>{totalSummary.tatry}</span>
                </div>
                <div className="flex items-center justify-between rounded-[8px] bg-court-ice px-3 py-2.5 sm:px-4 sm:py-3">
                  <p className="font-black text-court-ink">Ostatní</p>
                  <span className={`font-black ${TEAM_COLORS.ostatni.text}`}>{totalSummary.ostatni}</span>
                </div>
              </div>
            </Card>
          </div>
        ) : null}
      </section>
    </div>
  );
}
