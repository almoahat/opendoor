# ---------- Build stage: install tools and bundle the API ----------
FROM node:24-alpine AS build
WORKDIR /repo
RUN npm install -g pnpm@10.34.7

# Copy only the package manifests first. If they haven't changed,
# Docker reuses the cached install on the next build.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/mobile/package.json apps/mobile/
COPY packages/shared/package.json packages/shared/

# Install only what the API (and the shared package it uses) needs
RUN pnpm install --frozen-lockfile --filter "@opendoor/api..."

# Now copy the source code and build
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @opendoor/api build

# ---------- Runtime stage: Node plus one bundled file ----------
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/apps/api/dist ./dist

# Don't run as root inside the container
USER node
EXPOSE 4000
CMD ["node", "dist/index.js"]