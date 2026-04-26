import { createPlayer } from "@/app/admin/players/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Team } from "@/types/entities";

type CreatePlayerFormProps = {
  teams: Pick<Team, "id" | "name" | "slug">[];
};

export function CreatePlayerForm({ teams }: CreatePlayerFormProps) {
  return (
    <Card as="section" className="space-y-5">
      <div>
        <p className="text-sm font-black uppercase text-court-mint">Nový hráč</p>
        <h2 className="mt-2 text-2xl font-black text-court-ink">Vytvoriť hráča</h2>
      </div>

      <form action={createPlayer} className="grid gap-4 lg:grid-cols-[1fr_1fr_1.2fr_1fr_1fr_1fr_auto] lg:items-end">
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
          <span className="text-sm font-bold text-court-ink">Predvolený tím</span>
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

        <Button type="submit" className="py-3">
          Vytvoriť
        </Button>
      </form>
    </Card>
  );
}
