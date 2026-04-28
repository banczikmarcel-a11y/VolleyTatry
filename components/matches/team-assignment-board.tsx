"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Mail, RotateCcw } from "lucide-react";
import { saveMatchLineupAssignment, submitHomeMatchSignup } from "@/app/matches/actions";
import { showLiveToast } from "@/components/ui/live-toast";
import { buildMatchEmailBody, buildMatchMailtoHref, buildMatchEmailSubject } from "@/lib/match-email";
import type { MatchSignupPlayer } from "@/lib/matches";

type TeamAssignmentBoardProps = {
  adminEmailRecipients?: string[];
  awayTeamName: string;
  awaySets?: number | null;
  canEmailAdmin?: boolean;
  homeTeamName: string;
  homeSets?: number | null;
  isLocked?: boolean;
  matchId: string;
  matchDateLabel?: string;
  matchTitle?: string;
  players: MatchSignupPlayer[];
};

type AssignmentTarget = "available" | "home" | "away";

type AssignmentState = Record<string, AssignmentTarget>;

function AssignmentColumn({
  isPending,
  isLocked,
  onMarkUnavailable,
  onAssign,
  onDrop,
  players,
  target,
  title
}: {
  isPending: boolean;
  isLocked: boolean;
  onMarkUnavailable: (playerId: string) => void;
  onAssign: (playerId: string, nextTarget: AssignmentTarget) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>, nextTarget: AssignmentTarget) => void;
  players: MatchSignupPlayer[];
  target: AssignmentTarget;
  title: string;
}) {
  return (
    <div
      onDragOver={isLocked ? undefined : (event) => event.preventDefault()}
      onDrop={isLocked ? undefined : (event) => onDrop(event, target)}
      className="min-h-[120px] rounded-[8px] border border-dashed border-court-line bg-white p-3"
    >
      <p className="text-xs font-black uppercase text-court-blue">{title}</p>
      <div className="mt-3 space-y-2">
        {players.length > 0 ? (
          players.map((player) => (
            <div
              key={player.id}
              draggable={!isLocked}
              onDragStart={isLocked ? undefined : (event) => event.dataTransfer.setData("text/plain", player.id)}
              className="rounded-[8px] border border-court-line bg-court-ice px-3 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="truncate text-sm font-black text-court-ink">{player.label}</p>
                {!isLocked ? <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-court-blue" /> : null}
              </div>
              {!isLocked ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {target !== "home" ? (
                    <button
                      type="button"
                      onClick={() => onAssign(player.id, "home")}
                      disabled={isPending}
                      className="rounded-[8px] border border-court-line px-2 py-1 text-xs font-black text-court-blue transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Tatry
                    </button>
                  ) : null}
                  {target !== "away" ? (
                    <button
                      type="button"
                      onClick={() => onAssign(player.id, "away")}
                      disabled={isPending}
                      className="rounded-[8px] border border-court-line px-2 py-1 text-xs font-black text-court-blue transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Ostatní
                    </button>
                  ) : null}
                  {target !== "available" ? (
                    <button
                      type="button"
                      onClick={() => onAssign(player.id, "available")}
                      disabled={isPending}
                      className="rounded-[8px] border border-court-line px-2 py-1 text-xs font-black text-court-blue transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Nepriradený
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onMarkUnavailable(player.id)}
                    disabled={isPending}
                    className="rounded-[8px] border border-court-coral px-2 py-1 text-xs font-black text-court-coral transition hover:bg-court-coral/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Nejdem
                  </button>
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-court-blue">Bez hráčov.</p>
        )}
      </div>
    </div>
  );
}

export function TeamAssignmentBoard({
  adminEmailRecipients = [],
  awayTeamName,
  awaySets = null,
  canEmailAdmin = false,
  homeTeamName,
  homeSets = null,
  isLocked = false,
  matchId,
  matchDateLabel = "",
  matchTitle = "Zápas",
  players
}: TeamAssignmentBoardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const initialAssignments = useMemo(
    () =>
      Object.fromEntries(
        players.map((player) => [
          player.id,
          player.assignedTeamSide ?? (player.preferredTeamSlug === "tatry" ? "home" : player.preferredTeamSlug === "ostatni" ? "away" : "available")
        ])
      ) as AssignmentState,
    [players]
  );
  const [assignments, setAssignments] = useState<AssignmentState>(initialAssignments);

  useEffect(() => {
    setAssignments(initialAssignments);
  }, [initialAssignments]);

  const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);

  const grouped = useMemo(() => {
    const available: MatchSignupPlayer[] = [];
    const home: MatchSignupPlayer[] = [];
    const away: MatchSignupPlayer[] = [];

    players.forEach((player) => {
      const target = assignments[player.id] ?? "available";

      if (target === "home") {
        home.push(player);
      } else if (target === "away") {
        away.push(player);
      } else {
        available.push(player);
      }
    });

    return { available, away, home };
  }, [assignments, players]);

  const emailHref = useMemo(() => {
    if (!canEmailAdmin || adminEmailRecipients.length === 0) {
      return "";
    }

    const subject = buildMatchEmailSubject(matchTitle, matchDateLabel || "Bez dátumu");
    const body = buildMatchEmailBody({
      awayPlayers: grouped.away,
      awaySets,
      awayTeamName,
      homePlayers: grouped.home,
      homeSets,
      homeTeamName
    });

    return buildMatchMailtoHref({
      body,
      recipients: adminEmailRecipients,
      subject
    });
  }, [adminEmailRecipients, awaySets, awayTeamName, canEmailAdmin, grouped.away, grouped.home, homeSets, homeTeamName, matchDateLabel, matchTitle]);

  const assignPlayer = (playerId: string, nextTarget: AssignmentTarget) => {
    if (isLocked) {
      return;
    }

    if (!playersById.has(playerId)) {
      return;
    }

    const previousTarget = assignments[playerId] ?? "available";

    setAssignments((current) => ({
      ...current,
      [playerId]: nextTarget
    }));

    startTransition(async () => {
      const result = await saveMatchLineupAssignment({
        matchId,
        profileId: playerId,
        teamSide: nextTarget
      });

      if (!result.ok) {
        setAssignments((current) => ({
          ...current,
          [playerId]: previousTarget
        }));
        showLiveToast(result.error ?? "Nepodarilo sa uložiť rozdelenie hráča.", "error");
        return;
      }

      showLiveToast(result.message ?? "Rozdelenie hráča bolo uložené.");
    });
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>, nextTarget: AssignmentTarget) => {
    if (isLocked) {
      return;
    }

    event.preventDefault();
    const playerId = event.dataTransfer.getData("text/plain");
    assignPlayer(playerId, nextTarget);
  };

  const markUnavailable = (playerId: string) => {
    if (isLocked) {
      return;
    }

    startTransition(async () => {
      const result = await submitHomeMatchSignup({
        matchId,
        profileId: playerId,
        status: "unavailable"
      });

      if (!result.ok) {
        showLiveToast(result.error ?? "Nepodarilo sa zmeniť účasť hráča.", "error");
        return;
      }

      router.refresh();
      showLiveToast(result.message ?? "Hráč bol odhlásený zo zápasu.");
    });
  };

  const hasAssignments = grouped.home.length > 0 || grouped.away.length > 0;

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase text-court-mint">Rozdelenie hráčov</p>
          <h2 className="mt-2 text-xl font-black text-court-ink">Nominácia prihlásených hráčov</h2>
          <p className="mt-2 text-sm leading-6 text-court-blue">
            {isLocked
              ? "Zápas je ukončený, preto už priradenie hráčov nie je možné meniť."
              : "Presuň hráča myšou do družstva alebo ho priraď tlačidlom na karte hráča."}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {canEmailAdmin && emailHref ? (
            <a
              href={emailHref}
              className="inline-flex items-center gap-2 rounded-[8px] border border-court-line px-3 py-2 text-sm font-black text-court-blue transition hover:bg-court-ice"
            >
              <Mail className="h-4 w-4" />
              E-mail vedeniu
            </a>
          ) : null}
          {hasAssignments && !isLocked ? (
            <button
              type="button"
              onClick={() =>
                setAssignments(
                  Object.fromEntries(
                    players.map((player) => [
                      player.id,
                      player.preferredTeamSlug === "tatry" ? "home" : player.preferredTeamSlug === "ostatni" ? "away" : "available"
                    ])
                  )
                )
              }
              className="inline-flex items-center gap-2 rounded-[8px] border border-court-line px-3 py-2 text-sm font-black text-court-blue transition hover:bg-court-ice"
              disabled={isPending}
            >
              <RotateCcw className="h-4 w-4" />
              Obnoviť
            </button>
          ) : null}
        </div>
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <table className="min-w-[980px] w-full border-collapse text-left">
          <thead className="bg-court-ice">
            <tr className="border-b border-court-line">
              <th className="px-5 py-4 text-xs font-black uppercase text-court-blue">Nepriradení</th>
              <th className="px-5 py-4 text-xs font-black uppercase text-court-blue">{homeTeamName}</th>
              <th className="px-5 py-4 text-xs font-black uppercase text-court-blue">{awayTeamName}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="align-top p-3">
                <AssignmentColumn
                  title="Nepriradení hráči"
                  players={grouped.available}
                  isLocked={isLocked}
                  onAssign={assignPlayer}
                  onDrop={handleDrop}
                  onMarkUnavailable={markUnavailable}
                  isPending={isPending}
                  target="available"
                />
              </td>
              <td className="align-top p-3">
                <AssignmentColumn
                  title="Hráči Tatier"
                  players={grouped.home}
                  isLocked={isLocked}
                  onAssign={assignPlayer}
                  onDrop={handleDrop}
                  onMarkUnavailable={markUnavailable}
                  isPending={isPending}
                  target="home"
                />
              </td>
              <td className="align-top p-3">
                <AssignmentColumn
                  title="Hráči Ostatní"
                  players={grouped.away}
                  isLocked={isLocked}
                  onAssign={assignPlayer}
                  onDrop={handleDrop}
                  onMarkUnavailable={markUnavailable}
                  isPending={isPending}
                  target="away"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 sm:hidden">
        <AssignmentColumn
          title="Nepriradení hráči"
          players={grouped.available}
          isLocked={isLocked}
          onAssign={assignPlayer}
          onDrop={handleDrop}
          onMarkUnavailable={markUnavailable}
          isPending={isPending}
          target="available"
        />
        <AssignmentColumn
          title={homeTeamName}
          players={grouped.home}
          isLocked={isLocked}
          onAssign={assignPlayer}
          onDrop={handleDrop}
          onMarkUnavailable={markUnavailable}
          isPending={isPending}
          target="home"
        />
        <AssignmentColumn
          title={awayTeamName}
          players={grouped.away}
          isLocked={isLocked}
          onAssign={assignPlayer}
          onDrop={handleDrop}
          onMarkUnavailable={markUnavailable}
          isPending={isPending}
          target="away"
        />
      </div>
    </section>
  );
}
