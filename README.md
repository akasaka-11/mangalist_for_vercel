# MyMangaList

Manga / manhwa tracker: search titles via the public [AniList](https://anilist.co) GraphQL API,
add them to your library and track chapters read.

Stack: React 19 + TypeScript + Vite, Tailwind (CDN), deployed on Vercel.

## Run locally

```bash
npm install
npm run dev      # dev server
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build
```

## Accounts — Supabase Auth

Sign-up, sign-in (email + password), email confirmation, password reset and sign-out go through
[Supabase Auth](https://supabase.com/docs/guides/auth) (`lib/auth.ts`, `lib/supabase.ts`).
Without the environment variables below the site still works, but sign-in shows
"not configured".

Setup:

1. Create a Supabase project. In **Project Settings → API** copy the Project URL and the
   anon / publishable key.
2. Copy `.env.example` to `.env.local` and fill in both values (`.env.local` is git-ignored).
3. In **Authentication → URL Configuration** set *Site URL* to the production URL and add
   `http://localhost:5173` and `http://localhost:4173` to *Redirect URLs* — confirmation and
   password-reset links lead back there.
4. On Vercel add the same two variables in **Project → Settings → Environment Variables** and
   redeploy (Vite inlines them at build time).

The anon key is public by design; never put the `service_role` key in the frontend.
Supabase's built-in email sender is heavily rate-limited — configure custom SMTP before launch.

The manga library itself is still kept in the browser's localStorage, separately for each
account (`lib/library.ts`); it does not sync between devices yet. A library saved by the old
version of the app is handed to the first account that signs in on that browser.

## Environment variables

Never expose `process.env` through Vite's `define`: anything there ends up in the public JS
bundle. Only `import.meta.env.VITE_*` values are meant to be public.
