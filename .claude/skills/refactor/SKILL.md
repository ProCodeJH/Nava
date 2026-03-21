---
name: refactor
description: |
  Code refactoring — restructure, rename, extract, simplify without changing behavior.
  Triggers: refactor, restructure, rename, extract, simplify, clean up, dry, deduplicate,
  리팩토링, 리팩터, 정리해, 깔끔하게, 중복 제거, 추출, 이름 바꿔, 구조 바꿔,
  코드 정리, 이거 너무 지저분해, 복잡해, 간단하게, 분리해, 모듈화,
  이거 쪼개, 함수 분리, 파일 분리, 컴포넌트 분리, 공통화
context: inline
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Refactor

Restructure code for clarity and maintainability without changing behavior.

## Task
Refactor target: $ARGUMENTS

## Method

### 1. Analyze Current State
- Read the target code
- Identify code smells: duplication, long functions, deep nesting, unclear names
- Map dependencies (who imports/calls this?)

### 2. Plan Refactoring
Choose applicable techniques:
- **Extract Function** — Long function → smaller named pieces
- **Extract Module** — God file → focused modules
- **Rename** — Unclear names → descriptive names
- **Remove Duplication** — DRY principle
- **Simplify Conditionals** — Deep nesting → early returns / guard clauses
- **Inline** — Unnecessary abstractions → direct code

### 3. Execute
- Make changes incrementally
- Verify each step doesn't break behavior
- Run tests between changes if available

### 4. Verify
- Run tests: `npm test` or equivalent
- Verify no regressions
- Check import paths still resolve

## Rules
- NEVER change behavior — refactoring = same output, better structure
- If behavior change needed, that's a feature/fix, not refactoring
- Run bkit phase 2 (convention) check after completion
- Keep commits atomic: one refactoring concept per commit
