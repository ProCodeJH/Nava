import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const LOG_DIR = join(import.meta.dirname, '..', 'logs', 'reviews');

function ensureLogDir() {
  mkdirSync(LOG_DIR, { recursive: true });
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
 * Creates a JSON log file for a review run.
 * @param {object} data
 * @param {string[]} [data.files_reviewed]
 * @param {string[]} [data.reviewers_used]
 * @param {number}   [data.duration_ms]
 * @param {object[]} [data.issues]
 * @param {string}   [data.result]
 * @param {object}   [data.summary]
 * @returns {string} path to the created log file
 */
export function createLog(data = {}) {
  ensureLogDir();

  const now = new Date();
  const log = {
    timestamp: now.toISOString(),
    commit_hash: 'pending',
    files_reviewed: data.files_reviewed ?? [],
    reviewers_used: data.reviewers_used ?? [],
    duration_ms: data.duration_ms ?? 0,
    issues: data.issues ?? [],
    result: data.result ?? 'unknown',
    summary: {
      total_issues: 0,
      critical: 0,
      minor: 0,
      auto_fixed: 0,
      ...(data.summary ?? {}),
    },
  };

  const filename = `${formatTimestamp(now)}.json`;
  const filePath = join(LOG_DIR, filename);
  writeFileSync(filePath, JSON.stringify(log, null, 2), 'utf8');
  return filePath;
}

/**
 * Finds the most recent log with commit_hash === "pending" and patches it.
 * @param {string} hash  — the real commit hash to write
 * @returns {string|null} path of the patched file, or null if none found
 */
export function patchCommitHash(hash) {
  ensureLogDir();

  const files = readdirSync(LOG_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()       // lexicographic = chronological given YYYY-MM-DD_HHmmss names
    .reverse();   // most recent first

  for (const file of files) {
    const filePath = join(LOG_DIR, file);
    let log;
    try {
      log = JSON.parse(readFileSync(filePath, 'utf8'));
    } catch {
      continue;
    }
    if (log.commit_hash === 'pending') {
      log.commit_hash = hash;
      writeFileSync(filePath, JSON.stringify(log, null, 2), 'utf8');
      return filePath;
    }
  }
  return null;
}
