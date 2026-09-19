FROM node:24-alpine3.22 AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages/ai/package.json packages/ai/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/engine/package.json packages/engine/package.json
COPY packages/observability/package.json packages/observability/package.json
RUN pnpm install --frozen-lockfile
COPY tsconfig.base.json turbo.json . ./
COPY apps/worker apps/worker
COPY packages/ai packages/ai
COPY packages/config packages/config
COPY packages/db packages/db
COPY packages/domain packages/domain
COPY packages/engine packages/engine
COPY packages/observability packages/observability
RUN pnpm --filter @ada/worker build
RUN pnpm --filter @ada/worker deploy --prod /prod/worker

FROM node:24-alpine3.22 AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S -g 10001 app && adduser -S -u 10001 -G app app
COPY --from=build --chown=app:app /prod/worker .
USER 10001
CMD ["node", "dist/index.js"]
