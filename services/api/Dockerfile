FROM node:22-alpine AS base
RUN corepack enable

FROM base AS builder
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/schema/package.json packages/schema/
COPY packages/typescript-config/package.json packages/typescript-config/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY services/api/package.json services/api/
RUN pnpm install --frozen-lockfile --filter @workspace/api...

COPY packages/typescript-config packages/typescript-config
COPY packages/schema packages/schema
COPY services/api services/api
RUN pnpm --filter @workspace/api build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/schema ./packages/schema
COPY --from=builder /app/services/api ./services/api
WORKDIR /app/services/api
EXPOSE 8080
CMD ["node", "dist/index.js"]
