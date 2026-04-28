"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, RotateCcw } from "lucide-react";
import { formatMatchDay, getSetsRatio, getWinningTeamName } from "@/lib/match-display";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { MatchSummary } from "@/lib/matches";

type MatchesListViewProps = {
  matches: MatchSummary[];
};

type SortKey = "availablePlayersCount" | "date" | "sets" | "winner";
type StatusFilter = "" | "cancelled" | "completed" | "scheduled";

const STORAGE_KEY = "matches-list-filters-v1";

function SortHeader({
  active,
  children,
  direction,
  onClick
}: {
  active: boolean;
  children: string;
  direction: "asc" | "desc";
  onClick: () => void;
}) {
  const Icon = !active ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-xs font-black uppercase text-court-blue transition hover:text-court-ink">
      {children}
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

export function MatchesListView({ matches }: MatchesListViewProps) {
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("completed");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

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
        sortDirection?: "asc" | "desc";
        sortKey?: SortKey;
      };

      setDateFromFilter(parsed.dateFromFilter ?? "");
      setDateToFilter(parsed.dateToFilter ?? "");
      setStatusFilter(parsed.statusFilter ?? "completed");
      setSortKey(parsed.sortKey ?? "date");
      setSortDirection(parsed.sortDirection ?? "desc");
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
        statusFilter,
        sortDirection,
        sortKey
      })
    );
  }, [dateFromFilter, dateToFilter, statusFilter, sortDirection, sortKey]);

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
  }, [dateFromFilter, dateToFilter, statusFilter, matches]);

  const sortedMatches = useMemo(() => {
    return [...filteredMatches].sort((left, right) => {
      const direction = sortDirection === "asc" ? 1 : -1;

      if (sortKey === "date") {
        return (new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()) * direction;
      }

      if (sortKey === "availablePlayersCount") {
        return (left.availablePlayersCount - right.availablePlayersCount) * direction;
      }

      if (sortKey === "winner") {
        return getWinningTeamName(left).localeCompare(getWinningTeamName(right), "sk", { sensitivity: "base" }) * direction;
      }

      return getSetsRatio(left).localeCompare(getSetsRatio(right), "sk", { numeric: true }) * direction;
    });
  }, [filteredMatches, sortDirection, sortKey]);

  const totalPlayers = sortedMatches.reduce((sum, match) => sum + match.availablePlayersCount, 0);

  function handleSort(nextKey: SortKey) {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "date" ? "desc" : "asc");
  }

  function clearFilters() {
    setDateFromFilter("");
    setDateToFilter("");
    setStatusFilter("completed");
    setSortKey("date");
    setSortDirection("desc");
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <div className="space-y-4">
      <Card className="sticky top-[76px] z-20 shadow-panel">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_auto] md:items-end">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <label className="block">
              <span className="text-xs font-black uppercase text-court-blue">Dátum od</span>
              <input
                type="date"
                value={dateFromFilter}
                onChange={(event) => setDateFromFilter(event.target.value)}
                className="focus-ring mt-2 w-full rounded-[8px] border border-court-line bg-white px-2.5 py-2.5 text-sm font-bold text-court-ink sm:px-3 sm:py-3"
              />
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase text-court-blue">Dátum do</span>
              <input
                type="date"
                value={dateToFilter}
                onChange={(event) => setDateToFilter(event.target.value)}
                className="focus-ring mt-2 w-full rounded-[8px] border border-court-line bg-white px-2.5 py-2.5 text-sm font-bold text-court-ink sm:px-3 sm:py-3"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-black uppercase text-court-blue">Stav zápasu</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="focus-ring mt-2 w-full rounded-[8px] border border-court-line bg-white px-2.5 py-2.5 text-sm font-bold text-court-ink sm:px-3 sm:py-3"
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

      <div className="hidden lg:block">
        <Card className="overflow-x-auto p-0">
          <table className="min-w-[900px] w-full border-collapse text-left">
            <thead className="bg-court-ice">
              <tr className="border-b border-court-line">
                <th className="px-5 py-4">
                  <SortHeader active={sortKey === "date"} direction={sortDirection} onClick={() => handleSort("date")}>
                    Dátum
                  </SortHeader>
                </th>
                <th className="px-5 py-4">
                  <SortHeader active={sortKey === "winner"} direction={sortDirection} onClick={() => handleSort("winner")}>
                    Víťazné družstvo
                  </SortHeader>
                </th>
                <th className="px-5 py-4">
                  <SortHeader active={sortKey === "sets"} direction={sortDirection} onClick={() => handleSort("sets")}>
                    Pomer setov
                  </SortHeader>
                </th>
                <th className="px-5 py-4">
                  <SortHeader active={sortKey === "availablePlayersCount"} direction={sortDirection} onClick={() => handleSort("availablePlayersCount")}>
                    Počet hráčov
                  </SortHeader>
                </th>
                <th className="px-5 py-4 text-xs font-black uppercase text-court-blue">Akcia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-court-line">
              {sortedMatches.map((match) => (
                <tr key={match.id}>
                  <td className="px-5 py-4 text-sm font-bold text-court-ink">{formatMatchDay(match.startsAt)}</td>
                  <td className="px-5 py-4 text-sm font-black text-court-ink">{getWinningTeamName(match)}</td>
                  <td className="px-5 py-4 text-sm font-black text-court-blue">{getSetsRatio(match)}</td>
                  <td className="px-5 py-4 text-sm font-black text-court-blue">{match.availablePlayersCount}</td>
                  <td className="px-5 py-4">
                    <Link href={`/matches/${match.id}`} className={buttonClasses({ variant: "secondary" })}>
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-court-line bg-court-ice">
              <tr>
                <td className="px-5 py-4 text-sm font-black text-court-ink">Súhrn: {sortedMatches.length} zápasov</td>
                <td className="px-5 py-4 text-sm font-black text-court-blue" colSpan={2}>Filtrované záznamy</td>
                <td className="px-5 py-4 text-sm font-black text-court-ink">{totalPlayers} hráčov spolu</td>
                <td className="px-5 py-4 text-sm font-black text-court-blue">Po aplikovaní filtrov</td>
              </tr>
            </tfoot>
          </table>
        </Card>
      </div>

      <div className="grid gap-4 lg:hidden">
        {sortedMatches.map((match) => (
          <Card key={match.id} className="space-y-3">
            <div className="space-y-2">
              <p className="text-base font-black text-court-ink">{formatMatchDay(match.startsAt)}</p>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="rounded-[8px] bg-court-ice px-2 py-2">
                  <p className="text-[10px] font-black uppercase text-court-blue">Víťaz</p>
                  <p className="mt-1 truncate text-[11px] font-black text-court-ink">{getWinningTeamName(match)}</p>
                </div>
                <div className="rounded-[8px] bg-court-ice px-2 py-2">
                  <p className="text-[10px] font-black uppercase text-court-blue">Sety</p>
                  <p className="mt-1 text-[11px] font-black text-court-ink">{getSetsRatio(match)}</p>
                </div>
                <div className="rounded-[8px] bg-court-ice px-2 py-2">
                  <p className="text-[10px] font-black uppercase text-court-blue">Hráči</p>
                  <p className="mt-1 text-[11px] font-black text-court-ink">{match.availablePlayersCount}</p>
                </div>
                <Link
                  href={`/matches/${match.id}`}
                  className={buttonClasses({ className: "h-full min-h-[56px] bg-court-cyan px-2 text-[11px] text-court-navy hover:bg-court-mint", variant: "ghost" })}
                >
                  Detail
                </Link>
              </div>
            </div>
          </Card>
        ))}

        <Card>
          <p className="text-sm font-black text-court-ink">Súhrn: {sortedMatches.length} zápasov</p>
          <p className="mt-2 text-sm font-bold text-court-blue">Počet prihlásených hráčov v odfiltrovaných záznamoch: {totalPlayers}</p>
        </Card>
      </div>
    </div>
  );
}
