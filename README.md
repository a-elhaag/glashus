# Glashus

> Drive shows you your files. Glashus shows who can see them.

Glashus is an exposure-aware personal cloud drive built on Google Cloud and Firebase. Uploads land in a private quarantine bucket, pass through malware and PII/secret scanning before entering encrypted storage, and surface sharing links, exposure scores, and consented AI access in one place.

## Docs

- Product, architecture, security, data model, and costs: [`docs/glashus-project-docs.md`](docs/glashus-project-docs.md)
- Team ownership, week plan, and repo rules: [`docs/team-and-workflow.md`](docs/team-and-workflow.md)
- Design tokens and UI boards: [`design/README.md`](design/README.md)
- Infrastructure & Terraform import guide: [`infra/README.md`](infra/README.md)

## Monorepo Structure

- `apps/web` — Next.js App Router frontend, Tailwind v4, Firebase Web client (`apps/web/lib/firebase.ts`), typed API client (`apps/web/lib/api.ts`)
- `packages/ui` — Shared shadcn/ui & Glashus components
- `packages/schema` — Shared Zod v4 + OpenAPI schemas and platform quota constants (`@workspace/schema`)
- `packages/sdk` — Typed `openapi-fetch` client generated from `services/api/openapi.json` (`@workspace/sdk`)
- `packages/crypto` — KMS envelope encryption and chunking helpers (planned)
- `services/api` — Hono + `@hono/zod-openapi` API (`@workspace/api`) with Firebase JWT middleware and ownership helpers
- `services/scanner`, `services/preview`, `services/jobs` — Background Cloud Run workers & scheduled jobs (planned)
- `infra/` — Terraform configuration for GCP APIs, storage, Firestore, KMS, IAM, and Artifact Registry
- `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `.firebaserc` — Firebase Auth & Firestore security config

## Dev Environment (`glashus-dev`)

Provisioned in `us-central1`:

- **Project:** `glashus-dev` (Billing enabled; 15 GCP/Firebase APIs active)
- **Storage:** Private buckets `glashus-dev-quarantine` and `glashus-dev-clean` (UBLA, Public Access Prevention enforced, CSEK restricted, 7-day soft delete, lifecycle cleanup rules, local dev CORS)
- **Firestore:** `(default)` Native Standard database in `us-central1` with owner-only read rules and client writes denied (`firestore.rules`)
- **Cloud KMS:** Key ring `glashus-dev` and symmetric software key `master-kek`
- **IAM:** Least-privilege service accounts `glashus-api` and `glashus-scanner` (no human IAM bindings on `master-kek`)
- **Artifact Registry:** Docker repo `us-central1-docker.pkg.dev/glashus-dev/glashus`
- **Firebase Auth:** Web app `glashus-web` with Email/Password and Google Sign-In enabled

## Local Development

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Configure environment files:

   ```bash
   cp apps/web/.env.example apps/web/.env.local
   cp services/api/.env.example services/api/.env.local
   ```

   Fill in your Firebase Web SDK values in `apps/web/.env.local` (for `glashus-dev`, run `npx -y firebase-tools@latest apps:sdkconfig web <APP_ID> --project glashus-dev`).

3. Authenticate Application Default Credentials for local `services/api` calls against Firestore:

   ```bash
   gcloud auth application-default login
   ```

4. Common commands:

   ```bash
   pnpm sdk:generate   # Build @workspace/schema, export services/api/openapi.json, regenerate @workspace/sdk
   pnpm dev            # Run Next.js web app and API in dev mode
   pnpm lint           # Lint all workspace packages
   pnpm build          # Build packages, API, and Next.js app
   pnpm typecheck      # Run TypeScript checks across workspaces
   ```

5. Adding UI components to `packages/ui`:

   ```bash
   pnpm dlx shadcn@latest add <component> -c apps/web
   ```
