# Authentication Flow

## Supported login methods

- Email + password
- Google OAuth via Supabase Authentication

Magic link is not part of the primary flow. If legacy endpoints still exist, treat them as backward compatibility only.

## Email/password flow

1. User registers with `email`, `password`, and display name.
2. Supabase sends a verification email.
3. Until `email_confirmed_at` is present, protected content is denied.
4. The app shows `/auth/verify-email` with resend support.
5. After a successful login, the server resolves the application profile and role.

## Google OAuth flow

1. User starts Google login from `/login` or `/register`.
2. Supabase redirects to Google.
3. Google returns to `/auth/callback`.
4. The callback exchanges the code for a session.
5. The server resolves the application profile and role.
6. The user is redirected to:
   - the intended route if access is valid
   - `/auth/verify-email` if the email is not verified
   - `/auth/access-denied` if no application profile exists
   - `/auth/account-disabled` if the profile is inactive

## Supabase Auth vs. application profiles

Supabase Auth identifies the authenticated person.

The application `public.profiles` table decides:

- which application profile belongs to the authenticated person
- whether the profile is active
- whether the role is `admin` or `user`

The preferred link is `profiles.auth_user_id = auth.users.id`.

Fallback matching is based on a verified normalized email:

- trim whitespace
- lowercase
- compare through `profiles.email_normalized`

If a verified email matches an unlinked profile safely, the server links `auth_user_id`.

## Required callback URLs

Configure these in Supabase Auth:

- Site URL: your production site URL
- Redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `https://YOUR-PRODUCTION-DOMAIN/auth/callback`
  - optionally `http://localhost:3000/auth/confirm`
  - optionally `https://YOUR-PRODUCTION-DOMAIN/auth/confirm`

Configure the same callback in Google OAuth:

- `https://PROJECT-REF.supabase.co/auth/v1/callback`

## Required environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL` or `SITE_URL`

## Local development

1. Set the environment variables.
2. Apply migrations including `0014_auth_profile_roles.sql`.
3. In Supabase Auth, enable Email and Google providers.
4. Set local callback URLs for `/auth/callback`.

## Production checklist

1. Apply all latest migrations.
2. Confirm `SUPABASE_SERVICE_ROLE_KEY` is set only on the server.
3. Confirm Email provider is enabled.
4. Confirm Google provider is enabled.
5. Confirm callback URLs in both Supabase and Google.
6. Confirm verification emails use the production callback URL.
7. Confirm at least one active admin profile exists in `public.profiles`.
