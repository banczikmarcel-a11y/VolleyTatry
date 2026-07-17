import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createInMemoryTournamentHarness } from "@/src/server/tournaments/testing/in-memory-tournament-harness";
import type {
  GeneratedTournamentMatchDraft,
  TournamentGroupRecord,
  TournamentRecord,
  TournamentServiceResult
} from "@/src/server/tournaments";

function assertOk<T>(result: TournamentServiceResult<T>): T {
  if (!result.ok) {
    assert.fail(result.error.message);
  }

  return result.data;
}

function assertErrorCode(result: TournamentServiceResult<unknown>, expectedCode: string) {
  assert.equal(result.ok, false, "Expected the operation to fail.");

  if (result.ok) {
    throw new Error("Expected failure result.");
  }

  assert.equal(result.error.code, expectedCode);
}

test("authorization: anonymous and player users are blocked from admin tournament actions", async () => {
  const anonymousHarness = await createInMemoryTournamentHarness({
    error: null,
    isAdmin: false,
    userId: null
  });

  const anonymousCreate = await anonymousHarness.service.createTournament({
    breakDurationMinutes: 5,
    courtCount: 2,
    formatKey: "ten_teams_two_groups_semifinals_placement",
    location: "Poprad",
    matchDurationMinutes: 20,
    name: "Unauthorized Cup",
    slug: "unauthorized-cup",
    startsAt: "2026-08-01T08:00:00.000Z"
  });

  assertErrorCode(anonymousCreate, "AUTHORIZATION_REQUIRED");

  const playerHarness = await createInMemoryTournamentHarness({
    error: null,
    isAdmin: false,
    userId: "player-user-1"
  });

  const playerCreate = await playerHarness.service.createTournament({
    breakDurationMinutes: 5,
    courtCount: 2,
    formatKey: "ten_teams_two_groups_semifinals_placement",
    location: "Poprad",
    matchDurationMinutes: 20,
    name: "Player Blocked Cup",
    slug: "player-blocked-cup",
    startsAt: "2026-08-02T08:00:00.000Z"
  });

  assertErrorCode(playerCreate, "AUTHORIZATION_REQUIRED");

  const playerSaveResult = await playerHarness.service.enterOrCorrectMatchResult({
    sets: [
      { awayPoints: 18, homePoints: 25, setNumber: 1 },
      { awayPoints: 20, homePoints: 25, setNumber: 2 }
    ],
    status: "completed",
    tournamentId: "missing-tournament",
    tournamentMatchId: "missing-match"
  });

  assertErrorCode(playerSaveResult, "AUTHORIZATION_REQUIRED");
});

test("authorization: administrator can create tournaments and correct results", async () => {
  const harness = await createInMemoryTournamentHarness();
  const created = assertOk(await harness.service.createTournament({
    breakDurationMinutes: 5,
    courtCount: 1,
    formatKey: "ten_teams_two_groups_semifinals_placement",
    location: "Štrba",
    matchDurationMinutes: 20,
    name: "Admin Cup",
    slug: "admin-cup",
    startsAt: "2026-08-03T08:00:00.000Z"
  })) as { groups: TournamentGroupRecord[]; tournament: TournamentRecord };

  await harness.service.addTeamsToTournament({
    teamIds: harness.baseTeams.slice(0, 10).map((team, index) => ({
      groupCode: index < 5 ? "A" : "B",
      seedNumber: (index % 5) + 1,
      sortOrder: index + 1,
      teamId: team.id
    })),
    tournamentId: created.tournament.id
  });

  const schedule = assertOk(await harness.service.generateGroupStageSchedule({
    breakDurationMinutes: 5,
    courtCount: 1,
    matchDurationMinutes: 20,
    tournamentId: created.tournament.id,
    tournamentStart: "2026-08-03T08:00:00.000Z"
  })) as { matches: GeneratedTournamentMatchDraft[]; warnings: { code: string; message: string }[] };

  await harness.service.saveGeneratedMatches({
    matches: schedule.matches,
    tournamentId: created.tournament.id
  });

  const bundle = await harness.getBundle();
  const firstGroupMatch = bundle.matches.find((match) => match.phase === "group_stage");
  assert.ok(firstGroupMatch);

  const firstSave = await harness.service.enterOrCorrectMatchResult({
    sets: [
      { awayPoints: 18, homePoints: 25, setNumber: 1 },
      { awayPoints: 20, homePoints: 25, setNumber: 2 }
    ],
    status: "completed",
    tournamentId: created.tournament.id,
    tournamentMatchId: firstGroupMatch!.id
  });

  assert.equal(firstSave.ok, true);

  const correctionSave = await harness.service.enterOrCorrectMatchResult({
    correctionReason: "Opravený zápis bodov v druhom sete",
    sets: [
      { awayPoints: 18, homePoints: 25, setNumber: 1 },
      { awayPoints: 19, homePoints: 25, setNumber: 2 }
    ],
    status: "completed",
    tournamentId: created.tournament.id,
    tournamentMatchId: firstGroupMatch!.id
  });

  assert.equal(correctionSave.ok, true);
  assert.equal(harness.getAuditLogs().length, 2);
  assert.equal(harness.getAuditLogs()[0]?.correction_reason, "Opravený zápis bodov v druhom sete");
});

test("rls: tournament SQL keeps public read and admin-only write boundaries", async () => {
  const tournamentRlsSql = await readFile("supabase/migrations/0010_tournament_module_rls.sql", "utf8");
  const tournamentAuditSql = await readFile("supabase/migrations/0012_tournament_result_audit.sql", "utf8");

  assert.match(tournamentRlsSql, /create policy "tournaments_select_public"[\s\S]*for select[\s\S]*to public[\s\S]*public\.can_read_tournament\(id\)/);
  assert.match(tournamentRlsSql, /create policy "tournaments_admin_write"[\s\S]*for all[\s\S]*to authenticated[\s\S]*public\.is_team_admin\(\)/);
  assert.match(tournamentRlsSql, /create policy "tournament_matches_select_public"[\s\S]*for select[\s\S]*to public[\s\S]*public\.can_read_tournament\(tournament_id\)/);
  assert.match(tournamentRlsSql, /create policy "tournament_matches_admin_write"[\s\S]*for all[\s\S]*to authenticated[\s\S]*public\.is_team_admin\(\)/);
  assert.match(tournamentAuditSql, /create policy "tournament_result_audit_logs_admin_select"[\s\S]*for select[\s\S]*to authenticated[\s\S]*public\.is_team_admin\(\)/);
  assert.match(tournamentAuditSql, /create policy "tournament_result_audit_logs_admin_insert"[\s\S]*for insert[\s\S]*to authenticated[\s\S]*public\.is_team_admin\(\)/);
  assert.doesNotMatch(tournamentAuditSql, /for select[\s\S]*to public/);
});

test("browser client cannot use service-role privileges", async () => {
  const browserServerClientSource = await readFile("supabase/server.ts", "utf8");
  const adminClientSource = await readFile("supabase/admin.ts", "utf8");
  const envSource = await readFile("supabase/env.ts", "utf8");

  assert.match(browserServerClientSource, /const \{ anonKey, url \} = requireSupabaseConfig\(\)/);
  assert.doesNotMatch(browserServerClientSource, /serviceRoleKey/);
  assert.match(adminClientSource, /const \{ serviceRoleKey, url \} = requireSupabaseAdminConfig\(\)/);
  assert.match(envSource, /const serviceRoleKey = process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(envSource, /const anonKey = process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY/);
});
