# Watchdog Conveyor - Design Spec

## Overview
코드 실행 에러, 세션 에러, 빌드 실패를 자동 감지하고 디버깅을 유도하며 로그를 축적하는 감시 컨베이어.
나바 자동화 회로 3단계.

## Architecture: Hook → systemMessage → Claude 자동 디버깅

기존 부품 재활용:
- StopFailure hook (settings.json) — 이미 존재
- telegram-notify.mjs — 이미 존재

신규 추가:
- PostToolUse:Bash 에러 감지 → systemMessage로 디버깅 유도
- 에러 로그 축적 (JSON)

## Trigger Points

### 1. Bash 명령 에러 (PostToolUse:Bash)
```
Bash 명령 실행
  ↓
PostToolUse hook (watchdog.mjs)
  ↓
exit code !== 0 또는 stderr에 에러 패턴 감지
  ├─ 경미한 에러 (warning, deprecation) → 로그만
  └─ 심각한 에러 (crash, ENOENT, EACCES, SyntaxError, TypeError) → systemMessage 주입
      "[WATCHDOG:ERROR] {에러 요약}. 자동으로 원인을 분석하고 수정해라."
  ↓
에러 로그 저장
```

### 2. 세션 에러 (StopFailure) — 기존 hook 보강
```
Claude 세션 에러 발생
  ↓
기존 StopFailure hook → API 에러 감지
  ↓
watchdog-log.mjs로 로그 저장 (추가)
```

### 3. 테스트 실패 감지
```
Bash에서 vitest/playwright/npm test 실행
  ↓
PostToolUse hook이 테스트 명령 감지
  ↓
exit code !== 0 → systemMessage:
  "[WATCHDOG:TEST_FAIL] 테스트 실패. 실패한 테스트를 분석하고 코드를 수정해라.
   수정 후 테스트를 다시 실행해서 통과를 확인해라. 최대 3회 시도."
```

## Components

### 1. watchdog.mjs (PostToolUse:Bash hook)
- 위치: `Nava/naba-tools/conveyor/`
- 입력: stdin에서 hook 데이터 (tool_input.command, tool_output, exit_code)
- 로직:
  1. exit_code 확인 (0이면 즉시 exit)
  2. stderr/stdout에서 에러 패턴 매칭
  3. 테스트 명령인지 판별 (vitest, playwright, npm test, jest)
  4. severity 분류 (critical/warning)
  5. critical이면 systemMessage 출력
  6. 에러 로그 저장
- 출력: { systemMessage: "..." } 또는 빈 출력

### 2. watchdog-log.mjs (에러 로그 작성기)
- 위치: `Nava/naba-tools/conveyor/`
- 로그 위치: `Nava/naba-tools/logs/errors/`
- 포맷: YYYY-MM-DD_HHmmss_error.json

## Error Patterns

### Critical (systemMessage 주입 → 자동 디버깅)
- Exit code !== 0 + stderr 내용 있음
- 패턴: SyntaxError, TypeError, ReferenceError, ENOENT, EACCES, EADDRINUSE
- 패턴: "Cannot find module", "Module not found", "command not found"
- 패턴: "FATAL", "Segmentation fault", "killed"
- 테스트 실패: vitest/playwright/npm test의 비정상 종료

### Warning (로그만, systemMessage 없음)
- 패턴: "warning:", "deprecated", "DeprecationWarning"
- Exit code 0이지만 stderr에 경고

## Log Format

```json
{
  "timestamp": "ISO string",
  "type": "bash_error" | "test_fail" | "session_error",
  "severity": "critical" | "warning",
  "command": "실행한 명령",
  "exit_code": 1,
  "error_message": "에러 요약",
  "stderr_excerpt": "첫 500자",
  "auto_debug": true,
  "project": "현재 디렉토리"
}
```

## Hook Registration

settings.json PostToolUse에 추가:

```json
{
  "matcher": "Bash",
  "hooks": [
    {
      "type": "command",
      "command": "node C:/Users/exodia/.local/bin/Nava/naba-tools/conveyor/watchdog.mjs"
    }
  ]
}
```

## File Structure

```
Nava/naba-tools/
  conveyor/
    watchdog.mjs          # PostToolUse:Bash 에러 감지 hook
    watchdog-log.mjs      # 에러 로그 작성기
  logs/
    errors/               # 에러 로그
```

## Decisions
- Bash 에러만 자동 디버깅 유도 (Claude가 직접 수정 시도)
- 테스트 실패는 최대 3회 자동 재시도 유도
- 경고는 로그만, 개입 안 함
- 기존 StopFailure/telegram-notify 건드리지 않음 (호환성)
