#!/usr/bin/env node
/**
 * PostCompact Hook — 컨텍스트 압축 시 핵심 정보 자동 메모리 저장
 *
 * 압축 전후 컨텍스트를 분석해서 중요 패턴을 instinct 시스템에 기록
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const MEMORY_DIR = join(process.env.HOME || process.env.USERPROFILE, '.claude', 'projects');
const INSTINCT_DIR = join(process.env.HOME || process.env.USERPROFILE, '.local', 'bin', 'Nava', 'naba-tools', 'instinct');

// Ensure instinct directory exists
if (!existsSync(INSTINCT_DIR)) {
  mkdirSync(INSTINCT_DIR, { recursive: true });
}

const input = [];
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input.push(chunk));
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input.join(''));
    const timestamp = new Date().toISOString();
    const sessionId = data.session_id || 'unknown';

    // Log compaction event
    const logEntry = {
      timestamp,
      sessionId,
      event: 'compact',
      inputTokensBefore: data.input_tokens_before || 0,
      inputTokensAfter: data.input_tokens_after || 0,
      compressionRatio: data.input_tokens_before
        ? ((1 - data.input_tokens_after / data.input_tokens_before) * 100).toFixed(1) + '%'
        : 'unknown'
    };

    // Append to compaction log
    const logFile = join(INSTINCT_DIR, 'compaction-log.jsonl');
    writeFileSync(logFile, JSON.stringify(logEntry) + '\n', { flag: 'a' });

    // Output success (no blocking)
    process.exit(0);
  } catch {
    // Silently fail — never block the session
    process.exit(0);
  }
});
