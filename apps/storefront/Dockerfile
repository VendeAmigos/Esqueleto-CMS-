# ==========================================
# 1. Base Image con Node y PNPM
# ==========================================
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Dependencias necesarias para Alpine y activación de PNPM vía Corepack
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate

# ==========================================
# 2. Dependencias del Monorepo
# ==========================================
FROM base AS deps
WORKDIR /app

# Copiar manifiestos y lockfile para aprovechar caché de Docker
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY apps/storefront/package.json ./apps/storefront/
COPY apps/admin/package.json* ./apps/admin/
COPY packages/ ./packages/

# Instalar todas las dependencias del workspace
RUN pnpm install --frozen-lockfile

# ==========================================
# 3. Compilación (Builder)
# ==========================================
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/storefront/node_modules ./apps/storefront/node_modules
COPY --from=deps /app/packages ./packages
COPY . .

# Variables de entorno para build
ENV NODE_ENV=production
ENV ASTRO_TELEMETRY_DISABLED=1

# Compilar la aplicación Astro
RUN pnpm --filter storefront... build

# Aislar dependencias de producción para el despliegue
RUN pnpm --filter=storefront --prod deploy /app/deploy

# ==========================================
# 4. Runner de Producción
# ==========================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Usuario no privilegiado para máxima seguridad
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 astro

# Copiar artefactos desplegados y compilados
COPY --from=builder --chown=astro:nodejs /app/deploy ./
COPY --from=builder --chown=astro:nodejs /app/apps/storefront/dist ./dist

USER astro

EXPOSE 3000

# Ejecución para Astro SSR (@astrojs/node) con fallback
CMD ["node", "./dist/server/entry.mjs"]
