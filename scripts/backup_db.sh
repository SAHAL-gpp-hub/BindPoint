#!/usr/bin/env bash
# PostgreSQL Backup Script for Print Station
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-storage/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/print_station_backup_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[*] Starting PostgreSQL backup: ${BACKUP_FILE}"
docker exec print_station_postgres pg_dump -U postgres -d print_station | gzip > "${BACKUP_FILE}"

echo "[+] Backup created successfully (${BACKUP_FILE})"
# Keep only last 14 days of backups
find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +14 -delete
echo "[+] Cleaned up backups older than 14 days."
