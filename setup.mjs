#!/usr/bin/env node
/**
 * Nava System Setup — 다른 컴퓨터에서 clone 후 이것만 실행하면 전체 시스템 세팅
 *
 * Usage: node setup.mjs
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const NAVA_ROOT = import.meta.dirname;
const HOME = process.env.HOME || process.env.USERPROFILE;
const CLAUDE_DIR = join(HOME, '.claude');
const GIT_HOOKS_DIR = join(HOME, '.config', 'git', 'hooks');

const log = (icon, msg) => console.log(`  ${icon} ${msg}`);
const ok = (msg) => log('✓', msg);
const skip = (msg) => log('·', msg);
const warn = (msg) => log('!', msg);

console.log('\n🦋 Nava System Setup\n');

// ── 1. 디렉토리 생성 ──
const dirs = [
  join(NAVA_ROOT, 'naba-tools', 'logs', 'reviews'),
  join(NAVA_ROOT, 'naba-tools', 'logs', 'pipelines'),
  join(NAVA_ROOT, 'naba-tools', 'logs', 'errors'),
  join(NAVA_ROOT, 'naba-tools', 'instinct'),
  GIT_HOOKS_DIR,
];

for (const dir of dirs) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    ok(`Created: ${dir}`);
  }
}
ok('Directories ready');

// ── 2. 글로벌 Git Hooks (컨베이어 A) ──
const dispatchPath = join(NAVA_ROOT, 'naba-tools', 'conveyor', 'reviewer-dispatch.mjs').replace(/\\/g, '/');
const patchPath = join(NAVA_ROOT, 'naba-tools', 'conveyor', 'post-commit-patch.mjs').replace(/\\/g, '/');

const preCommit = `#!/bin/bash
# Nava Code Quality Conveyor — Global pre-commit hook
if [ "\${CONVEYOR_RUNNING}" = "1" ]; then exit 0; fi
export CONVEYOR_RUNNING=1
node "${dispatchPath}"
EXIT_CODE=$?
unset CONVEYOR_RUNNING
exit $EXIT_CODE
`;

const postCommit = `#!/bin/bash
# Nava Code Quality Conveyor — Global post-commit hook
node "${patchPath}"
`;

writeFileSync(join(GIT_HOOKS_DIR, 'pre-commit'), preCommit);
writeFileSync(join(GIT_HOOKS_DIR, 'post-commit'), postCommit);

try {
  execFileSync('git', ['config', '--global', 'core.hooksPath', GIT_HOOKS_DIR.replace(/\\/g, '/')]);
  ok('Global git hooks installed (Conveyor A)');
} catch {
  warn('Failed to set global git hooks path');
}

// ── 3. Claude Code Hooks (컨베이어 B, C) ──
const settingsPath = join(CLAUDE_DIR, 'settings.json');

if (existsSync(settingsPath)) {
  try {
    const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    const hooks = settings.hooks || {};
    let changed = false;

    // 컨베이어 B: UserPromptSubmit
    const intentPath = join(NAVA_ROOT, 'naba-tools', 'conveyor', 'pipeline-intent.mjs').replace(/\\/g, '/');
    const hasB = hooks.UserPromptSubmit?.some(h =>
      h.hooks?.some(hh => hh.command?.includes('pipeline-intent'))
    );
    if (!hasB) {
      hooks.UserPromptSubmit = hooks.UserPromptSubmit || [];
      hooks.UserPromptSubmit.push({
        matcher: '',
        hooks: [{ type: 'command', command: `node ${intentPath}`, statusMessage: '파이프라인 감지' }],
      });
      changed = true;
      ok('Registered Conveyor B (Feature Dev) hook');
    } else {
      skip('Conveyor B hook already registered');
    }

    // 컨베이어 C: PostToolUse:Bash
    const watchdogPath = join(NAVA_ROOT, 'naba-tools', 'conveyor', 'watchdog.mjs').replace(/\\/g, '/');
    const hasC = hooks.PostToolUse?.some(h =>
      h.matcher === 'Bash' && h.hooks?.some(hh => hh.command?.includes('watchdog'))
    );
    if (!hasC) {
      hooks.PostToolUse = hooks.PostToolUse || [];
      hooks.PostToolUse.push({
        matcher: 'Bash',
        hooks: [{ type: 'command', command: `node ${watchdogPath}`, statusMessage: '에러 감시' }],
      });
      changed = true;
      ok('Registered Conveyor C (Watchdog) hook');
    } else {
      skip('Conveyor C hook already registered');
    }

    if (changed) {
      settings.hooks = hooks;
      writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      ok('Updated settings.json');
    }
  } catch (e) {
    warn(`Failed to update settings.json: ${e.message}`);
  }
} else {
  warn('~/.claude/settings.json not found — install Claude Code first');
}

// ── 4. 필요한 플러그인 목록 출력 ──
console.log('\n📦 Required Plugins (install manually in Claude Code):');
const plugins = [
  'commit-commands', 'pr-review-toolkit', 'feature-dev', 'frontend-design',
  'plugin-dev', 'agent-sdk-dev', 'skill-creator', 'hookify',
  'claude-code-setup', 'claude-md-management', 'superpowers',
];
plugins.forEach(p => console.log(`  · ${p}`));

// ── 5. 환경변수 안내 ──
console.log('\n🔑 Optional Environment Variables:');
console.log('  · TELEGRAM_BOT_TOKEN — for Telegram notifications');
console.log('  · TELEGRAM_CHAT_ID   — for Telegram notifications');

// ── Done ──
console.log('\n🦋 Setup complete. Restart Claude Code to activate.\n');
