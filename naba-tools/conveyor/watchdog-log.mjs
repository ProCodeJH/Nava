import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const LOGS_DIR = join(import.meta.dirname, '..', 'logs', 'errors');

function formatTimestamp(date = new Date()) {
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  const YYYY = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const DD = pad(date.getDate());
  const HH = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${YYYY}-${MM}-${DD}_${HH}${mm}${ss}`;
}

/**
 * Saves an error log file for a Watchdog Conveyor error event.
 * @param {object} data
 * @param {string} [data.type]
 * @param {string} [data.severity]
 * @param {string} [data.command]
 * @param {number} [data.exit_code]
 * @param {string} [data.error_message]
 * @param {string} [data.stderr_excerpt]
 * @param {boolean} [data.auto_debug]
 * @param {string} [data.project]
 * @returns {string} path to the created log file
 */
export function saveErrorLog(data = {}) {
  mkdirSync(LOGS_DIR, { recursive: true });

  const now = new Date();
  const log = {
    timestamp: now.toISOString(),
    type: data.type ?? 'unknown',
    severity: data.severity ?? 'error',
    command: data.command ?? null,
    exit_code: data.exit_code ?? null,
    error_message: data.error_message ?? null,
    stderr_excerpt: data.stderr_excerpt ?? null,
    auto_debug: data.auto_debug ?? false,
    project: data.project ?? null,
  };

  const filename = `${formatTimestamp(now)}_error.json`;
  const filePath = join(LOGS_DIR, filename);
  writeFileSync(filePath, JSON.stringify(log, null, 2), 'utf8');
  return filePath;
}
