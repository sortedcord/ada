FROM node:24-alpine3.22 AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/config/package.json packages/config/package.json
RUN pnpm install --frozen-lockfile
COPY tsconfig.base.json turbo.json . ./.prettierrc.json ./
COPY apps/web apps/web
COPY packages/config packages/config
RUN pnpm --filter @ada/web build

FROM nginx:1.29.1-alpine
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY infra/docker/nginx-main.conf /etc/nginx/nginx.conf
COPY infra/docker/nginx.conf /etc/nginx/conf.d/default.conf
RUN mkdir -p /tmp/client_temp /tmp/proxy_temp /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp \
  && chown -R nginx:nginx /tmp /usr/share/nginx/html
USER 101
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
