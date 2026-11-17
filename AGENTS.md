# Glashus — notes for humans and coding agents

Exposure-aware cloud drive on Google Cloud. Read before writing code:

- Product, architecture, security, data model, costs: `docs/glashus-project-docs.md`
- Who owns which folder, week plan, rules: `docs/team-and-workflow.md`
- Look and components: `design/README.md`, tokens in `design/tokens.css`, screens in `design/boards/`

## Stack

- pnpm workspaces + Turborepo, TypeScript everywhere
- `apps/web`: Next.js App Router, Tailwind v4, shadcn/ui from `packages/ui`
- `services/api`: Hono + zod-openapi on Cloud Run
- `services/scanner`: ClamAV + Sensitive Data Protection worker on Cloud Run
- `services/preview`: LibreOffice Office-to-PDF on Cloud Run
- `services/jobs`: scheduled jobs (expiry, trash purge, chunk GC)
- `packages/schema`: Zod schemas shared by web and API
- `packages/sdk`: typed API client generated from the API's OpenAPI file
- `packages/crypto`: envelope encryption with Cloud KMS, chunking, hashing
- `infra`: Terraform (platform owner only)

## Hard rules

1. The browser never names a bucket path. It asks the API, which checks ownership and returns a ~60 s signed URL.
2. Never store raw sensitive values. Findings are stored masked.
3. No AI call without folder consent; every AI read writes a row to `aiLog`.
4. Use components from `packages/ui`; do not restyle shadcn defaults per screen.
5. Do not edit `infra/`, IAM or prod. Open an issue labelled `infra`.
