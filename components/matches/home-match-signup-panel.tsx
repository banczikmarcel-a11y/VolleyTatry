"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { UserPlus2 } from "lucide-react";
import { submitHomeMatchSignup } from "@/app/matches/actions";
import { PlayerCombobox } from "@/components/players/player-combobox";
import { buttonClasses, Button } from "@/components/ui/button";
import { showLiveToast } from "@/components/ui/live-toast";
import type { MatchSignupPlayer } from "@/lib/matches";
import type { MatchResponseStatus } from "@/types/entities";

type HomeMatchSignupPanelProps = {
  className?: string;
  currentUserResponse: MatchResponseStatus | null;
  isConfigured: boolean;
  matchId: string;
  players: MatchSignupPlayer[];
  returnPath?: string;
  userId: string | null;
};

export function HomeMatchSignupPanel({
  className,
  currentUserResponse,
  isConfigured,
  matchId,
  players,
  returnPath,
  userId
}: HomeMatchSignupPanelProps) {
  const router = useRouter();
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!userId) {
    return (
      <Link href={`/login?next=${encodeURIComponent(returnPath ?? "/")}`} className={buttonClasses({ className: "mt-4 w-full", variant: "secondary" })}>
        Prihlásiť sa pre zápis na zápas
      </Link>
    );
  }

  const isCurrentUserSignedUp = currentUserResponse === "available";

  const handleSubmit = (targetProfileId: string | null, status: "available" | "unavailable") => {
    startTransition(async () => {
      const result = await submitHomeMatchSignup({
        matchId,
        profileId: targetProfileId,
        returnPath,
        status
      });

      if (!result.ok) {
        showLiveToast(result.error ?? "Nepodarilo sa uložiť odpoveď.", "error");
        return;
      }

      if (targetProfileId) {
        setSelectedPlayerId("");
      }

      showLiveToast(result.message ?? "Odpoveď bola uložená.");
      router.refresh();
    });
  };

  return (
    <div className={`mt-4 space-y-3 rounded-[8px] border border-court-line bg-white p-4 ${className ?? ""}`}>
      <p className="text-sm font-black uppercase text-court-mint">Prihlásenie na zápas</p>

      <Button
        type="button"
        disabled={!isConfigured || isPending}
        className="w-full py-3"
        onClick={() => handleSubmit(null, isCurrentUserSignedUp ? "unavailable" : "available")}
      >
        <UserPlus2 className="mr-2 h-4 w-4" />
        {isCurrentUserSignedUp ? "Odhlásiť ma" : "Prihlásiť ma"}
      </Button>

      <div className="space-y-3">
        <PlayerCombobox
          inputName="profileId"
          label="Prihlásiť iného hráča"
          players={players}
          selectedId={selectedPlayerId || undefined}
          onValueChange={setSelectedPlayerId}
        />
        <Button
          type="button"
          disabled={!isConfigured || isPending || !selectedPlayerId || players.length === 0}
          variant="secondary"
          className="w-full py-3"
          onClick={() => handleSubmit(selectedPlayerId, "available")}
        >
          Prihlásiť hráča
        </Button>
      </div>
    </div>
  );
}
