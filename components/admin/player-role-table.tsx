"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Save, Trash2, X } from "lucide-react";
import { deletePlayer, updatePlayer } from "@/app/admin/players/actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { AdminPlayer } from "@/lib/admin-players";
import type { Team } from "@/types/entities";

type PlayerRoleTableProps = {
  players: AdminPlayer[];
  teams: Pick<Team, "id" | "name" | "slug">[];
};

type SortKey = "email" | "firstName" | "lastName" | "teamName";
type EditingState = Record<string, boolean>;

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
  const [editing, setEditing] = useState<EditingState>({});

  const sortedPlayers = useMemo(() => {
    return [...players].sort((left, right) => {
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

      return [left.lastName, left.firstName, left.email].filter(Boolean).join(" ").localeCompare(
        [right.lastName, right.firstName, right.email].filter(Boolean).join(" "),
        "sk",
        { sensitivity: "base" }
      ) * direction;
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

  function setRowEditing(playerId: string, value: boolean) {
    setEditing((current) => ({
      ...current,
      [playerId]: value
    }));
  }

  return (
    <Card className="p-0">
      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full border-collapse text-left">
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
              <th className="px-5 py-4">
                <SortHeader active={sortKey === "teamName"} direction={sortDirection} onClick={() => handleSort("teamName")}>
                  Predvolené družstvo
                </SortHeader>
              </th>
              <th className="px-5 py-4 text-xs font-black uppercase text-court-blue">Akcia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-court-line">
            {sortedPlayers.map((player) => {
              const primaryMembership = player.memberships[0];
              const isEditing = editing[player.id] ?? false;

              return (
                <tr key={player.id} className="align-top">
                  <td className="px-5 py-4">
                    {isEditing ? (
                      <input
                        form={`player-edit-${player.id}`}
                        name="first_name"
                        defaultValue={player.firstName}
                        className="focus-ring w-full min-w-[150px] rounded-[8px] border border-court-line bg-white px-3 py-2 text-sm font-bold text-court-ink"
                        required
                      />
                    ) : (
                      <p className="font-black text-court-ink">{player.firstName || getPlayerName(player)}</p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {isEditing ? (
                      <input
                        form={`player-edit-${player.id}`}
                        name="last_name"
                        defaultValue={player.lastName}
                        className="focus-ring w-full min-w-[150px] rounded-[8px] border border-court-line bg-white px-3 py-2 text-sm font-bold text-court-ink"
                        required
                      />
                    ) : (
                      <p className="font-black text-court-ink">{player.lastName || "-"}</p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {isEditing ? (
                      <input
                        form={`player-edit-${player.id}`}
                        name="email"
                        type="email"
                        defaultValue={player.email ?? ""}
                        className="focus-ring w-full min-w-[220px] rounded-[8px] border border-court-line bg-white px-3 py-2 text-sm font-bold text-court-ink"
                      />
                    ) : (
                      <p className="max-w-[220px] truncate text-sm font-bold text-court-blue">{getPlayerEmail(player)}</p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {isEditing ? (
                      <select
                        form={`player-edit-${player.id}`}
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
                    ) : (
                      <Badge tone="neutral">{primaryMembership?.teamName ?? "Bez tímu"}</Badge>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <button
                          type="button"
                          onClick={() => setRowEditing(player.id, false)}
                          className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-court-line text-court-blue transition hover:bg-court-ice hover:text-court-ink"
                          title="Zrušiť"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setRowEditing(player.id, true)}
                          className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-court-line text-court-blue transition hover:bg-court-ice hover:text-court-ink"
                          title="Upraviť"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}

                      <form id={`player-edit-${player.id}`} action={updatePlayer}>
                        <input type="hidden" name="profile_id" value={player.id} />
                        {!isEditing ? (
                          <>
                            <input type="hidden" name="first_name" value={player.firstName} />
                            <input type="hidden" name="last_name" value={player.lastName} />
                            <input type="hidden" name="email" value={player.email ?? ""} />
                            <input type="hidden" name="team_id" value={primaryMembership?.teamId ?? teams[0]?.id ?? ""} />
                            <input type="hidden" name="role" value={primaryMembership?.role ?? "player"} />
                            <input type="hidden" name="status" value={primaryMembership?.status ?? "active"} />
                          </>
                        ) : null}
                        {isEditing ? (
                          <button
                            type="submit"
                            className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-court-line text-court-blue transition hover:bg-court-ice hover:text-court-ink"
                            title="Uložiť"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                        ) : null}
                      </form>

                      <form action={deletePlayer}>
                        <input type="hidden" name="profile_id" value={player.id} />
                        <button
                          type="submit"
                          className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-court-coral text-court-coral transition hover:bg-court-coral/10"
                          title="Zmazať hráča"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
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
