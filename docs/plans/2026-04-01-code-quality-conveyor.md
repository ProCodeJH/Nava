# Code Quality Conveyor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 커밋 시 자동으로 코드 리뷰 -> 심각 이슈 자동 수정 -> 로그 축적하는 컨베이어 벨트 구축

**Architecture:** pre-commit hook이 staged 파일을 감지하고, 확장자별 리뷰어 에이전트를 배치 호출. 결과를 severity로 분류하여 critical은 자동 수정, minor는 보고. 모든 결과는 JSON 로그로 저장되어 향후 대시보드 연동.

**Tech Stack:** Node.js v24 (ESM), Git hooks (bash), Claude Code CLI agents

**Spec:** `docs/specs/2026-04-01-code-quality-conveyor-design.md`

---

## File Structure

```
Nava/naba-tools/
  conveyor/
    reviewer-dispatch.mjs    -- 메인 디스패처: staged 파일 분류, 리뷰어 호출, severity 판정
    review-log.mjs           -- 로그 작성기: JSON 파일 생성/패치
    post-commit-patch.mjs    -- commit_hash 패치: post-commit에서 호출
    install-hook.mjs         -- git hooks 설치 스크립트
  logs/
    reviews/                 -- 리뷰 로그 JSON 파일들
```

---

### Task 1: 디렉토리 구조 및 로그 작성기

**Files:**
- Create: `Nava/naba-tools/conveyor/review-log.mjs`
- Create: `Nava/naba-tools/logs/reviews/.gitkeep`

- [ ] **Step 1: 디렉토리 생성**

```bash
mkdir -p C:/Users/exodia/.local/bin/Nava/naba-tools/conveyor
mkdir -p C:/Users/exodia/.local/bin/Nava/naba-tools/logs/reviews
touch C:/Users/exodia/.local/bin/Nava/naba-tools/logs/reviews/.gitkeep
```

- [ ] **Step 2: review-log.mjs 작성**

review-log.mjs exports two functions:
- createLog(data) -- creates a JSON log file with timestamp, files, issues, summary. commit_hash is set to "pending".
- patchCommitHash(hash) -- finds the most recent "pending" log and patches the commit_hash field.

Uses: writeFileSync, readFileSync, readdirSync from node:fs.
Log dir: join(import.meta.dirname, '..', 'logs', 'reviews')
Filename format: YYYY-MM-DD_HHmmss.json

- [ ] **Step 3: 동작 테스트**

Run a quick inline test that creates a log, then patches it, and verify the JSON output.

- [ ] **Step 4: 커밋**

```bash
git add naba-tools/conveyor/review-log.mjs naba-tools/logs/reviews/.gitkeep
git commit -m "feat: add review log writer for conveyor"
```

---

### Task 2: 리뷰어 디스패처

**Files:**
- Create: `Nava/naba-tools/conveyor/reviewer-dispatch.mjs`

- [ ] **Step 1: reviewer-dispatch.mjs 작성**

Main exported function: dispatch()

Key logic:
1. Get staged files via execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'])
2. Filter to code files by extension
3. Group by reviewer: .ts/.tsx/.js/.jsx/.mjs/.cjs -> ts-reviewer, .py -> py-reviewer, others -> code-reviewer
4. For each reviewer group, call claude CLI via spawnSync with 60s timeout, passing file contents as prompt
5. Parse JSON array of issues from output
6. Classify severity: critical patterns = security, vulnerability, injection, xss, crash, runtime error, data loss, unhandled
7. For critical issues: backup file -> call claude to fix -> git add -> cleanup backup. On failure: restore from backup.
8. For minor issues: print to terminal only
9. Call createLog() from review-log.mjs
10. Return exitCode: 1 if critical unfixed, 0 otherwise

Safety: BACKUP_DIR = .conveyor-backup/, TIMEOUT_PER_REVIEWER = 60s, TIMEOUT_TOTAL = 180s

Use spawnSync (not exec) to avoid shell injection. Pass arguments as array.

CLI entry: if import.meta.url matches process.argv[1], call dispatch() and exit with code.

