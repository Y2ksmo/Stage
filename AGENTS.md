<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

PostgreSQL 16 with the `pgvector` extension is installed by the environment install script. On every boot the start script starts that cluster, creates `pfpa_dev` and `pfpa_test` if they are missing, applies Prisma migrations to both, writes a gitignored `.env` when one is absent, and runs `npm run dev` on port 3000.

- The app database is `postgresql://postgres:postgres@127.0.0.1:5432/pfpa_dev?schema=public`. Next.js and the Prisma CLI read it from `.env`.
- Integration tests write fixtures. Run them against the throwaway database, the same one CI uses: `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/pfpa_test?schema=public AUTH_SECRET=ci-dummy-secret-key-for-testing-only-32chars NODE_ENV=test npm test`
- `npm run db:drift` needs `DATABASE_URL` exported to a database that already has migrations applied. `npm run typecheck` and `NODE_ENV=production npm run build` are the other checks from `.github/workflows/ci.yml`. There is no separate lint script.
- With `RESEND_API_KEY` unset, staff login codes are printed to the dev server log at `/tmp/pfpa-dev.log`. Turnstile is skipped in development when `TURNSTILE_SECRET_KEY` is unset. Local development does not need hosted secrets.
- Create a staff user with `npm run user:create -- you@example.com EDITOR`.

