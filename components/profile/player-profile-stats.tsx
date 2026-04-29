import { Card } from "@/components/ui/card";
import { PlayerHistoryTable } from "@/components/profile/player-history-table";
import type { PlayerProfileData } from "@/lib/profile";

type PlayerProfileStatsProps = {
  emptyHistoryText: string;
  profile: PlayerProfileData;
  yearlyTitle?: string;
};

export function PlayerProfileStats({
  emptyHistoryText,
  profile,
  yearlyTitle = "Výsledky hráča"
}: PlayerProfileStatsProps) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <Card className="p-3 sm:p-4">
        <div className="flex flex-wrap items-baseline gap-2">
          <p className="text-xs font-black uppercase text-court-mint sm:text-sm">Ročná štatistika</p>
          <span className="text-xs font-black text-court-blue sm:text-sm">&gt;</span>
          <h2 className="text-lg font-black text-court-ink sm:text-xl">{yearlyTitle}</h2>
        </div>

        {profile.yearlyStats.length > 0 ? (
          <div className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">
            {profile.yearlyStats.map((year) => (
              <div key={year.year} className="rounded-[8px] bg-court-ice p-2.5 sm:p-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <p className="text-xs font-black uppercase text-court-blue sm:text-sm">{year.year}</p>
                  <div className="flex flex-wrap items-baseline gap-2 text-sm font-black text-court-ink">
                    <span>Zápasy: {year.wins} | {year.losses}</span>
                    <span className="text-xs font-bold text-court-blue">{year.winRate}% | {year.lossRate}%</span>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-2 text-sm font-black text-court-ink">
                    <span>Sety: {year.wonSets} | {year.lostSets}</span>
                    <span className="text-xs font-bold text-court-blue">{year.wonSetsRate}% | {year.lostSetsRate}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-court-blue">Zatiaľ nie sú k dispozícii žiadne ukončené zápasy s účasťou tohto hráča.</p>
        )}
      </Card>

      <Card className="p-0">
        <div className="border-b border-court-line px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="text-xs font-black uppercase text-court-mint sm:text-sm">História zápasov</p>
            <span className="text-xs font-black text-court-blue sm:text-sm">&gt;</span>
            <h2 className="text-lg font-black text-court-ink sm:text-xl">Zápasy s účasťou hráča</h2>
          </div>
        </div>

        {profile.history.length > 0 ? (
          <PlayerHistoryTable matches={profile.history} />
        ) : (
          <div className="px-4 py-4 sm:px-5 sm:py-5">
            <p className="text-sm leading-6 text-court-blue">{emptyHistoryText}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
