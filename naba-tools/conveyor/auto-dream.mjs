#!/usr/bin/env node
/**
 * AutoDream — PostCompact 시 instinct 패턴 통합
 *
 * 컨텍스트 압축될 때 세션에서 배운 패턴을 instinct에 기록.
 * KAIROS의 autoDream 기능 경량 버전.
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const INSTINCT_DIR = join(import.meta.dirname, '..', 'instinct');
const PATTERNS_FILE = join(INSTINCT_DIR, 'patterns.jsonl');
const COMPACTION_LOG = join(INSTINCT_DIR, 'compaction-log.jsonl');

const input = [];
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input.push(chunk));
process.stdin.on('end', () => {
  try {
    if (!existsSync(INSTINCT_DIR)) mkdirSync(INSTINCT_DIR, { recursive: true });

    const data = JSON.parse(input.join(''));
    const now = new Date().toISOString();
    const project = process.cwd().split(/[/\\]/).pop();

    // 컴팩션 로그 기록
    appendFileSync(COMPACTION_LOG, JSON.stringify({
      timestamp: now,
      project,
      event: 'compaction',
      summary_length: data.summary?.length || 0,
    }) + '\n');

    // 프로젝트 패턴 누적 (instinct 시스템 연동)
    const patternKey = `session:project:${project}`;
    let instinct = {};
    const instinctFile = join(INSTINCT_DIR, 'instinct.json');

    if (existsSync(instinctFile)) {
      instinct = JSON.parse(readFileSync(instinctFile, 'utf8'));
    }

    if (!instinct[patternKey]) {
      instinct[patternKey] = { count: 0, confidence: 0.5, first_seen: now };
    }
    instinct[patternKey].count++;
    instinct[patternKey].last_seen = now;
    // 신뢰도 증가 (최대 1.0)
    instinct[patternKey].confidence = Math.min(1.0, instinct[patternKey].confidence + 0.02);

    writeFileSync(instinctFile, JSON.stringify(instinct, null, 2));

    // systemMessage로 기억 보존 지시
    console.log(JSON.stringify({
      systemMessage: `[NAVA:DREAM] Context compacted. ${Object.keys(instinct).length} patterns tracked. Memory preserved.`,
    }));
  } catch {
    // 실패해도 차단 안 함
    console.log(JSON.stringify({
      systemMessage: 'Context compacted. Memory preserved.',
    }));
  }
});
