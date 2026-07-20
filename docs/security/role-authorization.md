# Role Authorization

## Roles

Application roles are stored in `public.profiles.role`.

Current values:

- `admin`
- `user`

The role is application-level and separate from legacy `team_memberships.role`.

## Session resolution

Protected server code resolves one application session with:

- `authUserId`
- `profileId`
- `email`
- `displayName`
- `role`
- `isActive`

The resolver checks:

1. Supabase authenticated user exists
2. authenticated email exists
3. authenticated email is verified
4. profile matches by `auth_user_id`
5. fallback profile matches by normalized verified email
6. profile is active

## Route protection

Reusable server-side helpers:

- `requireAuthenticatedUser()`
- `requireApplicationUser()`
- `requireRole(...)`
- `requireAdmin()`

These helpers redirect to:

- `/login` for anonymous access
- `/auth/verify-email` for unverified accounts
- `/auth/access-denied` for authenticated users without a matching profile
- `/auth/account-disabled` for inactive profiles

## RLS rules

The `0014_auth_profile_roles.sql` migration adds:

- unique `profiles.auth_user_id`
- unique `profiles.email_normalized`
- `profiles.is_active`
- controlled `profiles.role`
- helper functions:
  - `current_profile_id()`
  - `current_active_profile_id()`
  - `is_application_admin()`

Key RLS behavior:

- only admins may update profile role and active state
- users cannot self-promote to `admin`
- users cannot reactivate a disabled account
- normal users cannot update other profiles
- public users cannot read internal profile role data

## Server-side mutation rules

Protected mutations must never trust browser-supplied roles.

Each protected mutation must re-resolve or validate the application session on the server before writing data.

This includes:

- tournament administration
- match result entry
- player administration
- profile-sensitive updates
