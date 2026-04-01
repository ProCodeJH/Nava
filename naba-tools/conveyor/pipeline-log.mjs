import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const LOGS_DIR = join(import.meta.dirname, '..', 'logs', 'pipelines');

function ensureLogsDir() {
  mkdirSync(LOGS_DIR, { recursive: true });
}

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
 * Writes a pipeline completion log as a JSON file.
 * @param {object} state - Pipeline state object from pipeline-state.mjs's complete() return
 * @param {string} state.pipeline_id
 * @param {string} [state.type]
 * @param {*}      [state.input]
 * @param {object} [state.phases]
 * @param {*}      [state.result]
 * @param {string|Date} [state.created_at]
 * @returns {string} filepath of the created log file
 */
export function savePipelineLog(state = {}) {
  ensureLogsDir();

  const now = new Date();
  const createdAt = state.created_at ? new Date(state.created_at) : now;
  const total_duration_ms = now - createdAt;

  const log = {
    timestamp: now.toISOString(),
    pipeline_id: state.pipeline_id ?? crypto.randomUUID(),
    type: state.type ?? 'unknown',
    input: state.input ?? null,
    phases: state.phases ?? {},
    result: state.result ?? null,
    total_duration_ms,
  };

  const filename = `${formatTimestamp(now)}_pipeline.json`;
  const filepath = join(LOGS_DIR, filename);
  writeFileSync(filepath, JSON.stringify(log, null, 2), 'utf8');
  return filepath;
}
