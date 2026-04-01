#!/usr/bin/env node
// post-commit-patch.mjs — 커밋 후 로그의 commit_hash를 실제 해시로 패치
import { execFileSync } from 'node:child_process';
import { patchCommitHash } from './review-log.mjs';

try {
  const hash = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const patched = patchCommitHash(hash);
  if (patched) {
    console.log(`[CONVEYOR] Log patched with commit ${hash.slice(0, 7)}`);
  }
} catch {
  // 실패해도 커밋은 차단하지 않음
}
