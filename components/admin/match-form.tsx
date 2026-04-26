import type { MatchStatus } from "@/types/entities";
import { Button } from "@/components/ui/button";
import { FormCard } from "@/components/ui/card";
import type { AdminMatch } from "@/lib/admin-matches";
import type { Team } from "@/types/entities";

type MatchFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  error?: string;
  match?: AdminMatch;
  submitLabel: string;
  teams: Pick<Team, "id" | "name" | "slug">[];
};

const statuses: MatchStatus[] = ["scheduled", "completed", "cancelled"];

function getDateInputValue(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

export function MatchForm({ action, error, match, submitLabel, teams }: MatchFormProps) {
  const currentYear = new Date().getFullYear();

  return (
    <FormCard action={action} className="p-5 shadow-panel">
      {match ? <input type="hidden" name="match_id" value={match.id} /> : null}

      <div>
        <p className="text-sm font-black uppercase text-court-mint">Admin zápas</p>
        <h1 className="mt-2 text-3xl font-black text-court-ink">{match ? "Upraviť zápas" : "Vytvoriť zápas"}</h1>
        <p className="mt-2 text-sm leading-6 text-court-blue">
          Nastav dátum, sezónu, tímy, miesto, stav a výsledok. Formulár je pripravený na ďalšie admin polia.
        </p>
      </div>

      {error ? (
        <p className="mt-5 rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm font-bold text-court-ink">Dátum a čas</span>
          <input
            type="datetime-local"
            name="match_date"
            defaultValue={getDateInputValue(match?.matchDate)}
            className="focus-ring mt-2 w-full rounded-[8px] border border-court-line px-3 py-3 text-sm text-court-ink"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold text-court-ink">Miesto</span>
          <input
            type="text"
            name="location"
            defaultValue={match?.location ?? ""}
            className="focus-ring mt-2 w-full rounded-[8px] border border-court-line px-3 py-3 text-sm text-court-ink"
            placeholder="Športová hala Tatry"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold text-court-ink">Sezóna</span>
          <input
            type="number"
            name="season_year"
            defaultValue={match?.seasonYear ?? currentYear}
            min={2000}
            max={2100}
            className="focus-ring mt-2 w-full rounded-[8px] border border-court-line px-3 py-3 text-sm text-court-ink"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold text-court-ink">Stav</span>
          <select
            name="status"
            defaultValue={match?.status ?? "scheduled"}
            className="focus-ring mt-2 w-full rounded-[8px] border border-court-line bg-white px-3 py-3 text-sm text-court-ink"
            required
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-bold text-court-ink">Domáce družstvo</span>
          <select
            name="home_team_id"
            defaultValue={match?.homeTeamId ?? ""}
            className="focus-ring mt-2 w-full rounded-[8px] border border-court-line bg-white px-3 py-3 text-sm text-court-ink"
            required
          >
            <option value="" disabled>
              Vyber tím
            </option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-bold text-court-ink">Hosťujúce družstvo</span>
          <select
            name="away_team_id"
            defaultValue={match?.awayTeamId ?? ""}
            className="focus-ring mt-2 w-full rounded-[8px] border border-court-line bg-white px-3 py-3 text-sm text-court-ink"
            required
          >
            <option value="" disabled>
              Vyber súpera
            </option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-4 sm:col-span-2">
          <label className="block">
            <span className="text-sm font-bold text-court-ink">Sety Tatry</span>
            <input
              type="number"
              name="home_sets"
              defaultValue={match?.homeSets ?? ""}
              min={0}
              max={5}
              className="focus-ring mt-2 w-full rounded-[8px] border border-court-line px-3 py-3 text-sm text-court-ink"
              placeholder="0"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-court-ink">Sety Ostatní</span>
            <input
              type="number"
              name="away_sets"
              defaultValue={match?.awaySets ?? ""}
              min={0}
              max={5}
              className="focus-ring mt-2 w-full rounded-[8px] border border-court-line px-3 py-3 text-sm text-court-ink"
              placeholder="0"
            />
          </label>
        </div>
      </div>

      <Button type="submit" className="mt-6 w-full py-3">
        {submitLabel}
      </Button>
    </FormCard>
  );
}
