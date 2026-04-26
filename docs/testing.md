# Testing Notes

## Create Match

Test case:

1. Sign in as a user with an active `team_memberships` row for team `tatry` and role `owner` or `coach`.
2. Open `/admin/matches/new`.
3. Open `/admin/matches/new`.
4. Confirm the date picker defaults to the nearest Monday.
5. Pick a date and submit `Vytvor`.

Expected result:

- A row is inserted into `public.matches`.
- The row is created as `Tatry vs Ostatni` with status `scheduled`, default location `Miesto bude doplnene`, and empty set values.
- The app redirects to `/matches?message=Zapas bol vytvoreny.`.
- The matches list refreshes and shows the newly created match.
- If a match already exists on the selected calendar day, the form redirects back with `Zapas na dany den uz existuje.`.
- If Supabase rejects the insert, the form redirects back to `/admin/matches/new` with a visible error message.
- The server logs the failed create action with the `[matches:admin]` prefix and the Supabase error payload.

Observed implementation note:

- The quick create action now generates the `matches.id` in the server action and performs a plain `insert`, instead of depending on `insert().select().single()`.
- `created_by` is currently written as `null` to avoid blocking match creation when an older auth user does not yet have a corresponding `profiles` row.

Observed result in this workspace:

- Static verification passes with `npm run type-check`, `npm run lint`, and `npm run build`.
- A live insert still requires a signed-in admin user in Supabase and the `0003_match_admin_fields.sql` plus `0004_rls_policies.sql` migrations applied in the remote project.

## Player Role Management

Test case:

1. Apply `supabase/migrations/0005_player_admin_policies.sql`.
2. Sign in as a user with an active `owner` or `coach` membership.
3. Open `/admin/players`.
4. Pick a profile, choose a team, role, and status.
5. Submit `Ulozit rolu`.

Expected result:

- A `team_memberships` row is inserted or updated for the selected profile and team.
- The page redirects back to `/admin/players?message=Rola bola ulozena.`.
- Non-admin users are redirected away by `requireAdminUser`.

## Create Player

Test case:

1. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`.
2. Sign in as a user with an active `owner` or `coach` membership.
3. Open `/admin/players`.
4. Fill in the `Novy hrac` form with name, email, team, role, and status.
5. Submit `Vytvorit`.

Expected result:

- If the email is new, a Supabase Auth user is created with confirmed email.
- A `profiles` row exists for that user.
- A `team_memberships` row is inserted or updated for the selected team and role.
- The page redirects back with a success message and the player appears in the table.
- If the service role key is missing, the page redirects back with a visible configuration error.
