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
  const [winnerFilter, setWinnerFilter] = useState("");
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
        winnerFilter?: string;
      };

      setDateFromFilter(parsed.dateFromFilter ?? "");
      setDateToFilter(parsed.dateToFilter ?? "");
      setStatusFilter(parsed.statusFilter ?? "completed");
      setWinnerFilter(parsed.winnerFilter ?? "");
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
        sortKey,
        winnerFilter
      })
    );
  }, [dateFromFilter, dateToFilter, statusFilter, sortDirection, sortKey, winnerFilter]);

  const winnerOptions = useMemo(
    () =>
      Array.from(
        new Set(
          matches
            .map((match) => getWinningTeamName(match))
            .filter((value) => value !== "—" && value !== "Remíza")
        )
      ).sort((left, right) => left.localeCompare(right, "sk")),
    [matches]
  );

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      const winner = getWinningTeamName(match);
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

      if (winnerFilter && winner !== winnerFilter) {
        return false;
      }

      if (statusFilter && match.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [dateFromFilter, dateToFilter, statusFilter, winnerFilter, matches]);

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
    setWinnerFilter("");
    setSortKey("date");
    setSortDirection("desc");
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <div className="space-y-4">
      <Card className="sticky top-[76px] z-20 shadow-panel">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto] md:items-end">
          <label className="block">
            <span className="text-xs font-black uppercase text-court-blue">Dátum od</span>
            <input
              type="date"
              value={dateFromFilter}
              onChange={(event) => setDateFromFilter(event.target.value)}
              className="focus-ring mt-2 w-full rounded-[8px] border border-court-line bg-white px-3 py-3 text-sm font-bold text-court-ink"
            />
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase text-court-blue">Dátum do</span>
            <input
              type="date"
              value={dateToFilter}
              onChange={(event) => setDateToFilter(event.target.value)}
              className="focus-ring mt-2 w-full rounded-[8px] border border-court-line bg-white px-3 py-3 text-sm font-bold text-court-ink"
            />
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase text-court-blue">Víťazné družstvo</span>
            <select
              value={winnerFilter}
              onChange={(event) => setWinnerFilter(event.target.value)}
              className="focus-ring mt-2 w-full rounded-[8px] border border-court-line bg-white px-3 py-3 text-sm font-bold text-court-ink"
            >
              <option value="">Všetky</option>
              {winnerOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase text-court-blue">Stav zápasu</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="focus-ring mt-2 w-full rounded-[8px] border border-court-line bg-white px-3 py-3 text-sm font-bold text-court-ink"
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
              <div className="grid grid-cols-2 gap-3 text-sm">
                <p className="font-bold text-court-blue">Víťaz: <span className="font-black text-court-ink">{getWinningTeamName(match)}</span></p>
                <p className="font-bold text-court-blue">Sety: <span className="font-black text-court-ink">{getSetsRatio(match)}</span></p>
                <p className="font-bold text-court-blue">Hráči: <span className="font-black text-court-ink">{match.availablePlayersCount}</span></p>
              </div>
            </div>
            <Link href={`/matches/${match.id}`} className={buttonClasses({ className: "w-full", variant: "secondary" })}>
              Detail
            </Link>
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
