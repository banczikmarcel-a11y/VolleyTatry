"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { AttendanceRow } from "@/lib/stats";

type AttendanceTableProps = {
  rows: AttendanceRow[];
};

type SortKey = "playerName" | "total";

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

export function AttendanceTable({ rows }: AttendanceTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("playerName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const sortedRows = useMemo(() => {
    const direction = sortDirection === "asc" ? 1 : -1;

    return [...rows].sort((left, right) => {
      const base =
        sortKey === "total"
          ? left.total - right.total
          : left.sortLabel.localeCompare(right.sortLabel, "sk", { sensitivity: "base" });

      if (base !== 0) {
        return base * direction;
      }

      return left.sortLabel.localeCompare(right.sortLabel, "sk", { sensitivity: "base" });
    });
  }, [rows, sortDirection, sortKey]);

  function handleSort(nextKey: SortKey) {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "total" ? "desc" : "asc");
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[980px] w-full border-collapse text-left">
        <thead className="bg-court-ice">
          <tr className="border-b border-court-line">
            <th className="sticky left-0 bg-court-ice px-3 py-3">
              <SortHeader active={sortKey === "playerName"} direction={sortDirection} onClick={() => handleSort("playerName")}>
                Hráč
              </SortHeader>
            </th>
            {Array.from({ length: 12 }, (_, index) => (
              <th key={index} className="px-3 py-3 text-center text-xs font-black uppercase text-court-blue">
                {(index + 1).toString().padStart(2, "0")}
              </th>
            ))}
            <th className="px-3 py-3 text-center">
              <SortHeader active={sortKey === "total"} direction={sortDirection} onClick={() => handleSort("total")}>
                Sumár
              </SortHeader>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-court-line">
          {sortedRows.map((row) => (
            <tr key={row.playerId}>
              <td className="sticky left-0 bg-white px-3 py-3 text-sm font-black text-court-ink">{row.playerName}</td>
              {row.monthly.map((count, index) => (
                <td key={index} className="px-3 py-3 text-center text-sm font-bold text-court-blue">
                  {count}
                </td>
              ))}
              <td className="px-3 py-3 text-center text-sm font-black text-court-ink">{row.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
