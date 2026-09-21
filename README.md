# otasifiy

A self-hosted Expo OTA update server (my own little EAS because paying per update felt wrong), built with Next.js.

Basically: your Expo app asks "anything new?" → this thing answers with a manifest or "nah you're good". Plus a dashboard to see updates, environments, download stats, and who gets to touch the project.

Features:

- Publishing OTA updates (expo manifest protocol and all that)
- Gradual rollouts (deploy % per device, hopefully fair??)
- Download analytics (real ones now, they used to be fake xd)
- Environments tied to git branches
- Team invites with roles (owner / admin / member)
- API keys for CI publishing
- GitHub login (the only login, sorry)

### Honest prod status:

Not yet. The happy path works (publish → app updates, stats show up), but I wouldn't trust it with real users today. Biggest gaps: no rate limiting on the public manifest endpoint, no committed prisma migrations, and the publish script the CI example points at doesn't exist yet.

### If you want to run it or shoot me a PR to fix the above:

- Download repo
- Install deps (bun is required here, not just recommended — the server uses `Bun.password` and `Bun.s3` so plain node won't cut it):

```bash
bun i
```

- Copy the env vars (all of these are actually needed, no optional ones yet):

```bash
DATABASE_URL=           # postgres connection string
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
