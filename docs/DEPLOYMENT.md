# Deployment

Two workflows in `.github/workflows/`:

* **`ci.yml`** runs on every pull request (and is reused by the deploy workflow). It starts a throwaway Postgres with
  pgvector, applies **all migrations from an empty database**, checks that `schema.prisma` matches the migrations,
  runs the integration tests and does a production build. No real database or secret is involved.
* **`deploy.yml`** runs on push to `main`: CI first, then (behind the `production` environment) build, migrate, deploy, smoke test.
  The build happens **before** the migration, so a failed build never leaves the database ahead of the live code.

## GitHub secrets (Settings > Secrets and variables > Actions)

| Secret | Purpose |
|---|---|
| `VERCEL_TOKEN` | Vercel access token |
| `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | From `.vercel/project.json` after running `vercel link` once locally |
| `PRODUCTION_DATABASE_URL` | **Direct** (non-pooled) Postgres connection string, used only for `prisma migrate deploy` |

Create a GitHub **environment** named `production` and add required reviewers for a manual approval before each deploy.

## Vercel project environment variables (runtime and build)

`DATABASE_URL` (may be the pooled string), `AUTH_SECRET`, `APP_BASE_URL` (https), `RESEND_API_KEY`, `EMAIL_FROM`,
`CRON_SECRET`, `TURNSTILE_SECRET_KEY`, and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (inlined at **build** time; `vercel pull` brings it into the build).
See `.env.example`. The production database must have the `vector` extension available (`CREATE EXTENSION` runs in the first migration).

## Rules for migrations

The old version keeps serving until the new one is swapped in, so every migration must work with the **previous** code:
add columns/tables first, deploy, remove old ones in a later release. Never edit a migration that has already shipped.
Prisma cannot see the HNSW vector index (raw SQL); `npm run db:drift` allows exactly that one difference.

## Rollback

Vercel can instantly roll back to the previous deployment. Migrations are not rolled back automatically, which is why they must be backward compatible.

## First admin

`npm run user:create -- you@yourdomain.com ADMIN` against the production database (see `.env.example`), then log in at `/staff/login`.
