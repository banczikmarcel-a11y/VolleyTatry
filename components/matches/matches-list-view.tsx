"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { formatMatchDay, formatMatchStatus, getSetsRatio, getWinningTeamName } from "@/lib/match-display";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { MatchSummary } from "@/lib/matches";

type MatchesListViewProps = {
  matches: MatchSummary[];
};

type StatusFilter = "" | "cancelled" | "completed" | "scheduled";

const STORAGE_KEY = "matches-list-filters-v1";

export function MatchesListView({ matches }: MatchesListViewProps) {
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("completed");

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as {
        dateFromFilter?: string;
        dateToFilter?: string;
        statusFilter?: StatusFilter;
      };

      setDateFromFilter(parsed.dateFromFilter ?? "");
      setDateToFilter(parsed.dateToFilter ?? "");
      setStatusFilter(parsed.statusFilter ?? "completed");
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        dateFromFilter,
        dateToFilter,
        statusFilter
      })
    );
  }, [dateFromFilter, dateToFilter, statusFilter]);

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      const matchDate = new Date(match.startsAt);

      if (dateFromFilter) {
        const from = new Date(dateFromFilter);
        from.setHours(0, 0, 0, 0);

        if (matchDate < from) {
          return false;
        }
      }

      if (dateToFilter) {
        const to = new Date(dateToFilter);
        to.setHours(23, 59, 59, 999);

        if (matchDate > to) {
          return false;
        }
      }

      if (statusFilter && match.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [dateFromFilter, dateToFilter, matches, statusFilter]);

  const sortedMatches = useMemo(() => {
    return [...filteredMatches].sort((left, right) => new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime());
  }, [filteredMatches]);

  function clearFilters() {
    setDateFromFilter("");
    setDateToFilter("");
    setStatusFilter("completed");
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <div className="space-y-4">
      <Card className="sticky top-[76px] z-20 p-3 shadow-panel sm:p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_auto] md:items-end">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <label className="block">
              <span className="text-xs font-black uppercase text-court-blue">Dátum od</span>
              <input
                type="date"
                value={dateFromFilter}
                onChange={(event) => setDateFromFilter(event.target.value)}
                className="focus-ring mt-1.5 w-full rounded-[8px] border border-court-line bg-white px-2.5 py-2 text-sm font-bold text-court-ink sm:px-3 sm:py-2.5"
              />
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase text-court-blue">Dátum do</span>
              <input
                type="date"
                value={dateToFilter}
                onChange={(event) => setDateToFilter(event.target.value)}
                className="focus-ring mt-1.5 w-full rounded-[8px] border border-court-line bg-white px-2.5 py-2 text-sm font-bold text-court-ink sm:px-3 sm:py-2.5"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-black uppercase text-court-blue">Stav zápasu</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="focus-ring mt-1.5 w-full rounded-[8px] border border-court-line bg-white px-2.5 py-2 text-sm font-bold text-court-ink sm:px-3 sm:py-2.5"
            >
              <option value="completed">Ukončené</option>
              <option value="scheduled">Plánované</option>
              <option value="cancelled">Zrušené</option>
              <option value="">Všetky</option>
            </select>
          </label>
          <button
            type="button"
            onClick={clearFilters}
            className={buttonClasses({ className: "w-full md:w-auto", variant: "secondary" })}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Zmazať filter
          </button>
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="min-w-[760px] w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-court-ice">
            <tr className="border-b border-court-line">
              <th className="px-4 py-3 text-xs font-black uppercase text-court-blue">Dátum</th>
              <th className="px-4 py-3 text-xs font-black uppercase text-court-blue">Víťaz</th>
              <th className="px-4 py-3 text-xs font-black uppercase text-court-blue">Sety</th>
              <th className="px-4 py-3 text-xs font-black uppercase text-court-blue">Hráčov</th>
              <th className="px-4 py-3 text-xs font-black uppercase text-court-blue">Detail</th>
              <th className="px-4 py-3 text-xs font-black uppercase text-court-blue">Stav</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-court-line">
            {sortedMatches.map((match) => (
              <tr key={match.id}>
                <td className="px-4 py-3 text-sm font-black text-court-ink">{formatMatchDay(match.startsAt)}</td>
                <td className="px-4 py-3 text-sm font-black text-court-ink">{getWinningTeamName(match)}</td>
                <td className="px-4 py-3 text-sm font-black text-court-blue">{getSetsRatio(match)}</td>
                <td className="px-4 py-3 text-sm font-black text-court-ink">{match.availablePlayersCount}</td>
                <td className="px-4 py-3">
                  <Link href={`/matches/${match.id}`} className={buttonClasses({ className: "px-2.5 py-1.5 text-xs sm:px-3 sm:text-sm", variant: "secondary" })}>
                    Detail
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm font-black text-court-ink">{formatMatchStatus(match.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
