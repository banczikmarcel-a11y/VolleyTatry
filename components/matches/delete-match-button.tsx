"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteMatchById } from "@/app/matches/actions";
import { Button } from "@/components/ui/button";
import { showLiveToast } from "@/components/ui/live-toast";

type DeleteMatchButtonProps = {
  matchId: string;
};

export function DeleteMatchButton({ matchId }: DeleteMatchButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      disabled={isPending}
      className="w-full bg-red-600 text-white hover:bg-red-700"
      onClick={() =>
        startTransition(async () => {
          const result = await deleteMatchById(matchId);

          if (!result.ok) {
            showLiveToast(result.error ?? "Nepodarilo sa zmazať zápas.", "error");
            return;
          }

          showLiveToast(result.message ?? "Zápas bol zmazaný.");
          router.push("/matches");
          router.refresh();
        })
      }
    >
      <Trash2 className="mr-2 h-4 w-4" />
      Zmazať zápas
    </Button>
  );
}
