"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { submitHomeMatchSignup } from "@/app/matches/actions";
import { showLiveToast } from "@/components/ui/live-toast";
import { Button } from "@/components/ui/button";
import type { MatchSignupPlayer } from "@/lib/matches";

type UnavailablePlayersListProps = {
  isConfigured: boolean;
  matchId: string;
  players: MatchSignupPlayer[];
};

export function UnavailablePlayersList({ isConfigured, matchId, players }: UnavailablePlayersListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (players.length === 0) {
    return <p className="text-sm text-court-blue">Nikto nie je označený ako nejdem.</p>;
  }

  return (
    <div className="mt-3 space-y-2">
      {players.map((player) => (
        <div key={player.id} className="flex items-center justify-between gap-3 rounded-[8px] bg-court-ice px-3 py-2">
          <p className="text-sm font-black text-court-ink">{player.label}</p>
          <Button
            type="button"
            variant="secondary"
            disabled={!isConfigured || isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await submitHomeMatchSignup({
                  matchId,
                  profileId: player.id,
                  returnPath: `/matches/${matchId}`,
                  status: "available"
                });

                if (!result.ok) {
                  showLiveToast(result.error ?? "Nepodarilo sa zmeniť stav hráča.", "error");
                  return;
                }

                router.refresh();
                showLiveToast(result.message ?? "Hráč je znova označený ako idem.");
              })
            }
            className="shrink-0"
          >
            Idem
          </Button>
        </div>
      ))}
    </div>
  );
}
