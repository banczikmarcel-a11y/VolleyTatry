import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { createQuickMatch } from "@/app/admin/matches/actions";
import { Button, buttonClasses } from "@/components/ui/button";
import { FormCard } from "@/components/ui/card";

type QuickMatchFormProps = {
  defaultDate: string;
  dateOptions: Array<{
    label: string;
    value: string;
  }>;
  error?: string;
};

export function QuickMatchForm({ dateOptions, defaultDate, error }: QuickMatchFormProps) {
  return (
    <FormCard action={createQuickMatch} className="p-5 shadow-panel">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] bg-court-ink text-court-mint">
          <CalendarDays className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-black uppercase text-court-mint">Nový zápas</p>
          <h1 className="mt-2 text-3xl font-black text-court-ink">Vyber dátum zápasu</h1>
          <p className="mt-2 text-sm leading-6 text-court-blue">
            Predvolený je najbližší pondelok. Zápas sa vytvorí ako Tatry vs Ostatní a detaily môžeš upraviť neskôr.
          </p>
        </div>
      </div>

      {error ? (
        <p className="mt-5 rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}

      <fieldset className="mt-6">
        <legend className="text-sm font-bold text-court-ink">Vyber dátum</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {dateOptions.map((option) => (
            <label key={option.value} className="cursor-pointer">
              <input
                type="radio"
                name="match_date"
                value={option.value}
                defaultChecked={option.value === defaultDate}
                className="peer sr-only"
                required
              />
              <span className="focus-ring block rounded-[8px] border border-court-line bg-white px-4 py-3 text-sm font-black text-court-ink transition peer-checked:border-court-mint peer-checked:bg-court-ice peer-checked:ring-2 peer-checked:ring-court-mint">
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-5 block">
        <span className="text-sm font-bold text-court-ink">Alebo zadaj iný dátum</span>
        <input
          type="date"
          name="custom_match_date"
          defaultValue=""
          className="focus-ring mt-2 w-full rounded-[8px] border border-court-line px-3 py-3 text-sm text-court-ink"
        />
        <span className="mt-2 block text-xs font-bold text-court-blue">
          Ak zadáš vlastný dátum, použije sa namiesto výberu hore.
        </span>
      </label>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Button type="submit" className="w-full py-3">
          Vytvor
        </Button>
        <Link href="/matches" className={buttonClasses({ className: "w-full py-3", variant: "secondary" })}>
          Návrat
        </Link>
      </div>
    </FormCard>
  );
}
