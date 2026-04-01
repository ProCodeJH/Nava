#!/usr/bin/env node
// install-hook.mjs — 프로젝트에 conveyor git hooks 설치
import { writeFileSync, existsSync, readFileSync, chmodSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DISPATCH_PATH = join(import.meta.dirname, 'reviewer-dispatch.mjs').replace(/\\/g, '/');
const PATCH_PATH = join(import.meta.dirname, 'post-commit-patch.mjs').replace(/\\/g, '/');

const targetDir = process.argv[2] || process.cwd();
const gitDir = join(resolve(targetDir), '.git');

if (!existsSync(gitDir)) {
  console.error(`[CONVEYOR] Not a git repository: ${targetDir}`);
  process.exit(1);
}

const hooksDir = join(gitDir, 'hooks');

// --- pre-commit hook ---
const preCommitPath = join(hooksDir, 'pre-commit');
const preCommitContent = `#!/bin/bash
# Nava Code Quality Conveyor — pre-commit hook

# 재진입 방지
if [ "\${CONVEYOR_RUNNING}" = "1" ]; then
  exit 0
fi
export CONVEYOR_RUNNING=1

node "${DISPATCH_PATH}"
EXIT_CODE=$?

unset CONVEYOR_RUNNING
exit $EXIT_CODE
`;

if (existsSync(preCommitPath)) {
  const existing = readFileSync(preCommitPath, 'utf8');
  if (existing.includes('CONVEYOR_RUNNING')) {
    console.log('[CONVEYOR] pre-commit hook already installed — updating');
  } else {
    writeFileSync(preCommitPath + '.backup', existing);
    console.log('[CONVEYOR] Backed up existing pre-commit hook');
  }
}

writeFileSync(preCommitPath, preCommitContent);
try { chmodSync(preCommitPath, 0o755); } catch {}
console.log(`[CONVEYOR] Installed pre-commit hook: ${preCommitPath}`);

// --- post-commit hook ---
const postCommitPath = join(hooksDir, 'post-commit');
const postCommitContent = `#!/bin/bash
# Nava Code Quality Conveyor — post-commit hook
node "${PATCH_PATH}"
`;

if (existsSync(postCommitPath)) {
  const existing = readFileSync(postCommitPath, 'utf8');
  if (existing.includes('post-commit-patch')) {
    console.log('[CONVEYOR] post-commit hook already installed — updating');
  } else {
    writeFileSync(postCommitPath + '.backup', existing);
    console.log('[CONVEYOR] Backed up existing post-commit hook');
  }
}

writeFileSync(postCommitPath, postCommitContent);
try { chmodSync(postCommitPath, 0o755); } catch {}
console.log(`[CONVEYOR] Installed post-commit hook: ${postCommitPath}`);

console.log(`[CONVEYOR] Installation complete for: ${targetDir}`);
