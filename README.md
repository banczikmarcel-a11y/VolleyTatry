# Volejbal Tatry

Mobile-first volleyball team hub built with Next.js App Router, TypeScript, Tailwind CSS, and Supabase-ready authentication.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth
- ESLint

## Project Structure

```txt
app/          App Router pages, layout, and global styles
components/   Shared UI primitives, feature components, and app shell
lib/          Navigation, utilities, and sample data
supabase/     SQL migrations for the planned database schema
types/        Shared TypeScript domain types
docs/         Project and schema notes
```

## Pages

- `/` homepage
- `/login` login
- `/register` register
- `/dashboard` team dashboard
- `/matches` match schedule
- `/stats` player stats
- `/profile` player profile

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Add Supabase values when you are ready to test authentication:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=
```

Use the project URL and anon public key from Supabase Dashboard > Project Settings > API. Do not put the service role key in this Next.js app.
Set `NEXT_PUBLIC_SITE_URL` to your deployed app URL so email confirmation and magic link redirects point to production instead of localhost.

Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Quality Checks

Run TypeScript checks:

```bash
npm run type-check
```

Run linting:

```bash
npm run lint
```

Build for production:

```bash
npm run build
```

## Next Steps

- Replace sample data in `lib/sample-data.ts` with server-side queries.
- Add Row Level Security before exposing real team data.
