#!/usr/bin/env node
/**
 * Nava System Setup — clone 후 이것만 실행하면 전체 시스템 자동 세팅
 *
 * Usage: node setup.mjs [--full]
 *   --full: ai-resources까지 clone (첫 설치 시)
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const NAVA_ROOT = import.meta.dirname;
const HOME = process.env.HOME || process.env.USERPROFILE;
const CLAUDE_DIR = join(HOME, '.claude');
const GIT_HOOKS_DIR = join(HOME, '.config', 'git', 'hooks');
const FULL_MODE = process.argv.includes('--full');

const ok = (msg) => console.log(`  \x1b[32m+\x1b[0m ${msg}`);
const skip = (msg) => console.log(`  \x1b[90m-\x1b[0m ${msg}`);
const warn = (msg) => console.log(`  \x1b[33m!\x1b[0m ${msg}`);
const section = (msg) => console.log(`\n\x1b[36m== ${msg} ==\x1b[0m`);

console.log('\n\x1b[35mNava System Setup\x1b[0m\n');

// == 1. Directories ==
section('1. Directories');
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
    ok(`Created ${dir.replace(HOME, '~')}`);
  }
}
ok('Directories ready');

// == 2. Global Git Hooks (Conveyor A) ==
section('2. Global Git Hooks (Conveyor A)');
const dispatchPath = join(NAVA_ROOT, 'naba-tools', 'conveyor', 'reviewer-dispatch.mjs').replace(/\\/g, '/');
const patchPath = join(NAVA_ROOT, 'naba-tools', 'conveyor', 'post-commit-patch.mjs').replace(/\\/g, '/');

writeFileSync(join(GIT_HOOKS_DIR, 'pre-commit'), [
  '#!/bin/bash',
  '# Nava Code Quality Conveyor',
  'if [ "${CONVEYOR_RUNNING}" = "1" ]; then exit 0; fi',
  'export CONVEYOR_RUNNING=1',
  `node "${dispatchPath}"`,
  'EXIT_CODE=$?',
  'unset CONVEYOR_RUNNING',
  'exit $EXIT_CODE',
].join('\n') + '\n');

writeFileSync(join(GIT_HOOKS_DIR, 'post-commit'), [
  '#!/bin/bash',
  '# Nava Conveyor — commit hash patch',
  `node "${patchPath}"`,
].join('\n') + '\n');

try {
  execFileSync('git', ['config', '--global', 'core.hooksPath', GIT_HOOKS_DIR.replace(/\\/g, '/')]);
  ok('Global git hooks installed');
} catch {
  warn('Failed to set global git hooks');
}

// == 3. Claude Code Settings (Conveyor B, C + Plugins) ==
section('3. Claude Code Settings');
const settingsPath = join(CLAUDE_DIR, 'settings.json');

if (!existsSync(settingsPath)) {
  warn('~/.claude/settings.json not found — install Claude Code first');
} else {
  try {
    const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    let changed = false;
    const hooks = settings.hooks || {};

    // Conveyor B: UserPromptSubmit
    const intentPath = join(NAVA_ROOT, 'naba-tools', 'conveyor', 'pipeline-intent.mjs').replace(/\\/g, '/');
    if (!hooks.UserPromptSubmit?.some(h => h.hooks?.some(hh => hh.command?.includes('pipeline-intent')))) {
      hooks.UserPromptSubmit = hooks.UserPromptSubmit || [];
      hooks.UserPromptSubmit.push({
        matcher: '',
        hooks: [{ type: 'command', command: `node ${intentPath}`, statusMessage: 'pipeline detect' }],
      });
      changed = true;
      ok('Conveyor B (Feature Dev) registered');
    } else {
      skip('Conveyor B already registered');
    }

    // Conveyor C: PostToolUse:Bash
    const watchdogPath = join(NAVA_ROOT, 'naba-tools', 'conveyor', 'watchdog.mjs').replace(/\\/g, '/');
    if (!hooks.PostToolUse?.some(h => h.matcher === 'Bash' && h.hooks?.some(hh => hh.command?.includes('watchdog')))) {
      hooks.PostToolUse = hooks.PostToolUse || [];
      hooks.PostToolUse.push({
        matcher: 'Bash',
        hooks: [{ type: 'command', command: `node ${watchdogPath}`, statusMessage: 'error watch' }],
      });
      changed = true;
      ok('Conveyor C (Watchdog) registered');
    } else {
      skip('Conveyor C already registered');
    }

    // TeammateIdle: 팀원 유휴 시 자동 재투입
    const idlePath = join(NAVA_ROOT, 'naba-tools', 'conveyor', 'teammate-idle.mjs').replace(/\\/g, '/');
    if (!hooks.TeammateIdle?.some(h => h.hooks?.some(hh => hh.command?.includes('teammate-idle')))) {
      hooks.TeammateIdle = hooks.TeammateIdle || [];
      hooks.TeammateIdle.push({
        matcher: '',
        hooks: [{ type: 'command', command: `node ${idlePath}`, statusMessage: 'teammate re-engage' }],
      });
      changed = true;
      ok('TeammateIdle hook registered');
    } else {
      skip('TeammateIdle already registered');
    }

    // TaskCompleted: 태스크 완료 로그
    const completedPath = join(NAVA_ROOT, 'naba-tools', 'conveyor', 'task-completed.mjs').replace(/\\/g, '/');
    if (!hooks.TaskCompleted?.some(h => h.hooks?.some(hh => hh.command?.includes('task-completed')))) {
      hooks.TaskCompleted = hooks.TaskCompleted || [];
      hooks.TaskCompleted.push({
        matcher: '',
        hooks: [{ type: 'command', command: `node ${completedPath}`, async: true, statusMessage: 'task log' }],
      });
      changed = true;
      ok('TaskCompleted hook registered');
    } else {
      skip('TaskCompleted already registered');
    }

    // PostCompact: AutoDream (instinct 패턴 통합)
    const dreamPath = join(NAVA_ROOT, 'naba-tools', 'conveyor', 'auto-dream.mjs').replace(/\\/g, '/');
    if (!hooks.PostCompact?.some(h => h.hooks?.some(hh => hh.command?.includes('auto-dream')))) {
      hooks.PostCompact = hooks.PostCompact || [];
      hooks.PostCompact.push({
        matcher: '',
        hooks: [{ type: 'command', command: `node ${dreamPath}`, statusMessage: 'AutoDream' }],
      });
      changed = true;
      ok('AutoDream (PostCompact) hook registered');
    } else {
      skip('AutoDream already registered');
    }

    settings.hooks = hooks;

    // Plugins (all official)
    const PLUGINS = [
      'claude-code-setup', 'claude-md-management', 'feature-dev', 'security-guidance',
      'skill-creator', 'code-simplifier', 'frontend-design', 'commit-commands',
      'playwright', 'github', 'hookify', 'plugin-dev', 'agent-sdk-dev',
      'ralph-loop', 'pr-review-toolkit', 'playground', 'explanatory-output-style',
      'learning-output-style', 'context7', 'supabase', 'firebase', 'slack',
      'typescript-lsp', 'csharp-lsp', 'asana', 'gitlab', 'greptile',
      'linear', 'serena', 'stripe', 'clangd-lsp', 'gopls-lsp', 'jdtls-lsp',
      'kotlin-lsp', 'lua-lsp', 'php-lsp', 'pyright-lsp', 'rust-analyzer-lsp',
      'swift-lsp', 'superpowers',
    ];

    settings.enabledPlugins = settings.enabledPlugins || {};
    let pluginCount = 0;
    for (const p of PLUGINS) {
      const key = `${p}@claude-plugins-official`;
      if (!settings.enabledPlugins[key]) {
        settings.enabledPlugins[key] = true;
        pluginCount++;
      }
    }
    if (pluginCount > 0) {
      changed = true;
      ok(`${pluginCount} plugins enabled`);
    } else {
      skip('All plugins already enabled');
    }

    if (changed) {
      writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      ok('settings.json updated');
    }
  } catch (e) {
    warn(`settings.json failed: ${e.message}`);
  }
}

// == 4. MCP Servers ==
section('4. MCP Servers');
const mcpSource = join(NAVA_ROOT, 'config', 'mcp.json');
const mcpTarget = join(NAVA_ROOT, '..', '.mcp.json');

if (existsSync(mcpSource) && !existsSync(mcpTarget)) {
  try {
    writeFileSync(mcpTarget, readFileSync(mcpSource, 'utf8'));
    ok('MCP config installed');
  } catch {
    warn('MCP config copy failed');
  }
} else if (existsSync(mcpTarget)) {
  skip('MCP config exists');
} else {
  skip('No MCP template — create config/mcp.json to auto-install');
}

// == 5. AI Resources ==
section('5. AI Resources');
const aiDir = join(NAVA_ROOT, '..', 'ai-resources');

if (FULL_MODE && !existsSync(aiDir)) {
  console.log('  Cloning ai-resources...');
  try {
    execFileSync('git', ['clone', 'https://github.com/ProCodeJH/ai-resources.git'], {
      cwd: join(NAVA_ROOT, '..'),
      stdio: 'inherit',
    });
    ok('ai-resources cloned');
  } catch {
    warn('Clone failed — do it manually');
  }
} else if (existsSync(aiDir)) {
  ok('ai-resources found');
} else {
  warn('ai-resources missing — run: node setup.mjs --full');
}

// == 6. Environment ==
section('6. Environment (optional)');
console.log('  TELEGRAM_BOT_TOKEN — notifications');
console.log('  TELEGRAM_CHAT_ID   — notification target');

// == Done ==
let pluginTotal = 0;
try {
  const s = JSON.parse(readFileSync(settingsPath, 'utf8'));
  pluginTotal = Object.keys(s.enabledPlugins || {}).length;
} catch { /* ignore */ }

console.log(`
\x1b[35mSetup Complete\x1b[0m

  Conveyor A  \x1b[32mevery git commit\x1b[0m
  Conveyor B  \x1b[32mevery "build" command\x1b[0m
  Conveyor C  \x1b[32mevery bash error\x1b[0m
  Plugins     \x1b[32m${pluginTotal} enabled\x1b[0m

  \x1b[33mRestart Claude Code to activate.\x1b[0m
`);
