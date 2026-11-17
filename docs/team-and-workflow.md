# Team, parts and workflow

Anas owns infra and every deploy. Everyone else gets APIs, a dev environment and the shared UI kit.

## Parts (one owner each, full-stack)

| Part | Screens | Backend | Folders |
| --- | --- | --- | --- |
| A: Drive core | Home, Folder (list/grid), Upload, Trash, Settings | Files, folders, move, rename, trash timers, versions, storage quota | `apps/web/app/(app)/drive`, `services/api/src/routes/drive` |
| B: Design system and viewer | `packages/ui`, app shell, sidebar, File viewer, right-click menu, shortcuts, drag and drop, ⌘K, motion | Preview service (Office to PDF), search | `packages/ui`, `apps/web/app/(app)/viewer`, `services/preview` |
| C: Sharing and security | Share sheet, Recipient page, Scan report, Shared by me, scan states | Scanner (ClamAV + DLP), redaction, share links (expiry, PIN, cap) | `apps/web/app/(app)/sharing`, `services/scanner`, `services/api/src/routes/sharing` |
| D: AI and exposure | Sign in, Onboarding, Landing, 404, Terms, Privacy, Ask my files, AI log, Activity, exposure score | Vertex AI, consent per folder, embeddings, audit log, exposure score | `apps/web/app/(marketing)`, `apps/web/app/(app)/ai`, `services/api/src/routes/ai` |
| Platform (Anas) | — | Terraform, CI/CD, deploys, auth middleware, signed URLs, `packages/crypto`, download cap | `infra`, `services/api/src/core`, `packages/crypto` |

## Week plan

| Week | A: Drive | B: UI and viewer | C: Sharing | D: AI | Platform |
| --- | --- | --- | --- | --- | --- |
| 1 | Folder list on mock data | Tokens, Button, Chip, Seg, app shell | ClamAV worker scanning a local file | Sign in, Onboarding on mock data | Repo, CI, dev access, auth middleware, SDK |
| 2 | Upload, folders API | Sidebar, ⌘K shell, right-click menu | Scanner wired to Eventarc in dev | Audit log routes, Activity | Upload/download URLs, dev deploy |
| 3 | Trash, rename, move | File viewer (PDF, image, text) | DLP findings, Scan report | Exposure score, Home card | KMS crypto package, quotas |
| 4 | Versions | Drag and drop, motion | Share links, PIN, Recipient page | Consent per folder, Vertex AI | Download cap, monitoring |
| 5 | Settings bars, search hookup | Preview service, Office files | Redacted copy, Shared by me | Ask my files with citations | Prod environment |
| 6 | Bug fixes | Accessibility pass | Edge cases | AI log, 404, legal, demo script | Load test, demo deploy |

## Rules

1. Day 1: agree the Zod schemas in `packages/schema` and the Firestore schema in `docs/glashus-project-docs.md`.
2. Nobody touches `infra/`, IAM or prod. Need a bucket, env var or service? Open an issue labelled `infra`.
3. Every PR links an issue (`Closes #12`) and gets one reviewer. Auth, crypto, quotas and sharing need Anas.
4. API changes start with a schema PR labelled `api-contract`; the SDK regenerates and the web build catches breakage.
5. Build UI against mock data first, so nobody waits on an API.
6. Friday: merge everything and run the smoke tests on dev (EICAR, PII file, expired link, download cap).

## GitHub Project fields

- Status: Backlog, To do, In progress, In review, Done
- Part: A, B, C, D, Infra
- Week: iteration, 1 week, 6 iterations
- Priority: P0, P1, P2
- Size: S, M, L
