"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { formatMatchDay } from "@/lib/match-display";
import type { PlayerMatchHistory } from "@/lib/profile";
import { cn } from "@/lib/utils";

type SortKey = "date" | "result" | "sets" | "teamName";

type PlayerHistoryTableProps = {
  matches: PlayerMatchHistory[];
};

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
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-black uppercase text-court-blue transition hover:text-court-ink"
    >
      {children}
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

export function PlayerHistoryTable({ matches }: PlayerHistoryTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const sortedMatches = useMemo(() => {
    const resultOrder = new Map([
      ["Výhra", 0],
      ["Prehra", 1],
      ["Remíza", 2]
    ]);

    return [...matches].sort((left, right) => {
      const direction = sortDirection === "asc" ? 1 : -1;

      if (sortKey === "date") {
        return (new Date(left.date).getTime() - new Date(right.date).getTime()) * direction;
      }

      if (sortKey === "sets") {
        return left.sets.localeCompare(right.sets, "sk", { numeric: true }) * direction;
      }

      if (sortKey === "result") {
        return ((resultOrder.get(left.result) ?? 99) - (resultOrder.get(right.result) ?? 99)) * direction;
      }

      return left.teamName.localeCompare(right.teamName, "sk") * direction;
    });
  }, [matches, sortDirection, sortKey]);

  function handleSort(nextKey: SortKey) {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "date" ? "desc" : "asc");
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-[660px] w-full border-collapse text-left">
          <thead className="bg-court-ice">
            <tr className="border-b border-court-line">
              <th className="px-4 py-3">
                <SortHeader active={sortKey === "date"} direction={sortDirection} onClick={() => handleSort("date")}>
                  Dátum
                </SortHeader>
              </th>
              <th className="px-4 py-3">
                <SortHeader active={sortKey === "teamName"} direction={sortDirection} onClick={() => handleSort("teamName")}>
                  Družstvo
                </SortHeader>
              </th>
              <th className="px-4 py-3">
                <SortHeader active={sortKey === "result"} direction={sortDirection} onClick={() => handleSort("result")}>
                  Výsledok
                </SortHeader>
              </th>
              <th className="px-4 py-3">
                <SortHeader active={sortKey === "sets"} direction={sortDirection} onClick={() => handleSort("sets")}>
                  Sety
                </SortHeader>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-court-line">
            {sortedMatches.map((match) => (
              <tr key={match.id}>
                <td className="px-4 py-3 text-sm font-bold text-court-ink">{formatMatchDay(match.date)}</td>
                <td className="px-4 py-3 text-sm font-black text-court-ink">{match.teamName}</td>
                <td className="px-4 py-3 text-sm font-black text-court-blue">{match.result}</td>
                <td className="px-4 py-3 text-sm font-black text-court-blue">{match.sets}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2.5 p-3 md:hidden">
        {sortedMatches.map((match) => (
          <div key={match.id} className="rounded-[8px] border border-court-line bg-court-ice p-3">
            <p className="text-xs font-black uppercase text-court-blue">{formatMatchDay(match.date)}</p>
            <p className="mt-1.5 text-sm font-black text-court-ink">{match.teamName}</p>
            <div className="mt-2.5 grid grid-cols-2 gap-2.5 text-sm">
              <div>
                <p className="text-xs font-black uppercase text-court-blue">Výsledok</p>
                <p className="mt-1 font-black text-court-ink">{match.result}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase text-court-blue">Sety</p>
                <p className="mt-1 font-black text-court-ink">{match.sets}</p>
              </div>
            </div>
          </div>
        ))}
        <p className={cn("text-xs font-bold text-court-blue", matches.length === 0 ? "hidden" : "")}>
          Triedenie: klikni na názov stĺpca v desktopovom zobrazení.
        </p>
      </div>
    </>
  );
}
