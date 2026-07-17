import assert from "node:assert/strict";
import test from "node:test";
import { createInMemoryTournamentHarness } from "@/src/server/tournaments/testing/in-memory-tournament-harness";
import type {
  GeneratedTournamentMatchDraft,
  GroupStandingsSnapshot,
  TournamentFinalStandingRecord,
  TournamentGroupRecord,
  TournamentMatchRecord,
  TournamentRecord,
  TournamentServiceResult
} from "@/src/server/tournaments";

function assertOk<T>(result: TournamentServiceResult<T>): T {
  if (!result.ok) {
    assert.fail(result.error.message);
  }

  return result.data;
}

function makeGroupSets(homeWins: boolean) {
  return homeWins
    ? [{ awayPoints: 38, homePoints: 50, setNumber: 1 }]
    : [{ awayPoints: 50, homePoints: 38, setNumber: 1 }];
}

function makePlayoffSets(homeWins: boolean) {
  return homeWins
    ? [
        { awayPoints: 11, homePoints: 15, setNumber: 1 },
        { awayPoints: 12, homePoints: 15, setNumber: 2 }
      ]
    : [
        { awayPoints: 15, homePoints: 11, setNumber: 1 },
        { awayPoints: 15, homePoints: 12, setNumber: 2 }
      ];
}

function teamStrength(teamId: string) {
  return Number(teamId.replace("tt-team-", ""));
}

function strongerTeamIsHome(match: TournamentMatchRecord) {
  if (!match.home_tournament_team_id || !match.away_tournament_team_id) {
    throw new Error(`Match '${match.id}' does not have both participants assigned.`);
  }

  return teamStrength(match.home_tournament_team_id) < teamStrength(match.away_tournament_team_id);
}

