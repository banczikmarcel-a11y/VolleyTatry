"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createTournamentService } from "@/src/server/tournaments";
import type { GeneratedTournamentMatchDraft, TournamentGroupRecord, TournamentRecord } from "@/src/server/tournaments";
import type { TournamentGroupCode } from "@/types/tournament";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(formData: FormData, key: string) {
  const raw = getString(formData, key);
  const value = Number(raw);
  return Number.isFinite(value) ? value : Number.NaN;
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value || null;
}

function redirectWithMessage(path: string, type: "error" | "message", text: string): never {
  redirect(`${path}?${type}=${encodeURIComponent(text)}`);
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function combineDateAndTime(date: string, time: string) {
  const input = `${date}T${time}:00`;
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function getErrorMessage(error: { message: string }) {
  return error.message;
}

export async function createTournamentAction(formData: FormData) {
  const service = await createTournamentService();
  const name = getString(formData, "name");
  const date = getString(formData, "date");
  const time = getString(formData, "start_time");
  const location = getString(formData, "location");
  const formatKey = getString(formData, "format_key");
  const courtCount = getNumber(formData, "court_count");
  const matchDuration = getNumber(formData, "match_duration_minutes");
  const breakDuration = getNumber(formData, "break_duration_minutes");

  if (!name || !date || !time || !location || !formatKey) {
    redirectWithMessage("/admin/tournaments/new", "error", "Vyplň názov, dátum, čas, miesto a formát turnaja.");
  }

  if (!Number.isInteger(courtCount) || courtCount < 1) {
    redirectWithMessage("/admin/tournaments/new", "error", "Počet ihrísk musí byť aspoň 1.");
  }

  if (!Number.isInteger(matchDuration) || matchDuration < 1) {
    redirectWithMessage("/admin/tournaments/new", "error", "Dĺžka zápasu musí byť kladné číslo.");
  }

  if (!Number.isInteger(breakDuration) || breakDuration < 0) {
    redirectWithMessage("/admin/tournaments/new", "error", "Prestávka musí byť 0 alebo viac minút.");
  }

  const startsAt = combineDateAndTime(date, time);

  if (!startsAt) {
    redirectWithMessage("/admin/tournaments/new", "error", "Zadaj platný dátum a čas začiatku.");
  }

  const serviceResult = await service.createTournament({
    breakDurationMinutes: breakDuration,
    courtCount,
    formatKey,
    location,
    matchDurationMinutes: matchDuration,
    name,
    slug: slugify(`${name}-${date}`),
    startsAt
  });

  if (!serviceResult.ok) {
    redirectWithMessage("/admin/tournaments/new", "error", getErrorMessage(serviceResult.error));
  }

  const createdTournament = serviceResult.data as {
    groups: TournamentGroupRecord[];
    tournament: TournamentRecord;
  };

  revalidatePath("/admin/tournaments");
  redirect(
    `/admin/tournaments/${createdTournament.tournament.id}/teams?message=${encodeURIComponent(
      "Turnaj bol vytvorený. Pokračuj pridaním družstiev a skupín."
    )}`
  );
}

export async function addTournamentTeamAction(formData: FormData) {
  const service = await createTournamentService();
  const tournamentId = getString(formData, "tournament_id");
  const displayName = getOptionalString(formData, "display_name");
  const groupCodeRaw = getString(formData, "group_code");
  const seedNumber = getNumber(formData, "seed_number");

  if (!tournamentId || !displayName) {
    redirectWithMessage(`/admin/tournaments/${tournamentId || ""}/teams`, "error", "Chýba turnaj alebo názov družstva.");
  }

  const result = await service.addTeamsToTournament({
    teamIds: [
      {
        displayName,
        groupCode: groupCodeRaw === "A" || groupCodeRaw === "B" ? groupCodeRaw : undefined,
        seedNumber: Number.isInteger(seedNumber) && seedNumber > 0 ? seedNumber : null
      }
    ],
    tournamentId
  });

  if (!result.ok) {
    redirectWithMessage(`/admin/tournaments/${tournamentId}/teams`, "error", getErrorMessage(result.error));
  }

  revalidatePath(`/admin/tournaments/${tournamentId}/teams`);
  revalidatePath(`/admin/tournaments/${tournamentId}`);
  redirectWithMessage(`/admin/tournaments/${tournamentId}/teams`, "message", "Tím bol pridaný do turnaja.");
}

export async function saveTournamentGroupsAction(formData: FormData) {
  const service = await createTournamentService();
  const tournamentId = getString(formData, "tournament_id");

  if (!tournamentId) {
    redirectWithMessage("/admin/tournaments", "error", "Chýba turnaj.");
  }

  const assignments = Array.from(formData.entries())
    .filter(([key]) => key.startsWith("group_for_"))
    .map(([key, value]) => {
      const tournamentTeamId = key.replace("group_for_", "");
      const groupCode: TournamentGroupCode | null = typeof value === "string" && (value === "A" || value === "B") ? value : null;
      const displayName = getOptionalString(formData, `name_for_${tournamentTeamId}`);
      const seedRaw = getString(formData, `seed_for_${tournamentTeamId}`);
      const sortRaw = getString(formData, `sort_for_${tournamentTeamId}`);
      const seedNumber = Number(seedRaw);
      const sortOrder = Number(sortRaw);

      return groupCode
        ? {
            displayName,
            groupCode,
            seedNumber: Number.isInteger(seedNumber) && seedNumber > 0 ? seedNumber : null,
            sortOrder: Number.isInteger(sortOrder) && sortOrder > 0 ? sortOrder : null,
            tournamentTeamId
          }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const result = await service.assignTeamsToGroups({
    assignments,
    tournamentId
  });

  if (!result.ok) {
    redirectWithMessage(`/admin/tournaments/${tournamentId}/teams`, "error", getErrorMessage(result.error));
  }

  revalidatePath(`/admin/tournaments/${tournamentId}/teams`);
  revalidatePath(`/admin/tournaments/${tournamentId}`);
  redirectWithMessage(`/admin/tournaments/${tournamentId}/teams`, "message", "Skupiny boli uložené.");
}

export async function saveScheduleAction(formData: FormData) {
  const service = await createTournamentService();
  const tournamentId = getString(formData, "tournament_id");
  const regenerate = getString(formData, "regenerate") === "true";

  if (!tournamentId) {
    redirectWithMessage("/admin/tournaments", "error", "Chýba turnaj.");
  }

  const previewResult = await service.generateGroupStageSchedule({
    breakDurationMinutes: getNumber(formData, "break_duration_minutes"),
    courtCount: getNumber(formData, "court_count"),
    matchDurationMinutes: getNumber(formData, "match_duration_minutes"),
    tournamentId,
    tournamentStart: getString(formData, "tournament_start")
  });

  if (!previewResult.ok) {
    redirectWithMessage(`/admin/tournaments/${tournamentId}/schedule`, "error", getErrorMessage(previewResult.error));
  }

  const previewData = previewResult.data as {
    matches: GeneratedTournamentMatchDraft[];
    warnings: { code: string; message: string }[];
  };

  if (!regenerate) {
    const repository = await (await import("@/src/server/tournaments")).createTournamentRepository();
    const bundle = await repository.getTournamentBundle(tournamentId);

    if (bundle.ok && bundle.data.matches.some((match) => match.phase === "group_stage")) {
      redirectWithMessage(
        `/admin/tournaments/${tournamentId}/schedule`,
        "error",
        "Rozpis už existuje. Ak ho chceš vytvoriť znova, potvrď regeneráciu."
      );
    }
  }

  const saveResult = await service.saveGeneratedMatches({
    allowRegenerate: regenerate,
    matches: previewData.matches,
    tournamentId
  });

  if (!saveResult.ok) {
    redirectWithMessage(`/admin/tournaments/${tournamentId}/schedule`, "error", getErrorMessage(saveResult.error));
  }

  revalidatePath(`/admin/tournaments/${tournamentId}/schedule`);
  revalidatePath(`/admin/tournaments/${tournamentId}`);
  redirectWithMessage(`/admin/tournaments/${tournamentId}/schedule`, "message", "Rozpis bol uložený.");
}

export async function saveTournamentResultAction(formData: FormData) {
  const service = await createTournamentService();
  const tournamentId = getString(formData, "tournament_id");
  const matchId = getString(formData, "match_id");
  const status = getString(formData, "status");
  const correctionReason = getOptionalString(formData, "correction_reason");
  const sets = [1, 2, 3]
    .map((setNumber) => {
      const homePointsRaw = getString(formData, `home_points_${setNumber}`);
      const awayPointsRaw = getString(formData, `away_points_${setNumber}`);

      if (!homePointsRaw && !awayPointsRaw) {
        return null;
      }

      const homePoints = Number(homePointsRaw);
      const awayPoints = Number(awayPointsRaw);

      if (!Number.isInteger(homePoints) || homePoints < 0 || !Number.isInteger(awayPoints) || awayPoints < 0) {
        return "invalid";
      }

      return {
        awayPoints,
        homePoints,
        setNumber
      };
    });

  if (sets.includes("invalid")) {
    redirectWithMessage(
      `/admin/tournaments/${tournamentId}/matches/${matchId}/result`,
      "error",
      "Body v setoch musia byť nezáporné celé čísla."
    );
  }

  const result = await service.enterOrCorrectMatchResult({
    correctionReason,
    sets: sets.filter((item): item is Exclude<typeof item, null | "invalid"> => item !== null && item !== "invalid"),
    status: status === "completed" || status === "scheduled" || status === "in_progress" || status === "pending" || status === "cancelled" ? status : "completed",
    tournamentId,
    tournamentMatchId: matchId
  });

  if (!result.ok) {
    redirectWithMessage(
      `/admin/tournaments/${tournamentId}/matches/${matchId}/result`,
      "error",
      getErrorMessage(result.error)
    );
  }

  revalidatePath(`/admin/tournaments/${tournamentId}`);
  revalidatePath(`/admin/tournaments/${tournamentId}/matches/${matchId}/result`);
  redirectWithMessage(
    `/admin/tournaments/${tournamentId}/matches/${matchId}/result`,
    "message",
    "Výsledok bol uložený."
  );
}

export async function closeGroupStageAction(formData: FormData) {
  const service = await createTournamentService();
  const tournamentId = getString(formData, "tournament_id");
  const result = await service.closeGroupStage(tournamentId);

  if (!result.ok) {
    redirectWithMessage(`/admin/tournaments/${tournamentId}`, "error", getErrorMessage(result.error));
  }

  revalidatePath(`/admin/tournaments/${tournamentId}`);
  redirectWithMessage(`/admin/tournaments/${tournamentId}`, "message", "Skupinová fáza bola uzavretá.");
}

export async function generatePlayoffsAction(formData: FormData) {
  const service = await createTournamentService();
  const tournamentId = getString(formData, "tournament_id");
  const result = await service.generatePlayoffs(tournamentId);

  if (!result.ok) {
    redirectWithMessage(`/admin/tournaments/${tournamentId}`, "error", getErrorMessage(result.error));
  }

  revalidatePath(`/admin/tournaments/${tournamentId}`);
  revalidatePath(`/admin/tournaments/${tournamentId}/schedule`);
  redirectWithMessage(`/admin/tournaments/${tournamentId}`, "message", "Nadstavba bola vygenerovaná.");
}

export async function deletePlayoffsAction(formData: FormData) {
  const service = await createTournamentService();
  const tournamentId = getString(formData, "tournament_id");
  const result = await service.deletePlayoffs(tournamentId);

  if (!result.ok) {
    redirectWithMessage(`/admin/tournaments/${tournamentId}`, "error", getErrorMessage(result.error));
  }

  revalidatePath(`/admin/tournaments/${tournamentId}`);
  revalidatePath(`/admin/tournaments/${tournamentId}/schedule`);
  redirectWithMessage(`/admin/tournaments/${tournamentId}`, "message", "Nadstavba bola zmazaná.");
}

export async function finishTournamentAction(formData: FormData) {
  const service = await createTournamentService();
  const tournamentId = getString(formData, "tournament_id");
  const result = await service.closeTournament({ tournamentId });

  if (!result.ok) {
    redirectWithMessage(`/admin/tournaments/${tournamentId}`, "error", getErrorMessage(result.error));
  }

  revalidatePath(`/admin/tournaments/${tournamentId}`);
  redirectWithMessage(`/admin/tournaments/${tournamentId}`, "message", "Turnaj bol uzavretý a poradie dopočítané.");
}
