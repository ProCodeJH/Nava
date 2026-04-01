#!/usr/bin/env node
/**
 * Instinct Engine — 세션 종료 시 패턴 추출 + 신뢰도 관리
 *
 * Stop 훅에서 호출. transcript를 분석해서:
 * 1. 반복되는 도구 사용 패턴 추출
 * 2. 에러→수정 패턴 기록
 * 3. 사용자 피드백 패턴 추적
 * 4. 신뢰도 점수 업데이트
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const INSTINCT_DIR = join(
  process.env.HOME || process.env.USERPROFILE,
  '.local', 'bin', 'Nava', 'naba-tools', 'instinct'
);

if (!existsSync(INSTINCT_DIR)) {
  mkdirSync(INSTINCT_DIR, { recursive: true });
}

const PATTERNS_FILE = join(INSTINCT_DIR, 'patterns.jsonl');
const INSTINCT_FILE = join(INSTINCT_DIR, 'instinct.json');
const INSIGHTS_FILE = join(INSTINCT_DIR, 'session-insights.jsonl');

// Load current instincts
function loadInstincts() {
  if (!existsSync(INSTINCT_FILE)) return { version: 1, instincts: [], lastUpdated: null };
  try {
    return JSON.parse(readFileSync(INSTINCT_FILE, 'utf8'));
  } catch {
    return { version: 1, instincts: [], lastUpdated: null };
  }
}

// Save instincts
function saveInstincts(data) {
  data.lastUpdated = new Date().toISOString();
  writeFileSync(INSTINCT_FILE, JSON.stringify(data, null, 2));
}

// Add pattern
function addPattern(pattern) {
  writeFileSync(PATTERNS_FILE, JSON.stringify(pattern) + '\n', { flag: 'a' });
}

// Promote high-confidence patterns to instincts
function promotePatterns(instinctData) {
  if (!existsSync(PATTERNS_FILE)) return instinctData;

  const lines = readFileSync(PATTERNS_FILE, 'utf8').trim().split('\n').filter(Boolean);
  const patternCounts = {};

  for (const line of lines) {
    try {
      const p = JSON.parse(line);
      const key = `${p.type}:${p.pattern}`;
      if (!patternCounts[key]) {
        patternCounts[key] = { ...p, count: 0 };
      }
      patternCounts[key].count++;
    } catch { /* skip bad lines */ }
  }

  for (const [key, p] of Object.entries(patternCounts)) {
    const confidence = Math.min(1.0, p.count * 0.2); // 5회 = 1.0
    if (confidence >= 0.7) {
      const existing = instinctData.instincts.find(i => i.key === key);
      if (existing) {
        existing.confidence = confidence;
        existing.count = p.count;
        existing.lastSeen = new Date().toISOString();
      } else {
        instinctData.instincts.push({
          key,
          type: p.type,
          pattern: p.pattern,
          description: p.description || '',
          confidence,
          count: p.count,
          firstSeen: p.timestamp || new Date().toISOString(),
          lastSeen: new Date().toISOString()
        });
      }
    }
  }

  // Remove low-confidence instincts that haven't been seen recently
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days
  instinctData.instincts = instinctData.instincts.filter(i =>
    i.confidence >= 0.5 || new Date(i.lastSeen).getTime() > cutoff
  );

  return instinctData;
}

// Main: analyze session and extract patterns
const input = [];
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input.push(chunk));
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input.join(''));
    const timestamp = new Date().toISOString();
    const sessionId = data.session_id || randomUUID();

    // Extract basic session insight
    const insight = {
      timestamp,
      sessionId,
      project: process.cwd().split(/[/\\]/).pop(),
      event: data.hook_event || 'Stop'
    };
    writeFileSync(INSIGHTS_FILE, JSON.stringify(insight) + '\n', { flag: 'a' });

    // If transcript path available, could analyze it
    // For now, record the session event as a pattern
    addPattern({
      timestamp,
      type: 'session',
      pattern: `project:${insight.project}`,
      description: `Worked on ${insight.project}`
    });

    // Promote patterns to instincts
    const instinctData = loadInstincts();
    const updated = promotePatterns(instinctData);
    saveInstincts(updated);

  } catch {
    // Never block
  }
  process.exit(0);
});
