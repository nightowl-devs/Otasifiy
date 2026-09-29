# Otasifiy

A self-hosted Expo OTA update server. Otasifiy implements the Expo Updates
protocol, so you can publish JavaScript bundle updates to your Expo app and
serve them from your own infrastructure instead of a hosted update service.

## Features

- Expo Updates protocol: manifest delivery, asset hosting, and the
  `noUpdateAvailable` / rollout directives
- Gradual rollouts: ship an update to a percentage of devices, with stable
  per-device bucketing
- Branch-based environments (e.g. `production` mapped to a git branch)
- Download analytics: totals over time, platform split, and runtime version
  distribution
- GitHub OAuth login
- Project API keys for publishing updates from CI
- Team members and invites, with owner / admin / member roles
- S3-compatible asset storage with streaming gzip/deflate delivery

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
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
TOKEN_ENCRYPTION_KEY=
NEXT_PUBLIC_URL=
NEXT_PUBLIC_GITHUB_APP_NAME=
```

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `S3_*` | Credentials and location for asset storage |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth app credentials |
| `TOKEN_ENCRYPTION_KEY` | Secret used to encrypt stored GitHub tokens at rest. Falls back to `GITHUB_CLIENT_SECRET` if unset |
| `NEXT_PUBLIC_URL` | Public base URL of this server |
| `NEXT_PUBLIC_GITHUB_APP_NAME` | Display name shown on the login screen |

Create the database tables from the Prisma schema:

```bash
bunx prisma db push
```

Start the development server:

```bash
bun dev
```

## Usage

Sign in with GitHub, then create a project. The project's API key is shown once
at creation, so copy it before leaving the dialog. You can regenerate it later
from the project settings page.

Point your Expo app at your project by setting the updates URL:

```
https://your-server.example.com/api/manifest?slug=your-project-slug
```

### Publishing an update

Updates are published with `POST /api/update` as `multipart/form-data`,
authenticated with your project API key:

```bash
curl -X POST https://your-server.example.com/api/update \
  -H "Authorization: Bearer $API_KEY" \
  -F projectId=<project-id> \
  -F version=1.0.1 \
  -F environment=production \
  -F expoConfig=@expo-config.json \
  -F zip=@dist.zip
```

| Field | Required | Description |
| --- | --- | --- |
| `projectId` | yes | The project to publish to |
| `version` | yes | Semver version of the update; must be greater than the latest enabled version in the environment |
| `environment` or `branch` | yes | Target environment name, or a branch name that maps to an environment |
| `expoConfig` | yes | The app's Expo config, used to read `runtimeVersion` |
| `zip` | yes | Zip of the `expo export` output, containing `metadata.json` at its root |
| `metadata` | no | Arbitrary JSON stored with the update |
| `commit` | no | Commit the update was built from |
| `disabled` | no | Publish in a disabled state |

### Publishing from CI

A GitHub Actions workflow is included as
`.github/workflows/publish-update.yml.example`. To use it in your app
repository, copy both that workflow and `scripts/publish-update.ts` from this
repository, then set the `UPDATE_SERVER_URL`, `PROJECT_ID`, and `API_KEY`
secrets.

## Project status

Otasifiy is a work in progress and is not yet intended for production traffic.
Known gaps include the absence of committed Prisma migrations and a lack of
rate limiting on the public manifest endpoint.

## License

This project is not yet licensed. Add a license before distributing it.
