"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { savePlayerRole } from "@/app/admin/players/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AdminPlayer } from "@/lib/admin-players";
import type { Team } from "@/types/entities";

type PlayerRoleTableProps = {
  players: AdminPlayer[];
  teams: Pick<Team, "id" | "name" | "slug">[];
};

type SortKey = "email" | "firstName" | "lastName" | "primaryRole" | "primaryStatus" | "teamName";

function getPlayerName(player: AdminPlayer) {
  return player.fullName || "Bez mena";
}

function getPlayerEmail(player: AdminPlayer) {
  return player.email || "Bez e-mailu";
}

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

export function PlayerRoleTable({ players, teams }: PlayerRoleTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("lastName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const sortedPlayers = useMemo(() => {
    return [...players].sort((left, right) => {
      const leftPrimaryMembership = left.memberships[0];
      const rightPrimaryMembership = right.memberships[0];
      const direction = sortDirection === "asc" ? 1 : -1;

      const getValue = (player: AdminPlayer, key: SortKey) => {
        const primaryMembership = player.memberships[0];

        switch (key) {
          case "email":
            return getPlayerEmail(player);
          case "firstName":
            return player.firstName || getPlayerName(player);
          case "lastName":
            return player.lastName || "";
          case "primaryRole":
            return primaryMembership?.role ?? "";
          case "primaryStatus":
            return primaryMembership?.status ?? "";
          case "teamName":
            return primaryMembership?.teamName ?? "";
        }
      };

      const leftValue = getValue(left, sortKey);
      const rightValue = getValue(right, sortKey);

      const base = leftValue.localeCompare(rightValue, "sk", { numeric: true, sensitivity: "base" });

      if (base !== 0) {
        return base * direction;
      }

      const leftFallback = [left.lastName, left.firstName, left.email].filter(Boolean).join(" ");
      const rightFallback = [right.lastName, right.firstName, right.email].filter(Boolean).join(" ");
      const fallback = leftFallback.localeCompare(rightFallback, "sk", { sensitivity: "base" });

      if (fallback !== 0) {
        return fallback * direction;
      }

      return (leftPrimaryMembership?.teamName ?? "").localeCompare(rightPrimaryMembership?.teamName ?? "", "sk") * direction;
    });
  }, [players, sortDirection, sortKey]);

  function handleSort(nextKey: SortKey) {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection("asc");
  }

  return (
    <Card className="p-0">
      <div className="overflow-x-auto">
        <table className="min-w-[1320px] w-full border-collapse text-left">
          <thead className="bg-court-ice">
            <tr className="border-b border-court-line">
              <th className="px-5 py-4">
                <SortHeader active={sortKey === "firstName"} direction={sortDirection} onClick={() => handleSort("firstName")}>
                  Meno
                </SortHeader>
              </th>
              <th className="px-5 py-4">
                <SortHeader active={sortKey === "lastName"} direction={sortDirection} onClick={() => handleSort("lastName")}>
                  Priezvisko
                </SortHeader>
              </th>
              <th className="px-5 py-4">
                <SortHeader active={sortKey === "email"} direction={sortDirection} onClick={() => handleSort("email")}>
                  E-mail
                </SortHeader>
              </th>
              <th className="px-5 py-4 text-xs font-black uppercase text-court-blue">Aktuálne roly</th>
              <th className="px-5 py-4">
                <SortHeader active={sortKey === "teamName"} direction={sortDirection} onClick={() => handleSort("teamName")}>
                  Predvolené družstvo
                </SortHeader>
              </th>
              <th className="px-5 py-4">
                <SortHeader active={sortKey === "primaryRole"} direction={sortDirection} onClick={() => handleSort("primaryRole")}>
                  Rola
                </SortHeader>
              </th>
              <th className="px-5 py-4">
                <SortHeader active={sortKey === "primaryStatus"} direction={sortDirection} onClick={() => handleSort("primaryStatus")}>
                  Stav
                </SortHeader>
              </th>
              <th className="px-5 py-4 text-xs font-black uppercase text-court-blue">Akcia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-court-line">
            {sortedPlayers.map((player) => {
              const primaryMembership = player.memberships[0];
              const formId = `player-role-${player.id}`;

              return (
                <tr key={player.id} className="align-top">
                  <td className="px-5 py-4">
                    <p className="font-black text-court-ink">{player.firstName || getPlayerName(player)}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-black text-court-ink">{player.lastName || "-"}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="max-w-[220px] truncate text-sm font-bold text-court-blue">{getPlayerEmail(player)}</p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex max-w-[280px] flex-wrap gap-2">
                      {player.memberships.length > 0 ? (
                        player.memberships.map((membership) => (
                          <Badge key={membership.id} tone={membership.role === "player" ? "neutral" : "mint"}>
                            {membership.teamName} · {membership.role} · {membership.status}
                          </Badge>
                        ))
                      ) : (
                        <Badge tone="coral">bez tímu</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <select
                      id={`team-${player.id}`}
                      form={formId}
                      name="team_id"
                      defaultValue={primaryMembership?.teamId ?? teams[0]?.id ?? ""}
                      className="focus-ring w-full min-w-[180px] rounded-[8px] border border-court-line bg-white px-3 py-2 text-sm font-bold text-court-ink"
                      required
                    >
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-4">
                    <select
                      id={`role-${player.id}`}
                      form={formId}
                      name="role"
                      defaultValue={primaryMembership?.role ?? "player"}
                      className="focus-ring w-full min-w-[150px] rounded-[8px] border border-court-line bg-white px-3 py-2 text-sm font-bold text-court-ink"
                      required
                    >
                      <option value="player">Hráč</option>
                      <option value="coach">Tréner</option>
                      <option value="owner">Vlastník</option>
                    </select>
                  </td>
                  <td className="px-5 py-4">
                    <select
                      id={`status-${player.id}`}
                      form={formId}
                      name="status"
                      defaultValue={primaryMembership?.status ?? "active"}
                      className="focus-ring w-full min-w-[150px] rounded-[8px] border border-court-line bg-white px-3 py-2 text-sm font-bold text-court-ink"
                      required
                    >
                      <option value="active">Aktívny</option>
                      <option value="invited">Pozvaný</option>
                      <option value="inactive">Neaktívny</option>
                    </select>
                  </td>
                  <td className="px-5 py-4">
                    <form id={formId} action={savePlayerRole}>
                      <input type="hidden" name="profile_id" value={player.id} />
                      <Button type="submit" className="px-3">
                        Uložiť
                      </Button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
