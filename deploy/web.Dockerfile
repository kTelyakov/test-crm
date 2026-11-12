# Фронтенд: сборка Vite и раздача статики через Caddy. Контекст сборки: корень репозитория.
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY e2e/package.json e2e/
RUN pnpm install --frozen-lockfile --filter @test-crm/frontend...
COPY frontend frontend
# VITE_* вшиваются в сборку, в них только публичные значения
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL
RUN pnpm --filter @test-crm/frontend exec vite build

FROM caddy:2
COPY --from=build /app/frontend/dist /srv
COPY deploy/Caddyfile /etc/caddy/Caddyfile
