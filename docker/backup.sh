#!/usr/bin/env bash
# docker/backup.sh — Respaldo automatizado de PostgreSQL y carpeta uploads/ (Multi-instancia Afótica)
set -euo pipefail

export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${PATH:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_DIR}"

if [ -f ".env" ]; then
  set -a
  # shellcheck disable=SC1091
  source <(tr -d '\r' < .env)
  set +a
fi

APP_SLUG="${APP_SLUG:-lunnadecoco}"
POSTGRES_USER="${POSTGRES_USER:-admin}"
POSTGRES_DB="${POSTGRES_DB:-lunnadecoco}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

if [ -d "/var/www/afotica/backups" ]; then
  DEFAULT_DB_BACKUP_DIR="/var/www/afotica/backups/bases_de_datos"
  DEFAULT_MEDIA_BACKUP_DIR="/var/www/afotica/backups/media"
else
  DEFAULT_DB_BACKUP_DIR="${BACKUP_DIR:-./backups}/bases_de_datos"
  DEFAULT_MEDIA_BACKUP_DIR="${BACKUP_DIR:-./backups}/media"
fi

DB_BACKUP_DIR="${DB_BACKUP_DIR:-${DEFAULT_DB_BACKUP_DIR}}"
MEDIA_BACKUP_DIR="${MEDIA_BACKUP_DIR:-${DEFAULT_MEDIA_BACKUP_DIR}}"

mkdir -p "${DB_BACKUP_DIR}" "${MEDIA_BACKUP_DIR}"

echo "[$(date)] Iniciando backup para instancia: ${APP_SLUG}..."

# 1. Backup de Base de Datos PostgreSQL comprimido
DB_FILE="${DB_BACKUP_DIR}/${APP_SLUG}_db_${TIMESTAMP}.sql.gz"
docker exec "${APP_SLUG}-postgres" pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" | gzip > "${DB_FILE}"
echo "✅ Base de datos respaldada en: ${DB_FILE}"

# 2. Backup de imágenes y configuración CMS (uploads/)
if [ -d "./uploads" ]; then
  UPLOADS_FILE="${MEDIA_BACKUP_DIR}/${APP_SLUG}_uploads_${TIMESTAMP}.tar.gz"
  tar -czf "${UPLOADS_FILE}" ./uploads
  echo "✅ Carpeta uploads respaldada en: ${UPLOADS_FILE}"
fi

# 3. Rotación automática de respaldos antiguos
find "${DB_BACKUP_DIR}" -type f -name "${APP_SLUG}_db_*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete
find "${MEDIA_BACKUP_DIR}" -type f -name "${APP_SLUG}_uploads_*.tar.gz" -mtime +"${RETENTION_DAYS}" -delete
echo "🧹 Respaldos mayores a ${RETENTION_DAYS} días eliminados."
echo "[$(date)] Backup finalizado con éxito."

