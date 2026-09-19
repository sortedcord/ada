FROM node:24-alpine3.22 AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/observability/package.json packages/observability/package.json
RUN pnpm install --frozen-lockfile
COPY tsconfig.base.json turbo.json .prettierrc.json ./
COPY apps/api apps/api
COPY packages/config packages/config
COPY packages/contracts packages/contracts
COPY packages/db packages/db
COPY packages/domain packages/domain
COPY packages/observability packages/observability
RUN pnpm --filter @ada/api build
RUN pnpm --filter @ada/api deploy --prod /prod/api

FROM node:24-alpine3.22 AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S -g 10001 app && adduser -S -u 10001 -G app app
COPY --from=build --chown=app:app /prod/api .
USER 10001
EXPOSE 3000
CMD ["node", "dist/index.js"]