test("integration: complete tournament scenario from creation to final standings", async () => {
  const harness = await createInMemoryTournamentHarness();
  const { service } = harness;

  const created = assertOk(
    await service.createTournament({
      breakDurationMinutes: 5,
      courtCount: 2,
      formatKey: "ten_teams_two_groups_semifinals_placement",
      location: "Poprad",
      matchDurationMinutes: 20,
      name: "Tatry Cup 2026",
      slug: "tatry-cup-2026",
      startsAt: "2026-08-01T08:00:00.000Z"
    })
  ) as { groups: TournamentGroupRecord[]; tournament: TournamentRecord };

  assert.equal(created.tournament.id, "tournament-1");
  assert.equal(created.groups.length, 2);

  assertOk(
    await service.addTeamsToTournament({
      teamIds: harness.baseTeams.map((team, index) => ({
        displayName: team.name,
        groupCode: index < 5 ? "A" : "B",
        seedNumber: (index % 5) + 1,
        sortOrder: index + 1,
        teamId: team.id
      })),
      tournamentId: created.tournament.id
    })
  );

  const bundleAfterTeams = await harness.getBundle();
  const groupA = bundleAfterTeams.groups.find((group) => group.code === "A");
  const groupB = bundleAfterTeams.groups.find((group) => group.code === "B");

  assert.ok(groupA);
  assert.ok(groupB);
  assert.equal(bundleAfterTeams.teams.filter((team) => team.tournament_group_id === groupA.id).length, 5);
  assert.equal(bundleAfterTeams.teams.filter((team) => team.tournament_group_id === groupB.id).length, 5);

  const schedulePreview = assertOk(
    await service.generateGroupStageSchedule({
      breakDurationMinutes: created.tournament.break_duration_minutes,
      courtCount: created.tournament.court_count,
      matchDurationMinutes: created.tournament.match_duration_minutes,
      tournamentId: created.tournament.id,
      tournamentStart: created.tournament.starts_at ?? "2026-08-01T08:00:00.000Z"
    })
  ) as { matches: GeneratedTournamentMatchDraft[]; warnings: { code: string; message: string }[] };

  assert.equal(schedulePreview.matches.length, 20);

  assertOk(
    await service.saveGeneratedMatches({
      matches: schedulePreview.matches,
      tournamentId: created.tournament.id
    })
  );

  const scheduledBundle = await harness.getBundle();
  const groupMatches = scheduledBundle.matches.filter((match) => match.phase === "group_stage");
  const groupAMatches = groupMatches.filter((match) => match.tournament_group_id === groupA.id);
  const groupBMatches = groupMatches.filter((match) => match.tournament_group_id === groupB.id);

  assert.equal(groupAMatches.length, 10);
  assert.equal(groupBMatches.length, 10);

  const teamsById = new Map(scheduledBundle.teams.map((team) => [team.id, team]));

  groupMatches.forEach((match) => {
    assert.ok(match.referee_tournament_team_id, `Match '${match.id}' should have a referee team.`);
    const referee = teamsById.get(match.referee_tournament_team_id ?? "");

    assert.ok(referee, `Referee team for '${match.id}' should exist.`);
    assert.equal(referee?.tournament_group_id, match.tournament_group_id, `Referee for '${match.id}' must be from the same group.`);
    assert.notEqual(match.referee_tournament_team_id, match.home_tournament_team_id, `Referee for '${match.id}' cannot be the home team.`);
    assert.notEqual(match.referee_tournament_team_id, match.away_tournament_team_id, `Referee for '${match.id}' cannot be the away team.`);

    const simultaneousMatches = groupMatches.filter((candidate) => candidate.scheduled_at === match.scheduled_at);
    const refereePlaysSimultaneously = simultaneousMatches.some(
      (candidate) => candidate.home_tournament_team_id === match.referee_tournament_team_id || candidate.away_tournament_team_id === match.referee_tournament_team_id
    );

    assert.equal(refereePlaysSimultaneously, false, `Referee for '${match.id}' cannot be playing at the same time.`);
  });

  for (const match of groupMatches) {
    assertOk(
      await service.enterOrCorrectMatchResult({
        sets: makeGroupSets(strongerTeamIsHome(match)),
        status: "completed",
        tournamentId: created.tournament.id,
        tournamentMatchId: match.id
      })
    );
  }

  const standings = assertOk(await service.recalculateStandings(created.tournament.id)) as GroupStandingsSnapshot[];
  const standingsA = standings.find((group) => group.groupCode === "A");
  const standingsB = standings.find((group) => group.groupCode === "B");

  assert.ok(standingsA);
  assert.ok(standingsB);
  assert.deepEqual(
    standingsA?.entries.map((entry) => entry.position),
    [1, 2, 3, 4, 5]
  );
  assert.deepEqual(
    standingsB?.entries.map((entry) => entry.position),
    [1, 2, 3, 4, 5]
  );
  assert.deepEqual(
    standingsA?.entries.map((entry) => entry.teamId),
    ["tt-team-01", "tt-team-02", "tt-team-03", "tt-team-04", "tt-team-05"]
  );
  assert.deepEqual(
    standingsB?.entries.map((entry) => entry.teamId),
    ["tt-team-06", "tt-team-07", "tt-team-08", "tt-team-09", "tt-team-10"]
  );

  assertOk(await service.closeGroupStage(created.tournament.id));
  assertOk(await service.generatePlayoffs(created.tournament.id));

  const bundleAfterPlayoffs = await harness.getBundle();
  const playoffMatches = bundleAfterPlayoffs.matches.filter((match) => match.phase !== "group_stage");

  assert.equal(playoffMatches.length, 7);

  const semifinal1 = playoffMatches.find((match) => match.phase === "semifinal" && match.slot_number === 1);
  const semifinal2 = playoffMatches.find((match) => match.phase === "semifinal" && match.slot_number === 2);
  const final = playoffMatches.find((match) => match.phase === "final");
  const bronze = playoffMatches.find((match) => match.phase === "bronze");
  const fifth = playoffMatches.find((match) => match.phase === "placement" && match.placement_rank === 5);
  const seventh = playoffMatches.find((match) => match.phase === "placement" && match.placement_rank === 7);
  const ninth = playoffMatches.find((match) => match.phase === "placement" && match.placement_rank === 9);

  assert.ok(semifinal1);
  assert.ok(semifinal2);
  assert.ok(final);
  assert.ok(bronze);
  assert.ok(fifth);
  assert.ok(seventh);
  assert.ok(ninth);

  assert.equal(semifinal1?.home_tournament_team_id, "tt-team-01");
  assert.equal(semifinal1?.away_tournament_team_id, "tt-team-07");
  assert.equal(semifinal2?.home_tournament_team_id, "tt-team-06");
  assert.equal(semifinal2?.away_tournament_team_id, "tt-team-02");

  assertOk(
    await service.enterOrCorrectMatchResult({
      sets: makePlayoffSets(true),
      status: "completed",
      tournamentId: created.tournament.id,
      tournamentMatchId: semifinal1!.id
    })
  );

  assertOk(
    await service.enterOrCorrectMatchResult({
      sets: makePlayoffSets(false),
      status: "completed",
      tournamentId: created.tournament.id,
      tournamentMatchId: semifinal2!.id
    })
  );

  const bundleAfterSemifinals = await harness.getBundle();
  const resolvedFinal = bundleAfterSemifinals.matches.find((match) => match.phase === "final");
  const resolvedBronze = bundleAfterSemifinals.matches.find((match) => match.phase === "bronze");

  assert.equal(resolvedFinal?.home_tournament_team_id, "tt-team-01");
  assert.equal(resolvedFinal?.away_tournament_team_id, "tt-team-02");
  assert.equal(resolvedBronze?.home_tournament_team_id, "tt-team-07");
  assert.equal(resolvedBronze?.away_tournament_team_id, "tt-team-06");

  const remainingPlayoffs = bundleAfterSemifinals.matches.filter((match) => match.phase !== "group_stage");

  for (const match of remainingPlayoffs) {
    if (match.status === "completed") {
      continue;
    }

    const homeWins = match.phase === "placement" ? match.placement_rank !== 7 : match.phase !== "bronze";

    assertOk(
      await service.enterOrCorrectMatchResult({
        sets: makePlayoffSets(homeWins),
        status: "completed",
        tournamentId: created.tournament.id,
        tournamentMatchId: match.id
      })
    );
  }

  const finished = assertOk(await service.closeTournament({ tournamentId: created.tournament.id })) as {
    finalStandings: TournamentFinalStandingRecord[];
    tournament: TournamentRecord;
  };

  assert.deepEqual(
    finished.finalStandings.map((standing) => standing.final_position),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  );
  assert.deepEqual(
    finished.finalStandings.map((standing) => standing.tournament_team_id),
    ["tt-team-01", "tt-team-02", "tt-team-06", "tt-team-07", "tt-team-03", "tt-team-08", "tt-team-09", "tt-team-04", "tt-team-05", "tt-team-10"]
  );
  assert.equal(finished.tournament.status, "completed");

  const auditLogs = harness.getAuditLogs();
  assert.equal(auditLogs.length, 27);
});

