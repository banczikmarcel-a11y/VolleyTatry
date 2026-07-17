import "server-only";

import { createClient } from "@/supabase/server";
import type { Database } from "@/types/database";
import type {
  TournamentBundle,
  TournamentFinalStandingRecord,
  TournamentFinalStandingWriteInput,
  TournamentFormatRecord,
  TournamentGroupRecord,
  TournamentMatchRecord,
  TournamentMatchResultWriteInput,
  TournamentMatchSetRecord,
  TournamentMatchSourceRecord,
  TournamentMatchWriteInput,
  TournamentRecord,
  TournamentResultAuditLogRecord,
  TournamentResultAuditLogWriteInput,
  TournamentRepositoryError,
  TournamentRepositoryResult,
  TournamentTeamRecord
} from "@/src/server/tournaments/types";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

type TournamentTeamJoinedRow = Database["public"]["Tables"]["tournament_teams"]["Row"] & {
  teams: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null;
};

function fallbackTeamSlug(label: string) {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

type TournamentResultAuditLogJoinedRow = Database["public"]["Tables"]["tournament_result_audit_logs"]["Row"] & {
  profiles:
    | { email: string | null; full_name: string | null }
    | { email: string | null; full_name: string | null }[]
    | null;
};

function getSingleRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapError(error: PostgrestError, fallbackCode: TournamentRepositoryError["code"] = "UNKNOWN"): TournamentRepositoryError {
  const code =
    error.code === "23505"
      ? "CONFLICT"
      : error.code === "PGRST116"
        ? "NOT_FOUND"
        : fallbackCode;

  return {
    cause: error,
    code,
    message: error.message
  };
}

function ok<T>(data: T): TournamentRepositoryResult<T> {
  return { data, ok: true };
}

function fail<T>(error: TournamentRepositoryError): TournamentRepositoryResult<T> {
  return { error, ok: false };
}

function mapTournamentFormat(row: Database["public"]["Tables"]["tournament_formats"]["Row"]): TournamentFormatRecord {
  return {
    description: row.description,
    id: row.id,
    is_active: row.is_active,
    key: row.key,
    name: row.name,
    rules: row.rules
  };
}

function mapTournament(
  row: Database["public"]["Tables"]["tournaments"]["Row"],
  format: Database["public"]["Tables"]["tournament_formats"]["Row"]
): TournamentRecord {
  return {
    break_duration_minutes: row.break_duration_minutes,
    court_count: row.court_count,
    created_at: row.created_at,
    description: row.description,
    ends_at: row.ends_at,
    format: mapTournamentFormat(format),
    id: row.id,
    is_public: row.is_public,
    location: row.location,
    match_duration_minutes: row.match_duration_minutes,
    name: row.name,
    published_at: row.published_at,
    slug: row.slug,
    starts_at: row.starts_at,
    status: row.status,
    updated_at: row.updated_at
  };
}

function mapGroup(row: Database["public"]["Tables"]["tournament_groups"]["Row"]): TournamentGroupRecord {
  return {
    code: row.code,
    created_at: row.created_at,
    id: row.id,
    name: row.name,
    sort_order: row.sort_order,
    tournament_id: row.tournament_id,
    updated_at: row.updated_at
  };
}

function mapTournamentTeam(
  row: TournamentTeamJoinedRow,
  groupsById: Map<string, Database["public"]["Tables"]["tournament_groups"]["Row"]>
): TournamentTeamRecord {
  const team = getSingleRelation(row.teams);
  const group = row.tournament_group_id ? groupsById.get(row.tournament_group_id) ?? null : null;
  const resolvedTeamName = team?.name ?? row.display_name ?? "Neznáme družstvo";
  const resolvedTeamSlug = team?.slug ?? (fallbackTeamSlug(row.display_name ?? resolvedTeamName) || "tournament-team");

  return {
    created_at: row.created_at,
    display_name: row.display_name,
    groupCode: group?.code ?? "A",
    groupName: group?.name ?? null,
    id: row.id,
    seed_number: row.seed_number,
    sort_order: row.sort_order,
    team_id: row.team_id,
    teamName: resolvedTeamName,
    teamSlug: resolvedTeamSlug,
    tournament_group_id: row.tournament_group_id,
    tournament_id: row.tournament_id,
    updated_at: row.updated_at
  };
}

function mapMatchSource(row: Database["public"]["Tables"]["match_sources"]["Row"]): TournamentMatchSourceRecord {
  return {
    id: row.id,
    participant_slot: row.participant_slot,
    source_group_code: row.source_group_code,
    source_group_position: row.source_group_position,
    source_tournament_match_id: row.source_tournament_match_id,
    source_tournament_team_id: row.source_tournament_team_id,
    source_type: row.source_type,
    tournament_id: row.tournament_id,
    tournament_match_id: row.tournament_match_id
  };
}

function mapMatchSet(row: Database["public"]["Tables"]["match_sets"]["Row"]): TournamentMatchSetRecord {
  return {
    away_points: row.away_points,
    home_points: row.home_points,
    id: row.id,
    set_number: row.set_number,
    tournament_id: row.tournament_id,
    tournament_match_id: row.tournament_match_id
  };
}

function mapMatch(
  row: Database["public"]["Tables"]["tournament_matches"]["Row"],
  sources: readonly Database["public"]["Tables"]["match_sources"]["Row"][],
  sets: readonly Database["public"]["Tables"]["match_sets"]["Row"][]
): TournamentMatchRecord {
  return {
    away_tournament_team_id: row.away_tournament_team_id,
    bracket_key: row.bracket_key,
    created_at: row.created_at,
    home_tournament_team_id: row.home_tournament_team_id,
    id: row.id,
    label: row.label,
    location: row.location,
    match_id: row.match_id,
    phase: row.phase,
    placement_rank: row.placement_rank,
    referee_tournament_team_id: row.referee_tournament_team_id,
    round_number: row.round_number,
    scheduled_at: row.scheduled_at,
    sets: sets.filter((set) => set.tournament_match_id === row.id).map(mapMatchSet).sort((left, right) => left.set_number - right.set_number),
    slot_number: row.slot_number,
    sources: sources.filter((source) => source.tournament_match_id === row.id).map(mapMatchSource),
    status: row.status,
    tournament_group_id: row.tournament_group_id,
    tournament_id: row.tournament_id,
    updated_at: row.updated_at
  };
}

function mapFinalStanding(row: Database["public"]["Tables"]["final_standings"]["Row"]): TournamentFinalStandingRecord {
  return {
    created_at: row.created_at,
    final_position: row.final_position,
    id: row.id,
    notes: row.notes,
    tournament_id: row.tournament_id,
    tournament_team_id: row.tournament_team_id,
    updated_at: row.updated_at
  };
}

function mapResultAuditLog(row: TournamentResultAuditLogJoinedRow): TournamentResultAuditLogRecord {
  const profile = getSingleRelation(row.profiles);

  return {
    changed_at: row.changed_at,
    changed_by: row.changed_by,
    changedByIdentity: profile
      ? {
          email: profile.email,
          fullName: profile.full_name
        }
      : null,
    correction_reason: row.correction_reason,
    id: row.id,
    new_result: row.new_result,
    previous_result: row.previous_result,
    tournament_id: row.tournament_id,
    tournament_match_id: row.tournament_match_id
  };
}

async function loadTournamentRows(supabase: SupabaseClient<Database>, tournamentId: string) {
  const { data: tournamentRow, error: tournamentError } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .maybeSingle();

  if (tournamentError) {
    return fail<TournamentBundle>(mapError(tournamentError));
  }

  if (!tournamentRow) {
    return fail<TournamentBundle>({
      code: "NOT_FOUND",
      message: `Tournament '${tournamentId}' was not found.`
    });
  }

  const [{ data: formatRow, error: formatError }, { data: groupRows, error: groupsError }, { data: teamRows, error: teamsError }, { data: matchRows, error: matchesError }, { data: sourceRows, error: sourcesError }, { data: setRows, error: setsError }, { data: finalStandingRows, error: finalStandingsError }] =
    await Promise.all([
      supabase.from("tournament_formats").select("*").eq("id", tournamentRow.format_id).single(),
      supabase.from("tournament_groups").select("*").eq("tournament_id", tournamentId).order("sort_order"),
      supabase
        .from("tournament_teams")
        .select("*,teams:team_id(id,name,slug)")
        .eq("tournament_id", tournamentId)
        .order("sort_order", { ascending: true })
        .order("seed_number", { ascending: true, nullsFirst: false }),
      supabase.from("tournament_matches").select("*").eq("tournament_id", tournamentId).order("phase").order("round_number").order("slot_number"),
      supabase.from("match_sources").select("*").eq("tournament_id", tournamentId).order("participant_slot"),
      supabase.from("match_sets").select("*").eq("tournament_id", tournamentId).order("set_number"),
      supabase.from("final_standings").select("*").eq("tournament_id", tournamentId).order("final_position")
    ]);

  if (formatError) {
    return fail<TournamentBundle>(mapError(formatError));
  }

  if (groupsError) {
    return fail<TournamentBundle>(mapError(groupsError));
  }

  if (teamsError) {
    return fail<TournamentBundle>(mapError(teamsError));
  }

  if (matchesError) {
    return fail<TournamentBundle>(mapError(matchesError));
  }

  if (sourcesError) {
    return fail<TournamentBundle>(mapError(sourcesError));
  }

  if (setsError) {
    return fail<TournamentBundle>(mapError(setsError));
  }

  if (finalStandingsError) {
    return fail<TournamentBundle>(mapError(finalStandingsError));
  }

  const groupsById = new Map((groupRows ?? []).map((group) => [group.id, group]));

  return ok({
    finalStandings: (finalStandingRows ?? []).map(mapFinalStanding),
    groups: (groupRows ?? []).map(mapGroup),
    matches: (matchRows ?? []).map((row) => mapMatch(row, sourceRows ?? [], setRows ?? [])),
    teams: ((teamRows ?? []) as TournamentTeamJoinedRow[]).map((row) => mapTournamentTeam(row, groupsById)),
    tournament: mapTournament(tournamentRow, formatRow)
  });
}

async function loadTournamentRowsBySlug(supabase: SupabaseClient<Database>, slug: string) {
  const { data: tournamentRow, error: tournamentError } = await supabase
    .from("tournaments")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (tournamentError) {
    return fail<TournamentBundle>(mapError(tournamentError));
  }

  if (!tournamentRow) {
    return fail<TournamentBundle>({
      code: "NOT_FOUND",
      message: `Tournament '${slug}' was not found.`
    });
  }

  return loadTournamentRows(supabase, tournamentRow.id);
}

export async function createTournamentRepository() {
  const supabase = await createClient();

  return {
    async createTournament(
      input: Database["public"]["Tables"]["tournaments"]["Insert"]
    ): Promise<TournamentRepositoryResult<TournamentRecord>> {
      const { data, error } = await supabase.from("tournaments").insert(input).select("*").single();

      if (error) {
        return fail(mapError(error));
      }

      const { data: format, error: formatError } = await supabase
        .from("tournament_formats")
        .select("*")
        .eq("id", data.format_id)
        .single();

      if (formatError) {
        return fail(mapError(formatError));
      }

      return ok(mapTournament(data, format));
    },

    async updateTournament(
      tournamentId: string,
      update: Database["public"]["Tables"]["tournaments"]["Update"]
    ): Promise<TournamentRepositoryResult<TournamentRecord>> {
      const { data, error } = await supabase.from("tournaments").update(update).eq("id", tournamentId).select("*").single();

      if (error) {
        return fail(mapError(error));
      }

      const { data: format, error: formatError } = await supabase
        .from("tournament_formats")
        .select("*")
        .eq("id", data.format_id)
        .single();

      if (formatError) {
        return fail(mapError(formatError));
      }

      return ok(mapTournament(data, format));
    },

    async deleteTournament(tournamentId: string): Promise<TournamentRepositoryResult<null>> {
      const { error } = await supabase.from("tournaments").delete().eq("id", tournamentId);
      return error ? fail(mapError(error)) : ok(null);
    },

    async getTournamentBundle(tournamentId: string): Promise<TournamentRepositoryResult<TournamentBundle>> {
      return loadTournamentRows(supabase, tournamentId);
    },

    async getTournamentBundleBySlug(slug: string): Promise<TournamentRepositoryResult<TournamentBundle>> {
      return loadTournamentRowsBySlug(supabase, slug);
    },

    async listTournaments(): Promise<TournamentRepositoryResult<TournamentRecord[]>> {
      const { data: tournaments, error } = await supabase.from("tournaments").select("*").order("starts_at", { ascending: true, nullsFirst: false });

      if (error) {
        return fail(mapError(error));
      }

      const formatIds = Array.from(new Set((tournaments ?? []).map((row) => row.format_id)));
      const { data: formats, error: formatsError } = await supabase.from("tournament_formats").select("*").in("id", formatIds);

      if (formatsError) {
        return fail(mapError(formatsError));
      }

      const formatsById = new Map((formats ?? []).map((row) => [row.id, row]));

      return ok(
        (tournaments ?? [])
          .map((row) => {
            const format = formatsById.get(row.format_id);
            return format ? mapTournament(row, format) : null;
          })
          .filter((row): row is TournamentRecord => row !== null)
      );
    },

    async listTournamentFormats(): Promise<TournamentRepositoryResult<TournamentFormatRecord[]>> {
      const { data, error } = await supabase.from("tournament_formats").select("*").order("name");
      return error ? fail(mapError(error)) : ok((data ?? []).map(mapTournamentFormat));
    },

    async listAvailableTeams(): Promise<TournamentRepositoryResult<{ id: string; name: string; slug: string }[]>> {
      const { data, error } = await supabase.from("teams").select("id,name,slug").order("name");
      return error ? fail(mapError(error)) : ok(data ?? []);
    },

    async upsertTournamentGroups(
      rows: readonly Database["public"]["Tables"]["tournament_groups"]["Insert"][]
    ): Promise<TournamentRepositoryResult<TournamentGroupRecord[]>> {
      const { data, error } = await supabase
        .from("tournament_groups")
        .upsert([...rows], { onConflict: "tournament_id,code" })
        .select("*");

      return error ? fail(mapError(error)) : ok((data ?? []).map(mapGroup).sort((left, right) => left.sort_order - right.sort_order));
    },

    async listTournamentGroups(tournamentId: string): Promise<TournamentRepositoryResult<TournamentGroupRecord[]>> {
      const { data, error } = await supabase.from("tournament_groups").select("*").eq("tournament_id", tournamentId).order("sort_order");
      return error ? fail(mapError(error)) : ok((data ?? []).map(mapGroup));
    },

    async upsertTournamentTeams(
      rows: readonly Database["public"]["Tables"]["tournament_teams"]["Insert"][]
    ): Promise<TournamentRepositoryResult<TournamentTeamRecord[]>> {
      const { error } = await supabase.from("tournament_teams").upsert([...rows], { onConflict: "tournament_id,id" });

      if (error) {
        return fail(mapError(error));
      }

      const tournamentId = rows[0]?.tournament_id;

      if (!tournamentId) {
        return ok([]);
      }

      return this.listTournamentTeams(tournamentId);
    },

    async deleteTournamentTeams(tournamentId: string, tournamentTeamIds: readonly string[]): Promise<TournamentRepositoryResult<null>> {
      const { error } = await supabase.from("tournament_teams").delete().eq("tournament_id", tournamentId).in("id", [...tournamentTeamIds]);
      return error ? fail(mapError(error)) : ok(null);
    },

    async listTournamentTeams(tournamentId: string): Promise<TournamentRepositoryResult<TournamentTeamRecord[]>> {
      const [{ data, error }, { data: groups, error: groupsError }] = await Promise.all([
        supabase
          .from("tournament_teams")
          .select("*,teams:team_id(id,name,slug)")
          .eq("tournament_id", tournamentId)
          .order("sort_order", { ascending: true })
          .order("seed_number", { ascending: true, nullsFirst: false }),
        supabase.from("tournament_groups").select("*").eq("tournament_id", tournamentId).order("sort_order")
      ]);

      if (error) {
        return fail(mapError(error));
      }

      if (groupsError) {
        return fail(mapError(groupsError));
      }

      const groupsById = new Map((groups ?? []).map((group) => [group.id, group]));

      return ok(((data ?? []) as TournamentTeamJoinedRow[]).map((row) => mapTournamentTeam(row, groupsById)));
    },

    async upsertTournamentMatches(
      rows: readonly TournamentMatchWriteInput[]
    ): Promise<TournamentRepositoryResult<TournamentMatchRecord[]>> {
      if (rows.length === 0) {
        return ok([]);
      }

      const matchPayloads: Database["public"]["Tables"]["tournament_matches"]["Insert"][] = rows.map((row) => ({
        away_tournament_team_id: row.awayTournamentTeamId ?? null,
        bracket_key: row.bracketKey ?? null,
        home_tournament_team_id: row.homeTournamentTeamId ?? null,
        id: row.id,
        label: row.label ?? null,
        location: row.location ?? null,
        phase: row.phase,
        placement_rank: row.placementRank ?? null,
        referee_tournament_team_id: row.refereeTournamentTeamId ?? null,
        round_number: row.roundNumber ?? null,
        scheduled_at: row.scheduledAt ?? null,
        slot_number: row.slotNumber ?? null,
        status: row.status,
        tournament_group_id: row.tournamentGroupId ?? null,
        tournament_id: row.tournamentId
      }));

      const { data: savedMatches, error: matchesError } = await supabase
        .from("tournament_matches")
        .upsert([...matchPayloads], { onConflict: "tournament_id,phase,round_number,slot_number" })
        .select("*");

      if (matchesError) {
        return fail(mapError(matchesError));
      }

      const keyOf = (row: { phase: string; round_number: number | null; slot_number: number | null; tournament_id: string }) =>
        `${row.tournament_id}:${row.phase}:${row.round_number ?? "null"}:${row.slot_number ?? "null"}`;

      const savedByKey = new Map((savedMatches ?? []).map((row) => [keyOf(row), row]));
      const savedMatchIds = (savedMatches ?? []).map((row) => row.id);

      if (savedMatchIds.length > 0) {
        const { error: deleteSourcesError } = await supabase.from("match_sources").delete().in("tournament_match_id", savedMatchIds);

        if (deleteSourcesError) {
          return fail(mapError(deleteSourcesError));
        }
      }

      const sourcePayloads: Database["public"]["Tables"]["match_sources"]["Insert"][] = [];

      rows.forEach((row) => {
        const savedMatch = savedByKey.get(
          keyOf({
            phase: row.phase,
            round_number: row.roundNumber ?? null,
            slot_number: row.slotNumber ?? null,
            tournament_id: row.tournamentId
          })
        );

        if (!savedMatch) {
          return;
        }

        row.sources.forEach((source) => {
          sourcePayloads.push({
            participant_slot: source.participantSlot,
            source_group_code: source.sourceGroupCode ?? null,
            source_group_position: source.sourceGroupPosition ?? null,
            source_tournament_match_id: source.sourceTournamentMatchId ?? null,
            source_tournament_team_id: source.sourceTournamentTeamId ?? null,
            source_type: source.sourceType,
            tournament_id: row.tournamentId,
            tournament_match_id: savedMatch.id
          });
        });
      });

      if (sourcePayloads.length > 0) {
        const { error: sourcesError } = await supabase.from("match_sources").insert([...sourcePayloads]);

        if (sourcesError) {
          return fail(mapError(sourcesError));
        }
      }

      return this.listTournamentMatches(rows[0].tournamentId);
    },

    async listTournamentMatches(tournamentId: string): Promise<TournamentRepositoryResult<TournamentMatchRecord[]>> {
      const [{ data: matches, error: matchesError }, { data: sources, error: sourcesError }, { data: sets, error: setsError }] = await Promise.all([
        supabase.from("tournament_matches").select("*").eq("tournament_id", tournamentId).order("phase").order("round_number").order("slot_number"),
        supabase.from("match_sources").select("*").eq("tournament_id", tournamentId),
        supabase.from("match_sets").select("*").eq("tournament_id", tournamentId).order("set_number")
      ]);

      if (matchesError) {
        return fail(mapError(matchesError));
      }

      if (sourcesError) {
        return fail(mapError(sourcesError));
      }

      if (setsError) {
        return fail(mapError(setsError));
      }

      return ok((matches ?? []).map((row) => mapMatch(row, sources ?? [], sets ?? [])));
    },

    async replaceMatchResult(input: TournamentMatchResultWriteInput): Promise<TournamentRepositoryResult<TournamentMatchRecord>> {
      const { error: updateError } = await supabase
        .from("tournament_matches")
        .update({ status: input.status, updated_by: input.updatedBy ?? null })
        .eq("tournament_id", input.tournamentId)
        .eq("id", input.tournamentMatchId);

      if (updateError) {
        return fail(mapError(updateError));
      }

      const { error: deleteSetsError } = await supabase
        .from("match_sets")
        .delete()
        .eq("tournament_id", input.tournamentId)
        .eq("tournament_match_id", input.tournamentMatchId);

      if (deleteSetsError) {
        return fail(mapError(deleteSetsError));
      }

      if (input.sets.length > 0) {
        const { error: insertSetsError } = await supabase.from("match_sets").insert(
          [...input.sets].map((set) => ({
            away_points: set.awayPoints,
            created_by: input.updatedBy ?? null,
            home_points: set.homePoints,
            set_number: set.setNumber,
            tournament_id: input.tournamentId,
            tournament_match_id: input.tournamentMatchId,
            updated_by: input.updatedBy ?? null
          }))
        );

        if (insertSetsError) {
          return fail(mapError(insertSetsError));
        }
      }

      const listResult = await this.listTournamentMatches(input.tournamentId);

      if (!listResult.ok) {
        return listResult;
      }

      const match = listResult.data.find((item) => item.id === input.tournamentMatchId);

      if (!match) {
        return fail({
          code: "NOT_FOUND",
          message: `Tournament match '${input.tournamentMatchId}' was not found after result save.`
        });
      }

      return ok(match);
    },

    async insertTournamentResultAuditLog(
      input: TournamentResultAuditLogWriteInput
    ): Promise<TournamentRepositoryResult<TournamentResultAuditLogRecord>> {
      const { data, error } = await supabase
        .from("tournament_result_audit_logs")
        .insert({
          changed_by: input.changedBy,
          correction_reason: input.correctionReason ?? null,
          new_result: input.newResult,
          previous_result: input.previousResult ?? null,
          tournament_id: input.tournamentId,
          tournament_match_id: input.tournamentMatchId
        })
        .select("*,profiles:changed_by(email,full_name)")
        .single();

      return error ? fail(mapError(error)) : ok(mapResultAuditLog(data as TournamentResultAuditLogJoinedRow));
    },

    async listTournamentResultAuditLogs(
      tournamentId: string,
      tournamentMatchId: string
    ): Promise<TournamentRepositoryResult<TournamentResultAuditLogRecord[]>> {
      const { data, error } = await supabase
        .from("tournament_result_audit_logs")
        .select("*,profiles:changed_by(email,full_name)")
        .eq("tournament_id", tournamentId)
        .eq("tournament_match_id", tournamentMatchId)
        .order("changed_at", { ascending: false });

      return error ? fail(mapError(error)) : ok(((data ?? []) as TournamentResultAuditLogJoinedRow[]).map(mapResultAuditLog));
    },

    async listMatchSourcesBySourceMatchId(
      tournamentId: string,
      sourceMatchId: string
    ): Promise<TournamentRepositoryResult<TournamentMatchSourceRecord[]>> {
      const { data, error } = await supabase
        .from("match_sources")
        .select("*")
        .eq("tournament_id", tournamentId)
        .eq("source_tournament_match_id", sourceMatchId)
        .order("participant_slot");

      return error ? fail(mapError(error)) : ok((data ?? []).map(mapMatchSource));
    },

    async updateMatchParticipants(
      tournamentId: string,
      changes: readonly { participantSlot: "away" | "home"; teamId: string | null; tournamentMatchId: string }[]
    ): Promise<TournamentRepositoryResult<TournamentMatchRecord[]>> {
      for (const change of changes) {
        const patch: Database["public"]["Tables"]["tournament_matches"]["Update"] =
          change.participantSlot === "home"
            ? { home_tournament_team_id: change.teamId }
            : { away_tournament_team_id: change.teamId };

        const { error } = await supabase
          .from("tournament_matches")
          .update(patch)
          .eq("tournament_id", tournamentId)
          .eq("id", change.tournamentMatchId);

        if (error) {
          return fail(mapError(error));
        }
      }

      return this.listTournamentMatches(tournamentId);
    },

    async replaceFinalStandings(
      tournamentId: string,
      standings: readonly TournamentFinalStandingWriteInput[]
    ): Promise<TournamentRepositoryResult<TournamentFinalStandingRecord[]>> {
      const { error: deleteError } = await supabase.from("final_standings").delete().eq("tournament_id", tournamentId);

      if (deleteError) {
        return fail(mapError(deleteError));
      }

      if (standings.length === 0) {
        return ok([]);
      }

      const { data, error } = await supabase
        .from("final_standings")
        .insert(
          [...standings].map((standing) => ({
            final_position: standing.finalPosition,
            notes: standing.notes ?? null,
            tournament_id: tournamentId,
            tournament_team_id: standing.tournamentTeamId
          }))
        )
        .select("*");

      return error ? fail(mapError(error)) : ok((data ?? []).map(mapFinalStanding).sort((left, right) => left.final_position - right.final_position));
    }
  };
}
