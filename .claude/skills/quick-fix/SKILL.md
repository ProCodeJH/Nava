---
name: quick-fix
description: |
  Fast bug fix workflow — diagnose, fix, verify. PDCA Do→Check cycle.
  Triggers: fix, bug, error, crash, broken, exception, fail, wrong, unexpected,
  버그, 수정, 에러, 고장, 안 돼, 안돼, 왜 이래, 터졌어, 오류, 깨졌어,
  동작 안 해, 작동 안 해, 이상해, 문제 있어, 뭐가 잘못됐어, 실패, 에러남,
  undefined, null, NaN, TypeError, 500, 404, CORS, timeout, 무한루프
context: inline
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
hooks:
  PostToolUse:
    - matcher: Edit
      script: |
        echo "Fix applied. Run tests next."
---

# Quick Fix — Do→Check Cycle

Fast bug fix following bkit PDCA methodology.

## Workflow

### 1. Diagnose
- Read the error/bug description: $ARGUMENTS
- Search for related code with Grep
- Identify root cause (not symptoms)
- Check recent git changes if relevant: `git log --oneline -5`

### 2. Fix (Do)
- Make the minimal change that fixes the issue
- Don't refactor surrounding code
- Don't add unrelated improvements

### 3. Verify (Check)
- Run relevant tests: `npm test` or project-specific test command
- If no tests exist, verify the fix manually
- Check for regressions in related code

### 4. Report
```
Fix: [one-line description]
Root cause: [why it broke]
Changed: [files modified]
Verified: [how verified]
```

## Rules
- Minimal diff — touch only what's broken
- No drive-by refactoring
- If fix requires > 50 lines changed, escalate to full pipeline
