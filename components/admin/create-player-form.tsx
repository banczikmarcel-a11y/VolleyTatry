"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createPlayer } from "@/app/admin/players/actions";
import { Button } from "@/components/ui/button";
import type { Team } from "@/types/entities";

type CreatePlayerFormProps = {
  teams: Pick<Team, "id" | "name" | "slug">[];
};

export function CreatePlayerForm({ teams }: CreatePlayerFormProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setIsOpen(true)} className="w-full sm:w-auto">
        Nový hráč
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-court-ink/55 p-4">
          <div className="w-full max-w-3xl rounded-[8px] border border-court-line bg-white p-5 shadow-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase text-court-mint">Nový hráč</p>
                <h2 className="mt-2 text-2xl font-black text-court-ink">Vytvoriť hráča</h2>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="focus-ring rounded-[8px] p-2 text-court-blue hover:bg-court-ice">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form action={createPlayer} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.1fr_1fr_1fr_1fr]">
              <label className="block">
                <span className="text-sm font-bold text-court-ink">Meno</span>
                <input
                  name="first_name"
                  className="focus-ring mt-2 w-full rounded-[8px] border border-court-line bg-white px-3 py-3 text-sm font-bold text-court-ink"
                  placeholder="Ján"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-court-ink">Priezvisko</span>
                <input
                  name="last_name"
                  className="focus-ring mt-2 w-full rounded-[8px] border border-court-line bg-white px-3 py-3 text-sm font-bold text-court-ink"
                  placeholder="Novák"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-court-ink">E-mail</span>
                <input
                  name="email"
                  type="email"
                  className="focus-ring mt-2 w-full rounded-[8px] border border-court-line bg-white px-3 py-3 text-sm font-bold text-court-ink"
                  placeholder="hrac@example.com"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-court-ink">Predvolené družstvo</span>
                <select
                  name="team_id"
                  defaultValue={teams[0]?.id ?? ""}
                  className="focus-ring mt-2 w-full rounded-[8px] border border-court-line bg-white px-3 py-3 text-sm font-bold text-court-ink"
                  required
                >
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-bold text-court-ink">Rola</span>
                <select
                  name="role"
                  defaultValue="player"
                  className="focus-ring mt-2 w-full rounded-[8px] border border-court-line bg-white px-3 py-3 text-sm font-bold text-court-ink"
                  required
                >
                  <option value="player">Hráč</option>
                  <option value="coach">Tréner</option>
                  <option value="owner">Vlastník</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-bold text-court-ink">Stav</span>
                <select
                  name="status"
                  defaultValue="active"
                  className="focus-ring mt-2 w-full rounded-[8px] border border-court-line bg-white px-3 py-3 text-sm font-bold text-court-ink"
                  required
                >
                  <option value="active">Aktívny</option>
                  <option value="invited">Pozvaný</option>
                  <option value="inactive">Neaktívny</option>
                </select>
              </label>

              <div className="md:col-span-2 xl:col-span-6 flex flex-wrap justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>
                  Návrat
                </Button>
                <Button type="submit">Uložiť</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
