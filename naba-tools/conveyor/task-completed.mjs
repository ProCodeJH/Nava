#!/usr/bin/env node
/**
 * TaskCompleted Hook — 태스크 완료 시 로그 기록 + 다음 태스크 안내
 *
 * exit code 0 = 통과
 */

import { mkdirSync, appendFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const LOGS_DIR = join(import.meta.dirname, '..', 'logs', 'tasks');

const input = [];
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input.push(chunk));
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input.join(''));
    const subject = data.tool_input?.subject || data.subject || 'unknown';
    const now = new Date().toISOString();

    // 로그 기록
    if (!existsSync(LOGS_DIR)) mkdirSync(LOGS_DIR, { recursive: true });
    appendFileSync(
      join(LOGS_DIR, 'completed.jsonl'),
      JSON.stringify({ timestamp: now, subject, event: 'completed' }) + '\n'
    );
  } catch {
    // 실패해도 차단하지 않음
  }
  process.exit(0);
});
