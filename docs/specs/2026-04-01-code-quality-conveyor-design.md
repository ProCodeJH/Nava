# Code Quality Conveyor - Design Spec

## Overview
코드 커밋 시 자동으로 리뷰 → 심각 이슈 자동 수정 → 로그 축적하는 컨베이어 벨트.
나바 자동화 회로 1단계.

## Trigger
- **시점**: pre-commit hook (git commit 실행 시)
- **대상**: staged 파일 중 코드 파일만 (.ts, .tsx, .py, .js, .jsx, .mjs, .cjs)

## Pipeline Flow

```
git commit
  ↓
pre-commit hook 발동
  ↓
재진입 체크 (CONVEYOR_RUNNING env var → 이미 실행 중이면 즉시 통과)
  ↓
CONVEYOR_RUNNING=1 설정
  ↓
staged 파일 목록 추출 (git diff --cached --name-only)
  ↓
파일 확장자별 분류 → 리뷰어 그룹핑
  .ts/.tsx/.js/.jsx/.mjs/.cjs → ts-reviewer (배치)
  .py → py-reviewer (배치)
  기타 → code-reviewer (배치)
  ↓
리뷰어 실행 (파일 배치 단위, 타임아웃 60초)
  혼합 언어: 각 리뷰어 순차 실행
  ↓
결과 파싱 → severity 분류
  ├─ critical (버그, 보안, 크래시) → 원본 백업 → 자동 수정 → git add → 계속
  │   수정 실패 시 → 원본 복원 → 이슈 보고 → 커밋 차단
  └─ minor (스타일, 네이밍, 구조 제안) → 터미널 보고만
  ↓
로그 저장 (JSON, commit_hash는 "pending")
  ↓
CONVEYOR_RUNNING 해제
  ↓
커밋 진행 (또는 critical 미수정 시 차단)
  ↓
post-commit hook → 로그의 commit_hash를 실제 해시로 패치
```

## Safety Mechanisms

### 1. 재진입 방지
- `CONVEYOR_RUNNING` 환경 변수로 무한 루프 차단
- auto-fix → git add 시 pre-commit hook 재발동되는 것을 방지

### 2. 원본 백업/복원
- auto-fix 전 대상 파일을 `.conveyor-backup/` 에 복사
- 수정 실패 시 원본 복원 후 backup 삭제
- 수정 성공 시 backup 삭제

### 3. 타임아웃 전략
- 리뷰어 1회 호출: 60초 타임아웃
- 전체 컨베이어: 180초 타임아웃 (3분)
- 타임아웃 초과 → 경고 출력, 커밋 허용 (차단하지 않음)

### 4. 배치 처리
- 파일을 개별이 아닌 언어별 배치로 묶어서 리뷰어 1회 호출
- 10개 파일이든 1개 파일이든 리뷰어 호출 횟수는 언어 수만큼 (최대 3회)

## Components

### 1. pre-commit hook (`conveyor-pre-commit.sh`)
- 위치: 프로젝트별 `.git/hooks/pre-commit` 또는 글로벌 git hooks
- 역할: staged 파일 감지 → reviewer-dispatcher 호출

### 2. reviewer-dispatcher (`reviewer-dispatch.mjs`)
- 위치: `C:\Users\exodia\.local\bin\Nava\naba-tools\conveyor\`
- 역할:
  - staged 파일 목록 받아서 확장자별 분류
  - 적합한 리뷰어 에이전트 선택
  - 리뷰 실행 및 결과 수집

### 3. severity-classifier
- reviewer-dispatch.mjs 내부 함수
- 리뷰 결과에서 severity 추출
- 분류 기준:
  - **critical**: security vulnerability, runtime error, data loss, crash, SQL injection, XSS, unhandled exception
  - **minor**: naming convention, code style, refactoring suggestion, documentation

### 4. auto-fixer
- reviewer-dispatch.mjs 내부 함수
- critical 이슈에 대해 claude CLI로 자동 수정 요청
- 수정 후 해당 파일 git add

### 5. log-writer (`review-log.mjs`)
- 위치: `C:\Users\exodia\.local\bin\Nava\naba-tools\conveyor\`
- 로그 위치: `C:\Users\exodia\.local\bin\Nava\naba-tools\logs\reviews\`
- 파일명: `YYYY-MM-DD_HHmmss.json`

## Log Format

```json
{
  "timestamp": "2026-04-01T14:30:00.000Z",
  "commit_hash": "pending",
  "files_reviewed": ["src/api/auth.ts", "src/utils/validate.ts"],
  "reviewer": "ts-reviewer",
  "duration_ms": 3200,
  "issues": [
    {
      "file": "src/api/auth.ts",
      "line": 42,
      "severity": "critical",
      "category": "security",
      "message": "SQL injection possible in query parameter",
      "auto_fixed": true
    },
    {
      "file": "src/utils/validate.ts",
      "line": 15,
      "severity": "minor",
      "category": "style",
      "message": "Variable name should be camelCase",
      "auto_fixed": false
    }
  ],
  "result": "passed_with_fixes",
  "summary": {
    "total_issues": 2,
    "critical": 1,
    "minor": 1,
    "auto_fixed": 1
  }
}
```

## Terminal Output Format

```
[CONVEYOR] Reviewing 2 files...
[CONVEYOR] ts-reviewer: src/api/auth.ts
  CRITICAL: SQL injection possible (line 42) → AUTO-FIXED
  minor: Variable naming convention (line 15) → reported
[CONVEYOR] Result: PASSED (1 auto-fix, 1 suggestion)
```

## Error Handling
- 리뷰어 타임아웃 (60초/개별, 180초/전체) → 경고 출력, 커밋 허용
- claude CLI 미응답 → 로그에 error 기록, 커밋 허용
- 자동 수정 실패 → 원본 복원 → critical 이슈 보고 → 커밋 차단
- 재진입 감지 → 즉시 exit 0 (커밋 허용)

## File Structure

```
Nava/naba-tools/
├── conveyor/
│   ├── reviewer-dispatch.mjs    # 메인 디스패처
│   ├── review-log.mjs           # 로그 작성기
│   ├── post-commit-patch.mjs    # commit_hash 패치
│   └── install-hook.mjs         # pre-commit/post-commit hook 설치 스크립트
└── logs/
    └── reviews/                 # 리뷰 로그 JSON 파일들
```

## Future (2-3단계 연동)
- 로그 → 대시보드 UI 실시간 표시
- 텔레그램 알림 연동 (기존 telegram-notify.mjs 활용)
- 기능 개발 컨베이어 (B) 연결
- 감시 컨베이어 (C) 연결

## Decisions
- 리뷰어 선택: 파일 확장자 기반 자동 선택 (A)
- 수정 전략: 심각도별 분리 — critical 자동 수정, minor 보고만 (C)
- 트리거: pre-commit hook (B)
- 알림: 터미널 + JSON 로그 (C) — 대시보드 연동 대비