- [ ] **Step 2: 구문 검증**

```bash
node --check C:/Users/exodia/.local/bin/Nava/naba-tools/conveyor/reviewer-dispatch.mjs
```

- [ ] **Step 3: 커밋**

```bash
git add naba-tools/conveyor/reviewer-dispatch.mjs
git commit -m "feat: add reviewer dispatcher for conveyor"
```

---

### Task 3: post-commit 패치

**Files:**
- Create: `Nava/naba-tools/conveyor/post-commit-patch.mjs`

- [ ] **Step 1: post-commit-patch.mjs 작성**

Simple script:
1. Get current commit hash via execFileSync('git', ['rev-parse', 'HEAD'])
2. Call patchCommitHash(hash) from review-log.mjs
3. Print patched message or silently exit on error

Wrapped in try/catch -- never blocks or fails the commit.

- [ ] **Step 2: 구문 검증**

```bash
node --check C:/Users/exodia/.local/bin/Nava/naba-tools/conveyor/post-commit-patch.mjs
```

- [ ] **Step 3: 커밋**

```bash
git add naba-tools/conveyor/post-commit-patch.mjs
git commit -m "feat: add post-commit hash patcher for conveyor"
```

---

### Task 4: Hook 설치 스크립트

**Files:**
- Create: `Nava/naba-tools/conveyor/install-hook.mjs`

- [ ] **Step 1: install-hook.mjs 작성**

Takes optional argument: target project directory (defaults to cwd).

1. Verify .git exists in target
2. Write pre-commit hook to .git/hooks/pre-commit:
   - Check CONVEYOR_RUNNING env var for re-entry guard
   - Set CONVEYOR_RUNNING=1
   - Call node reviewer-dispatch.mjs (full path)
   - Capture exit code
   - Unset CONVEYOR_RUNNING
   - Exit with captured code
3. Write post-commit hook to .git/hooks/post-commit:
   - Call node post-commit-patch.mjs (full path)
4. Backup existing hooks before overwriting (append .backup)
5. chmod 755 on both hooks (try/catch for Windows)

- [ ] **Step 2: 구문 검증**

```bash
node --check C:/Users/exodia/.local/bin/Nava/naba-tools/conveyor/install-hook.mjs
```

- [ ] **Step 3: 커밋**

```bash
git add naba-tools/conveyor/install-hook.mjs
git commit -m "feat: add conveyor hook installer"
```

---

### Task 5: 통합 테스트

**Files:**
- None (test with existing files)

- [ ] **Step 1: 테스트용 git repo 생성**

```bash
mkdir -p /tmp/conveyor-test
cd /tmp/conveyor-test
git init
echo "const x = 1;" > test.ts
git add test.ts
git commit -m "init"
```

- [ ] **Step 2: hook 설치**

```bash
node C:/Users/exodia/.local/bin/Nava/naba-tools/conveyor/install-hook.mjs /tmp/conveyor-test
```

Expected: pre-commit, post-commit hook installed messages

- [ ] **Step 3: 커밋으로 컨베이어 실행 확인**

```bash
cd /tmp/conveyor-test
echo "const y = 2;" > test2.ts
git add test2.ts
git commit -m "test: conveyor integration"
```

Expected: [CONVEYOR] output, log file created

- [ ] **Step 4: 로그 확인**

Check logs/reviews/ for JSON file with patched commit_hash

- [ ] **Step 5: 정리**

```bash
rm -rf /tmp/conveyor-test
```

- [ ] **Step 6: 최종 커밋**

```bash
cd C:/Users/exodia/.local/bin/Nava
git add -A
git commit -m "feat: complete code quality conveyor v1.0"
```

---

## Summary

| Task | 내용 | 파일 |
|---|---|---|
| 1 | 로그 작성기 | review-log.mjs |
| 2 | 리뷰어 디스패처 | reviewer-dispatch.mjs |
| 3 | post-commit 패치 | post-commit-patch.mjs |
| 4 | Hook 설치 스크립트 | install-hook.mjs |
| 5 | 통합 테스트 | (기존 파일) |
