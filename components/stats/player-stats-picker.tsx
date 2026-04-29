"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { PlayerOption } from "@/lib/profile";

type PlayerStatsPickerProps = {
  players: PlayerOption[];
  selectedPlayerId: string | null;
};

export function PlayerStatsPicker({ players, selectedPlayerId }: PlayerStatsPickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function pushSelection(playerId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", "player");

    if (playerId) {
      params.set("player", playerId);
    } else {
      params.delete("player");
    }

    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex min-w-[280px] flex-1 items-center gap-3">
        <span className="shrink-0 text-sm font-bold text-court-ink">Hráč</span>
        <select
          value={selectedPlayerId ?? ""}
          onChange={(event) => pushSelection(event.target.value)}
          className="focus-ring w-full rounded-[8px] border border-court-line bg-white px-3 py-2.5 text-sm font-bold text-court-ink"
        >
          <option value="">Vyber hráča</option>
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.sortLabel}
            </option>
          ))}
        </select>
      </label>

      {selectedPlayerId ? (
        <Button type="button" variant="secondary" className="py-2.5" onClick={() => pushSelection("")}>
          Vymazať výber
        </Button>
      ) : null}
    </div>
  );
}
