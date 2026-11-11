#!/usr/bin/env bash
# docker/backup.sh — Respaldo automatizado de PostgreSQL y carpeta uploads/ (Multi-instancia)
set -euo pipefail

APP_SLUG="${APP_SLUG:-esqueleto}"
POSTGRES_USER="${POSTGRES_USER:-admin}"
POSTGRES_DB="${POSTGRES_DB:-esqueleto}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Iniciando backup para instancia: ${APP_SLUG}..."

# 1. Backup de Base de Datos PostgreSQL comprimido
DB_FILE="${BACKUP_DIR}/${APP_SLUG}_db_${TIMESTAMP}.sql.gz"
docker exec "${APP_SLUG}-postgres" pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" | gzip > "${DB_FILE}"
echo "✅ Base de datos respaldada en: ${DB_FILE}"

# 2. Backup de imágenes y configuración CMS (uploads/)
if [ -d "./uploads" ]; then
  UPLOADS_FILE="${BACKUP_DIR}/${APP_SLUG}_uploads_${TIMESTAMP}.tar.gz"
  tar -czf "${UPLOADS_FILE}" ./uploads
  echo "✅ Carpeta uploads respaldada en: ${UPLOADS_FILE}"
fi

# 3. Rotación automática de respaldos antiguos
find "${BACKUP_DIR}" -type f -name "${APP_SLUG}_*" -mtime +"${RETENTION_DAYS}" -delete
echo "🧹 Respaldos mayores a ${RETENTION_DAYS} días eliminados."
echo "[$(date)] Backup finalizado con éxito."

