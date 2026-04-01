import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { createLog } from './review-log.mjs';

// ── Constants ──────────────────────────────────────────────────────────────
const BACKUP_DIR = join(import.meta.dirname, '.conveyor-backup');
const TIMEOUT_PER_REVIEWER = 60_000;  // 60s
const TIMEOUT_TOTAL = 180_000;        // 3min

const CRITICAL_PATTERNS =
  /security|vulnerability|injection|xss|crash|runtime error|data loss|unhandled|undefined is not|cannot read prop/i;

const REVIEWER_MAP = {
  ts: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
  py: ['.py'],
};

// ── Helpers ────────────────────────────────────────────────────────────────

function getStagedFiles() {
  try {
    const out = execFileSync(
      'git',
      ['diff', '--cached', '--name-only', '--diff-filter=ACMR'],
      { encoding: 'utf8' }
    );
    return out.split('\n').map(f => f.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

const CODE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.hpp',
  '.cs', '.rb', '.php', '.swift', '.kt',
]);

function isCodeFile(f) {
  return CODE_EXTENSIONS.has(extname(f).toLowerCase());
}

function assignReviewer(file) {
  const ext = extname(file).toLowerCase();
  if (REVIEWER_MAP.ts.includes(ext)) return 'ts-reviewer';
  if (REVIEWER_MAP.py.includes(ext)) return 'py-reviewer';
  return 'code-reviewer';
}

function groupByReviewer(files) {
  const groups = {};
  for (const f of files) {
    const rev = assignReviewer(f);
    (groups[rev] ??= []).push(f);
  }
  return groups;
}

function buildPrompt(reviewer, files) {
  const fileList = files.map(f => `- ${f}`).join('\n');
  return (
    `You are ${reviewer}, a code quality expert.\n` +
    `Review the following staged files for issues. Output ONLY a JSON array.\n` +
    `Each item: { "file": string, "line": number|null, "severity": "critical"|"minor", "message": string }\n` +
    `Mark severity "critical" for: security vulnerabilities, crashes, data loss, unhandled errors.\n` +
    `Mark severity "minor" for: style, naming, performance suggestions.\n` +
    `Files to review:\n${fileList}\n` +
    `Output JSON array only, no markdown, no explanation.`
  );
}

function parseIssues(raw) {
  try {
    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Try to extract [...] from anywhere in the output
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* fall through */ }
    }
  }
  return [];
}

function reclassify(issue) {
  if (CRITICAL_PATTERNS.test(issue.message)) {
    return { ...issue, severity: 'critical' };
  }
  return issue;
}

// ── Auto-fix ───────────────────────────────────────────────────────────────

function ensureBackupDir() {
  mkdirSync(BACKUP_DIR, { recursive: true });
}

async function autoFix(file, issue) {
  ensureBackupDir();
  const backupPath = join(BACKUP_DIR, `${basename(file)}.${Date.now()}.bak`);

  let original;
  try {
    original = readFileSync(file, 'utf8');
    writeFileSync(backupPath, original, 'utf8');
  } catch {
    return false;
  }

  const fixPrompt =
    `Fix the following issue in file "${file}":\n` +
    `Issue: ${issue.message}${issue.line ? ` (line ${issue.line})` : ''}\n` +
    `Output ONLY the complete fixed file content, no explanation, no markdown fences.`;

  const result = spawnSync(
    'claude',
    ['-p', fixPrompt, '--output-format', 'text'],
    { encoding: 'utf8', timeout: TIMEOUT_PER_REVIEWER }
  );

  if (result.status !== 0 || !result.stdout?.trim()) {
    // Restore backup
    try { writeFileSync(file, original, 'utf8'); } catch { /* best effort */ }
    try { unlinkSync(backupPath); } catch { /* best effort */ }
    return false;
  }

  try {
    writeFileSync(file, result.stdout, 'utf8');
    execFileSync('git', ['add', file]);
    unlinkSync(backupPath);
    return true;
  } catch {
    // Restore on git-add failure
    try { writeFileSync(file, original, 'utf8'); } catch { /* best effort */ }
    try { unlinkSync(backupPath); } catch { /* best effort */ }
    return false;
  }
}

// ── Main dispatch ──────────────────────────────────────────────────────────

export async function dispatch() {
  const startTime = Date.now();

  const allStaged = getStagedFiles();
  const codeFiles = allStaged.filter(isCodeFile);

  if (codeFiles.length === 0) {
    console.log('[CONVEYOR] No code files staged — skipping review.');
    return { exitCode: 0 };
  }

  console.log(`[CONVEYOR] Reviewing ${codeFiles.length} files...`);

  const groups = groupByReviewer(codeFiles);
  const allIssues = [];
  const reviewersUsed = [];

  for (const [reviewer, files] of Object.entries(groups)) {
    console.log(`[CONVEYOR] ${reviewer}: ${files.join(', ')}`);
    reviewersUsed.push(reviewer);

    const prompt = buildPrompt(reviewer, files);
    const result = spawnSync(
      'claude',
      ['-p', prompt, '--output-format', 'text'],
      { encoding: 'utf8', timeout: TIMEOUT_PER_REVIEWER }
    );

    if (result.status !== 0 || !result.stdout) {
      console.log(`  [CONVEYOR] ${reviewer}: reviewer failed or timed out`);
      continue;
    }

    const raw = parseIssues(result.stdout);
    const issues = raw.map(reclassify);
    allIssues.push(...issues);
  }

  // ── Process issues & auto-fix ──
  let criticalCount = 0;
  let minorCount = 0;
  let autoFixedCount = 0;
  let criticalUnfixed = 0;

  const elapsed = () => Math.round((Date.now() - startTime) / 1000);

  for (const issue of allIssues) {
    const loc = `${issue.file ?? '?'}${issue.line ? `:${issue.line}` : ''}`;

    if (issue.severity === 'critical') {
      criticalCount++;
      const fixed = await autoFix(issue.file, issue);
      if (fixed) {
        autoFixedCount++;
        console.log(`  CRITICAL: ${issue.message} (${loc}) -> AUTO-FIXED`);
      } else {
        criticalUnfixed++;
        console.log(`  CRITICAL: ${issue.message} (${loc}) -> UNFIXED`);
      }
    } else {
      minorCount++;
      console.log(`  minor: ${issue.message} (${loc}) -> reported`);
    }
  }

  const status = criticalUnfixed > 0 ? 'BLOCKED' : 'PASSED';
  const duration = Date.now() - startTime;

  console.log(
    `[CONVEYOR] Result: ${status} ` +
    `(${criticalCount} critical, ${minorCount} minor, ${autoFixedCount} auto-fixed) ` +
    `[${Math.round(duration / 1000)}s]`
  );

  try {
    createLog({
      files_reviewed: codeFiles,
      reviewers_used: reviewersUsed,
      duration_ms: duration,
      issues: allIssues,
      result: status,
      summary: {
        total_issues: allIssues.length,
        critical: criticalCount,
        minor: minorCount,
        auto_fixed: autoFixedCount,
      },
    });
  } catch {
    // Log failure is non-fatal
  }

  return { exitCode: criticalUnfixed > 0 ? 1 : 0 };
}

// ── CLI entry ──────────────────────────────────────────────────────────────

const isMain = process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));

if (isMain) {
  dispatch()
    .then(({ exitCode }) => process.exit(exitCode))
    .catch(err => {
      console.error('[CONVEYOR] Fatal error:', err.message);
      process.exit(1);
    });
}