test("integration: group schedule cannot be overwritten without explicit regeneration and never after results exist", async () => {
  const harness = await createInMemoryTournamentHarness();
  const { service } = harness;

  const created = assertOk(
    await service.createTournament({
      breakDurationMinutes: 5,
      courtCount: 2,
      formatKey: "ten_teams_two_groups_semifinals_placement",
      location: "Kežmarok",
      matchDurationMinutes: 20,
      name: "Schedule Guard Cup",
      slug: "schedule-guard-cup",
      startsAt: "2026-08-05T08:00:00.000Z"
    })
  ) as { groups: TournamentGroupRecord[]; tournament: TournamentRecord };

  assertOk(
    await service.addTeamsToTournament({
      teamIds: harness.baseTeams.map((team, index) => ({
        displayName: team.name,
        groupCode: index < 5 ? "A" : "B",
        seedNumber: (index % 5) + 1,
        sortOrder: index + 1,
        teamId: team.id
      })),
      tournamentId: created.tournament.id
    })
  );

  const preview = assertOk(
    await service.generateGroupStageSchedule({
      breakDurationMinutes: created.tournament.break_duration_minutes,
      courtCount: created.tournament.court_count,
      matchDurationMinutes: created.tournament.match_duration_minutes,
      tournamentId: created.tournament.id,
      tournamentStart: created.tournament.starts_at ?? "2026-08-05T08:00:00.000Z"
    })
  ) as { matches: GeneratedTournamentMatchDraft[]; warnings: { code: string; message: string }[] };

  assertOk(
    await service.saveGeneratedMatches({
      matches: preview.matches,
      tournamentId: created.tournament.id
    })
  );

  const secondSave = await service.saveGeneratedMatches({
    matches: preview.matches,
    tournamentId: created.tournament.id
  });

  assert.equal(secondSave.ok, false);
  if (!secondSave.ok) {
    assert.equal(secondSave.error.code, "CONFLICT");
  }

  assertOk(
    await service.saveGeneratedMatches({
      allowRegenerate: true,
      matches: preview.matches,
      tournamentId: created.tournament.id
    })
  );

  const bundle = await harness.getBundle();
  const firstGroupMatch = bundle.matches.find((match) => match.phase === "group_stage");

  assert.ok(firstGroupMatch);

  assertOk(
    await service.enterOrCorrectMatchResult({
      sets: makeGroupSets(strongerTeamIsHome(firstGroupMatch!)),
      status: "completed",
      tournamentId: created.tournament.id,
      tournamentMatchId: firstGroupMatch!.id
    })
  );

  const lockedSave = await service.saveGeneratedMatches({
    allowRegenerate: true,
    matches: preview.matches,
    tournamentId: created.tournament.id
  });

  assert.equal(lockedSave.ok, false);
  if (!lockedSave.ok) {
    assert.equal(lockedSave.error.code, "CONFLICT");
  }
});

