"use client";

import type { MatchSignupPlayer } from "@/lib/matches";

type PlayerComboboxProps = {
  inputName: string;
  label: string;
  onValueChange?: (value: string) => void;
  players: MatchSignupPlayer[];
  selectedId?: string;
};

export function PlayerCombobox({ inputName, label, onValueChange, players, selectedId = "" }: PlayerComboboxProps) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-court-ink">{label}</span>
      <select
        name={inputName}
        value={selectedId}
        onChange={(event) => onValueChange?.(event.target.value)}
        className="focus-ring mt-2 w-full rounded-[8px] border border-court-line bg-white px-3 py-3 text-sm font-bold text-court-ink"
      >
        <option value="">Vyber hráča</option>
        {players.map((player) => (
          <option key={player.id} value={player.id}>
            {player.sortLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
