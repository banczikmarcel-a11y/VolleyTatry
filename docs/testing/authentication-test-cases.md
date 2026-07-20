# Authentication Test Cases

## Authentication

- Email/password login succeeds with verified email and active profile.
- Email/password login fails with invalid password.
- Email/password login redirects to verification state when email is unverified.
- Verified email/password login resolves an application session and enters protected content.
- Google OAuth callback succeeds and returns to the requested route.
- Google OAuth callback failure returns the user to login with an error.

## Profile resolution

- Profile resolves by `auth_user_id`.
- Verified email fallback resolves when `auth_user_id` is still null.
- Safe linking writes `auth_user_id` to the matched profile.
- Verified authenticated user without profile reaches access denied.
- Inactive profile reaches account disabled.
- Duplicate normalized emails are blocked by the database constraint.

## Authorization

- Anonymous visitor can access public tournament pages.
- Anonymous visitor cannot access `/dashboard`.
- Standard user cannot access `/admin/*`.
- Administrator can access `/admin/*`.
- Standard user cannot execute admin server actions.
- Browser-supplied role is ignored.
- Disabled user cannot access protected content.

## RLS

- User cannot change their own role through direct profile update.
- User cannot reactivate their own disabled account through direct profile update.
- User cannot edit another profile.
- Administrator can perform permitted profile and membership management.

## Manual Supabase + Google checklist

- Email provider enabled in Supabase Auth.
- Google provider enabled in Supabase Auth.
- Google client configured with Supabase callback URL.
- Site URL and redirect URLs include `/auth/callback`.
- `SUPABASE_SERVICE_ROLE_KEY` is available on the server only.
