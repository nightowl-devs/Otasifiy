# Otasifiy

A self-hosted Expo OTA update server. Otasifiy implements the Expo Updates
protocol, so you can publish JavaScript bundle updates to your Expo app and
serve them from your own infrastructure instead of paying expo ^-^

## Features

- Full expo update protocol implementation.
- Gradual rollouts: ship an update to a percentage of devices, with
  per-device bucketing
- Branch-based environments (e.g. `production` mapped to a git branch)
- Download analytics: totals over time, platform split, and runtime version
  distribution
- GitHub OAuth login
- Project API keys for publishing updates from CI
- Team members and invites, with owner / admin / member roles
- S3-compatible asset storage with compression

## Tech stack

- Next.js 16 (App Router) running on the Bun runtime
- Prisma ORM with PostgreSQL
- S3-compatible object storage (accessed via `Bun.s3`)
- Tailwind CSS, shadcn/ui, Recharts
- Biome for linting and formatting
- Zod for request validation

## Requirements

- [Bun](https://bun.sh) (the server uses `Bun.password` and `Bun.s3`, so it
  cannot run on plain Node.js)
- A PostgreSQL database
- An S3-compatible bucket
- A GitHub OAuth app

## Getting started

Install dependencies:

```bash
bun install
```

Create a `.env` file and fill in the values:

```bash
DATABASE_URL=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_BUCKET=
S3_ENDPOINT=
S3_REGION=
GITHUB_CLIENT_ID=       # from your GitHub OAuth app
GITHUB_CLIENT_SECRET=
TOKEN_ENCRYPTION_KEY=   # any long random string (encrypts GitHub tokens in the db)
NEXT_PUBLIC_URL=        # e.g. http://localhost:3000
NEXT_PUBLIC_GITHUB_APP_NAME=
```

- Set up the db:

```bash
bunx prisma db push
```

(`db:seed` is in package.json but the seed file doesn't exist yet lol, skip it)

- Start dev server:

```bash
bun dev
```

Point your Expo app's updates URL at `/api/manifest?slug=your-project-slug` and publish with `POST /api/update` (multipart form + `Authorization: Bearer <API_KEY>`). There's a CI example in `.github/workflows/publish-update.yml.example` but fair warning, the script it calls isn't in the repo yet.

Tech used:

- Next.JS
- Prisma + Postgres
- S3 (via Bun.s3)
- GitHub OAuth
- TailwindCSS
- Biome
- Recharts (for the analytics graphs)
