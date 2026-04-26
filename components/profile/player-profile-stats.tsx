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
    <div className="space-y-6">
      <Card>
        <p className="text-sm font-black uppercase text-court-mint">Ročná štatistika</p>
        <h2 className="mt-2 text-2xl font-black text-court-ink">{yearlyTitle}</h2>

        {profile.yearlyStats.length > 0 ? (
          <div className="mt-5 space-y-4">
            {profile.yearlyStats.map((year) => (
              <div key={year.year} className="rounded-[8px] bg-court-ice p-4">
                <p className="text-sm font-black uppercase text-court-blue">{year.year}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[8px] bg-white p-4">
                    <p className="text-xs font-black uppercase text-court-blue">Zápasy</p>
                    <p className="mt-2 text-sm font-black text-court-ink">
                      {year.wins} výhry / {year.losses} prehry
                    </p>
                    <p className="mt-1 text-sm text-court-blue">
                      {year.winRate}% výhra / {year.lossRate}% prehra
                    </p>
                  </div>
                  <div className="rounded-[8px] bg-white p-4">
                    <p className="text-xs font-black uppercase text-court-blue">Sety</p>
                    <p className="mt-2 text-sm font-black text-court-ink">
                      {year.wonSets} víťazné / {year.lostSets} prehraté
                    </p>
                    <p className="mt-1 text-sm text-court-blue">
                      {year.wonSetsRate}% výhra / {year.lostSetsRate}% prehra
                    </p>
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
        <div className="border-b border-court-line px-5 py-5">
          <p className="text-sm font-black uppercase text-court-mint">História zápasov</p>
          <h2 className="mt-2 text-2xl font-black text-court-ink">Zápasy s účasťou hráča</h2>
        </div>

        {profile.history.length > 0 ? (
          <PlayerHistoryTable matches={profile.history} />
        ) : (
          <div className="px-5 py-5">
            <p className="text-sm leading-6 text-court-blue">{emptyHistoryText}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