test("integration: playoffs cannot be generated twice", async () => {
  const harness = await createInMemoryTournamentHarness();
  const { service } = harness;

  const created = assertOk(
    await service.createTournament({
      breakDurationMinutes: 5,
      courtCount: 2,
      formatKey: "ten_teams_two_groups_semifinals_placement",
      location: "Levoča",
      matchDurationMinutes: 20,
      name: "Playoff Guard Cup",
      slug: "playoff-guard-cup",
      startsAt: "2026-08-06T08:00:00.000Z"
    })
  ) as { groups: TournamentGroupRecord[]; tournament: TournamentRecord };

  assertOk(
    await service.addTeamsToTournament({
      teamIds: harness.baseTeams.map((team, index) => ({
        displayName: team.name,
        groupCode: index < 5 ? "A" : "B",
        seedNumber: (index % 5) + 1,
        sortOrder: index + 1,
        teamId: team.id
      })),
      tournamentId: created.tournament.id
    })
  );

  const preview = assertOk(
    await service.generateGroupStageSchedule({
      breakDurationMinutes: created.tournament.break_duration_minutes,
      courtCount: created.tournament.court_count,
      matchDurationMinutes: created.tournament.match_duration_minutes,
      tournamentId: created.tournament.id,
      tournamentStart: created.tournament.starts_at ?? "2026-08-06T08:00:00.000Z"
    })
  ) as { matches: GeneratedTournamentMatchDraft[]; warnings: { code: string; message: string }[] };

  assertOk(
    await service.saveGeneratedMatches({
      matches: preview.matches,
      tournamentId: created.tournament.id
    })
  );

  const bundle = await harness.getBundle();
  const groupMatches = bundle.matches.filter((match) => match.phase === "group_stage");

  for (const match of groupMatches) {
    assertOk(
      await service.enterOrCorrectMatchResult({
        sets: makeGroupSets(strongerTeamIsHome(match)),
        status: "completed",
        tournamentId: created.tournament.id,
        tournamentMatchId: match.id
      })
    );
  }

  assertOk(await service.closeGroupStage(created.tournament.id));
  assertOk(await service.generatePlayoffs(created.tournament.id));

  const repeatedPlayoffGeneration = await service.generatePlayoffs(created.tournament.id);

  assert.equal(repeatedPlayoffGeneration.ok, false);
  if (!repeatedPlayoffGeneration.ok) {
    assert.equal(repeatedPlayoffGeneration.error.code, "CONFLICT");
  }
});

