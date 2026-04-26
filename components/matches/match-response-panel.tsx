"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { submitMatchResponse } from "@/app/matches/actions";
import { Button } from "@/components/ui/button";
import { showLiveToast } from "@/components/ui/live-toast";
import type { MatchResponseStatus } from "@/types/entities";

type MatchResponsePanelProps = {
  isConfigured: boolean;
  matchId: string;
  userResponse: MatchResponseStatus | null;
};

export function MatchResponsePanel({ isConfigured, matchId, userResponse }: MatchResponsePanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (status: "available" | "unavailable") => {
    startTransition(async () => {
      const result = await submitMatchResponse(matchId, status);

      if (!result.ok) {
        showLiveToast(result.error ?? "Nepodarilo sa uložiť odpoveď.", "error");
        return;
      }

      showLiveToast(result.message ?? "Odpoveď bola uložená.");
      router.refresh();
    });
  };

  return (
    <section className="rounded-[8px] border border-court-line bg-white p-4 shadow-sm">
      <p className="text-sm font-black uppercase text-court-mint">Tvoja odpoveď</p>
      <h2 className="mt-2 text-xl font-black text-court-ink">Ideš hrať?</h2>

      {!isConfigured ? (
        <p className="mt-4 rounded-[8px] border border-court-coral bg-court-coral/10 px-3 py-2 text-sm font-bold text-court-ink">
          Supabase nie je nakonfigurovaný, odpovede sa zatiaľ neukladajú.
        </p>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          disabled={!isConfigured || isPending}
          variant={userResponse === "available" ? "primary" : "secondary"}
          className="w-full py-3"
          onClick={() => handleSubmit("available")}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Idem
        </Button>
        <Button
          type="button"
          disabled={!isConfigured || isPending}
          variant={userResponse === "unavailable" ? "primary" : "secondary"}
          className="w-full py-3"
          onClick={() => handleSubmit("unavailable")}
        >
          <XCircle className="mr-2 h-4 w-4" />
          Nejdem
        </Button>
      </div>
    </section>
  );
}
