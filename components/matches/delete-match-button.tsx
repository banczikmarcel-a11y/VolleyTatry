"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteMatchById(matchId);

      if (!result.ok) {
        showLiveToast(result.error ?? "Nepodarilo sa zmazať zápas.", "error");
        return;
      }

      showLiveToast(result.message ?? "Zápas bol zmazaný.");
      router.push("/matches");
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        disabled={isPending}
        className="w-full bg-red-600 text-white hover:bg-red-700"
        onClick={() => setIsConfirmOpen(true)}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Zmazať zápas
      </Button>

      {isConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-court-ink/55 p-4">
          <div className="w-full max-w-md rounded-[8px] border border-court-line bg-white p-5 shadow-panel">
            <p className="text-sm font-black uppercase text-court-coral">Upozornenie</p>
            <h2 className="mt-2 text-xl font-black text-court-ink">Naozaj chceš zmazať zápas</h2>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setIsConfirmOpen(false)} disabled={isPending}>
                Návrat
              </Button>
              <Button
                type="button"
                className="bg-red-600 text-white hover:bg-red-700"
                disabled={isPending}
                onClick={() => {
                  setIsConfirmOpen(false);
                  handleDelete();
                }}
              >
                Zmazať
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