test("integration: generated playoffs can be deleted before any playoff result exists", async () => {
  const harness = await createInMemoryTournamentHarness();
  const { service } = harness;

  const created = assertOk(
    await service.createTournament({
      breakDurationMinutes: 5,
      courtCount: 2,
      formatKey: "ten_teams_two_groups_semifinals_placement",
      location: "Spišská Nová Ves",
      matchDurationMinutes: 20,
      name: "Delete Playoff Cup",
      slug: "delete-playoff-cup",
      startsAt: "2026-08-07T08:00:00.000Z"
    })
  ) as { groups: TournamentGroupRecord[]; tournament: TournamentRecord };

  assertOk(
    await service.addTeamsToTournament({
      teamIds: harness.baseTeams.map((team, index) => ({
        displayName: team.name,
        groupCode: index < 5 ? "A" : "B",
        seedNumber: (index % 5) + 1,
        sortOrder: index + 1,
        teamId: team.id
      })),
      tournamentId: created.tournament.id
    })
  );

  const preview = assertOk(
    await service.generateGroupStageSchedule({
      breakDurationMinutes: created.tournament.break_duration_minutes,
      courtCount: created.tournament.court_count,
      matchDurationMinutes: created.tournament.match_duration_minutes,
      tournamentId: created.tournament.id,
      tournamentStart: created.tournament.starts_at ?? "2026-08-07T08:00:00.000Z"
    })
  ) as { matches: GeneratedTournamentMatchDraft[]; warnings: { code: string; message: string }[] };

  assertOk(
    await service.saveGeneratedMatches({
      matches: preview.matches,
      tournamentId: created.tournament.id
    })
  );

  const bundle = await harness.getBundle();
  const groupMatches = bundle.matches.filter((match) => match.phase === "group_stage");

  for (const match of groupMatches) {
    assertOk(
      await service.enterOrCorrectMatchResult({
        sets: makeGroupSets(strongerTeamIsHome(match)),
        status: "completed",
        tournamentId: created.tournament.id,
        tournamentMatchId: match.id
      })
    );
  }

  assertOk(await service.closeGroupStage(created.tournament.id));
  assertOk(await service.generatePlayoffs(created.tournament.id));

  const beforeDelete = await harness.getBundle();
  assert.equal(beforeDelete.matches.filter((match) => match.phase !== "group_stage").length, 7);

  assertOk(await service.deletePlayoffs(created.tournament.id));

  const afterDelete = await harness.getBundle();
  assert.equal(afterDelete.matches.filter((match) => match.phase !== "group_stage").length, 0);
  assert.equal(afterDelete.matches.filter((match) => match.phase === "group_stage").length, 20);
});

test("integration: generated playoffs cannot be deleted after playoff result entry starts", async () => {
  const harness = await createInMemoryTournamentHarness();
  const { service } = harness;

  const created = assertOk(
    await service.createTournament({
      breakDurationMinutes: 5,
      courtCount: 2,
      formatKey: "ten_teams_two_groups_semifinals_placement",
      location: "Svit",
      matchDurationMinutes: 20,
      name: "Locked Playoff Cup",
      slug: "locked-playoff-cup",
      startsAt: "2026-08-08T08:00:00.000Z"
    })
  ) as { groups: TournamentGroupRecord[]; tournament: TournamentRecord };

  assertOk(
    await service.addTeamsToTournament({
      teamIds: harness.baseTeams.map((team, index) => ({
        displayName: team.name,
        groupCode: index < 5 ? "A" : "B",
        seedNumber: (index % 5) + 1,
        sortOrder: index + 1,
        teamId: team.id
      })),
      tournamentId: created.tournament.id
    })
  );

  const preview = assertOk(
    await service.generateGroupStageSchedule({
      breakDurationMinutes: created.tournament.break_duration_minutes,
      courtCount: created.tournament.court_count,
      matchDurationMinutes: created.tournament.match_duration_minutes,
      tournamentId: created.tournament.id,
      tournamentStart: created.tournament.starts_at ?? "2026-08-08T08:00:00.000Z"
    })
  ) as { matches: GeneratedTournamentMatchDraft[]; warnings: { code: string; message: string }[] };

  assertOk(
    await service.saveGeneratedMatches({
      matches: preview.matches,
      tournamentId: created.tournament.id
    })
  );

  const bundle = await harness.getBundle();
  const groupMatches = bundle.matches.filter((match) => match.phase === "group_stage");

  for (const match of groupMatches) {
    assertOk(
      await service.enterOrCorrectMatchResult({
        sets: makeGroupSets(strongerTeamIsHome(match)),
        status: "completed",
        tournamentId: created.tournament.id,
        tournamentMatchId: match.id
      })
    );
  }

  assertOk(await service.closeGroupStage(created.tournament.id));
  assertOk(await service.generatePlayoffs(created.tournament.id));

  const playoffBundle = await harness.getBundle();
  const semifinal = playoffBundle.matches.find((match) => match.phase === "semifinal");

  assert.ok(semifinal);

  assertOk(
    await service.enterOrCorrectMatchResult({
      sets: makePlayoffSets(true),
      status: "completed",
      tournamentId: created.tournament.id,
      tournamentMatchId: semifinal!.id
    })
  );

  const deleteResult = await service.deletePlayoffs(created.tournament.id);

  assert.equal(deleteResult.ok, false);
  if (!deleteResult.ok) {
    assert.equal(deleteResult.error.code, "CONFLICT");
  }
});
