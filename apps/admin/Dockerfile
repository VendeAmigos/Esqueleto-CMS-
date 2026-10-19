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
COPY apps/admin/package.json ./apps/admin/
COPY apps/storefront/package.json* ./apps/storefront/
COPY packages/ ./packages/

# Instalar todas las dependencias del workspace
RUN pnpm install --frozen-lockfile

# ==========================================
# 3. Compilación (Builder)
# ==========================================
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/admin/node_modules ./apps/admin/node_modules
COPY --from=deps /app/packages ./packages
COPY . .

# Variables de entorno para build de Next.js
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=1

# Compilar Next.js (debe tener output: 'standalone' en next.config.js)
RUN pnpm --filter admin... build

# ==========================================
# 4. Runner de Producción
# ==========================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"
ENV PORT=3001

# Usuario no privilegiado para máxima seguridad
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copiar archivos públicos si existen
COPY --from=builder /app/apps/admin/public ./apps/admin/public

# Copiar el paquete autónomo standalone generado por Next.js
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/static ./apps/admin/.next/static

USER nextjs

EXPOSE 3001

# En Next.js standalone monorepo, la entrada se ubica en apps/admin/server.js
CMD ["node", "apps/admin/server.js"]
