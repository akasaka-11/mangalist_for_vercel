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

## Accounts (important)

There is no backend yet. Accounts are stored **only in the browser's localStorage**
(`lib/auth.ts`): passwords are never stored in plain text, only a salted PBKDF2-SHA256 hash,
and sign-in requires a registered account with the correct password. This is still
**not real security** — anyone with access to the browser can read or change local data, and
accounts don't sync between devices. Move to a real auth service (e.g. Supabase Auth) before
storing anything that matters.

Each account has its own library (`lib/library.ts`). A library saved by the old version of the
app is handed to the first account that signs in on that browser.

## Environment variables

Never expose `process.env` through Vite's `define`: anything there ends up in the public JS
bundle. Only `import.meta.env.VITE_*` values are meant to be public.
