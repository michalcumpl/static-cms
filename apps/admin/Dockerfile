# The admin's image (admin-on-aws design.md decision 7). Build from the repository root:
#   docker build -f apps/admin/Dockerfile -t webmio-admin .
# It takes no secrets: the server gives them as environment variables when it starts.

FROM node:22-bookworm-slim AS build
# Native modules (better-sqlite3, sharp) normally use prebuilt binaries; the compilers are there
# for when a platform has none.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
ENV CI=true
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter "@webmio/admin..."
# The admin with its production dependencies and the workspace packages it uses, without the
# files only development needs.
RUN pnpm --filter @webmio/admin deploy --prod /app \
  && rm -rf /app/data /app/e2e /app/test-results /app/static/.gitkeep

FROM node:22-bookworm-slim
ENV NODE_ENV=production \
  PORT=3000 \
  BODY_SIZE_LIMIT=25M \
  MIGRATIONS_DIR=/app/drizzle \
  DATABASE_PATH=/data/app.db
WORKDIR /app
COPY --from=build --chown=node:node /app /app
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/healthz').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "dist"]
