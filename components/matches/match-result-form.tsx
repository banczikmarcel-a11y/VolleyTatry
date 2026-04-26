"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveMatchResult } from "@/app/matches/actions";
import { Button } from "@/components/ui/button";
import { showLiveToast } from "@/components/ui/live-toast";

type MatchResultFormProps = {
  awaySets: number | null;
  homeSets: number | null;
  matchId: string;
};

export function MatchResultForm({ awaySets, homeSets, matchId }: MatchResultFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [homeValue, setHomeValue] = useState(homeSets?.toString() ?? "");
  const [awayValue, setAwayValue] = useState(awaySets?.toString() ?? "");

  return (
    <section className="rounded-[8px] border border-court-line bg-white p-4 shadow-sm">
      <p className="text-sm font-black uppercase text-court-coral">Výsledok zápasu</p>
      <h2 className="mt-2 text-lg font-black text-court-ink">Zapísať sety</h2>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-bold text-court-ink">Tatry</span>
          <input
            inputMode="numeric"
            value={homeValue}
            onChange={(event) => setHomeValue(event.target.value)}
            className="focus-ring mt-2 w-full rounded-[8px] border border-court-line bg-white px-3 py-3 text-sm font-bold text-court-ink"
            placeholder="0"
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-court-ink">Ostatní</span>
          <input
            inputMode="numeric"
            value={awayValue}
            onChange={(event) => setAwayValue(event.target.value)}
            className="focus-ring mt-2 w-full rounded-[8px] border border-court-line bg-white px-3 py-3 text-sm font-bold text-court-ink"
            placeholder="0"
          />
        </label>
      </div>

      <Button
        type="button"
        disabled={isPending}
        className="mt-4 w-full"
        onClick={() =>
          startTransition(async () => {
            if (!homeValue.trim() || !awayValue.trim()) {
              showLiveToast("Vyplň oba počty setov.", "error");
              return;
            }

            const result = await saveMatchResult({
              awaySets: Number(awayValue),
              homeSets: Number(homeValue),
              matchId
            });

            if (!result.ok) {
              showLiveToast(result.error ?? "Nepodarilo sa uložiť výsledok.", "error");
              return;
            }

            showLiveToast(result.message ?? "Výsledok bol uložený.");
            router.refresh();
          })
        }
      >
        Uložiť výsledok
      </Button>
    </section>
  );
}
