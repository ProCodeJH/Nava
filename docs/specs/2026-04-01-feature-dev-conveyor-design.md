# Feature Development Conveyor - Design Spec v2

## Overview
자현의 자연어 명령을 감지해서 경량(3단계) 또는 풀(9단계) 파이프라인을 자동 실행하는 컨베이어.
나바 자동화 회로 2단계.

## Architecture: Hook + systemMessage + State File

핵심 원칙: **hook은 트리거만, Claude 세션이 실행, 상태는 파일로 관리.**

```
자현 입력
  |
UserPromptSubmit hook (pipeline-intent.mjs)
  |-- intent 감지 --> systemMessage로 Claude에게 지시 주입
  |-- 파이프라인 진행 중 --> 상태 파일 확인, 현재 단계 지시 주입
  |-- 기타 --> 빈 출력 (passthrough)
  |
Claude 세션이 systemMessage를 받아서 실제 실행
  |
각 단계 완료 시 상태 파일 업데이트
```

## State Machine

파이프라인 상태는 JSON 파일로 관리:
- 위치: `Nava/naba-tools/conveyor/.pipeline-state.json`
- 파이프라인이 없으면 파일 없음
- 파이프라인 시작 시 생성, 완료/취소 시 삭제

```json
{
  "pipeline_id": "uuid",
  "type": "light" | "full",
  "current_phase": "design" | "implement" | "verify",
  "status": "running" | "awaiting_approval" | "completed" | "failed",
  "input": "자현의 원본 명령",
  "created_at": "ISO string",
  "phases": {
    "design": { "status": "completed", "approved": true },
    "implement": { "status": "in_progress" },
    "verify": { "status": "pending" }
  }
}
```

## Trigger Flow

### 1. 첫 입력: Intent Detection

```
자현: "결제 시스템 만들어"
  |
hook (pipeline-intent.mjs):
  1. .pipeline-state.json 존재 확인 -> 없음
  2. 입력 텍스트에서 기능 개발 키워드 검사
  3. 키워드 매칭 -> 크기 판별 (키워드 기반 1차)
  4. 상태 파일 생성 (status: "running", current_phase: "design")
  5. systemMessage 반환:
     "[PIPELINE:STARTED] type=light|full input='결제 시스템 만들어'
      Phase 1: Design - 구현 계획을 작성하고 자현에게 제시해라.
      설계 완료 후 자현 승인을 받아라. 승인 받으면 Phase 2로 진행."
```

### 2. 파이프라인 진행 중 입력

```
자현: "좋아 진행해" (설계 승인)
  |
hook (pipeline-intent.mjs):
  1. .pipeline-state.json 존재 확인 -> 있음 (status: "awaiting_approval")
  2. 입력이 승인인지 판별 ("좋아", "진행", "ㅇㅇ", "응", "해", "go", "ok")
  3. 상태 파일 업데이트 (design.approved=true, current_phase="implement")
  4. systemMessage 반환:
     "[PIPELINE:APPROVED] Phase 2: Implement - 설계에 따라 구현을 시작해라.
      서브에이전트를 사용해서 태스크별로 구현하고, 완료 후 Phase 3으로."
```

```
자현: "이건 아닌데" (설계 거부)
  |
hook:
  1. 승인 아님 -> 상태 유지 (awaiting_approval)
  2. systemMessage 반환:
     "[PIPELINE:REVISION] 자현이 설계를 수정 요청했다. 피드백을 반영해서 재설계해라."
```

### 3. 파이프라인 진행 중 비관련 입력

```
자현: "저거 파일 뭐였지?" (파이프라인 무관)
  |
hook:
  1. .pipeline-state.json 존재 확인 -> 있음 (status: "running")
  2. 입력이 승인/거부가 아닌 일반 질문
  3. systemMessage 반환:
     "[PIPELINE:CONTEXT] 파이프라인 진행 중 (Phase: implement).
      자현의 질문에 답하되, 파이프라인을 이어서 진행해라."
```

## Intent Detection Keywords

기능 개발 키워드:
- 한국어: "만들어", "추가해", "구현해", "개발해", "기능", "시스템", "구축", "페이지 만들어"
- 영어: "build", "create", "implement", "add feature", "develop"

비기능 개발 (passthrough):
- 버그: "고쳐", "에러", "안돼", "왜 이래"
- 질문: "설명해", "뭐야", "어떻게"
- 리뷰: "봐줘", "리뷰해"
- 기타: "커밋", "배포", "삭제"

승인 키워드:
- "좋아", "진행해", "해", "응", "ㅇㅇ", "ㅇ", "go", "ok", "yes", "승인", "진행"

## Size Classification

키워드 1차 판별 (hook 안에서 즉시 실행):

경량 신호:
- "버튼 추가", "필드 추가", "컴포넌트 수정", "스타일 변경"
- 단일 파일/컴포넌트 언급
- "간단한", "작은", "빠르게"

풀 신호:
- "시스템", "구축", "처음부터", "파이프라인", "아키텍처"
- DB, API, 인증 등 인프라 키워드
- "전체", "완전한", "풀스택"
- 여러 페이지/모듈 언급

나바 분석 보정 (Claude 세션에서 실행):
- systemMessage에 1차 판별 결과 포함
- Claude가 코드베이스 스캔 후 보정 판단
- 보정 시 상태 파일의 type 업데이트

## Pipeline Execution (Claude 세션이 실행)

### 경량 파이프라인 (3단계)

```
Phase 1: Design (설계)
  - Claude가 brainstorming 스킬 사용
  - 구현 계획 작성
  - 자현에게 설계 제시
  - 상태 파일: status="awaiting_approval"
  - 자현 승인 시 Phase 2로 (hook이 승인 감지)

Phase 2: Implement (구현)
  - Claude가 subagent-driven-development 스킬 사용
  - 태스크별 서브에이전트 디스패치
  - 구현 완료 시 상태 파일 업데이트
  - 자동으로 Phase 3 진입

Phase 3: Verify (검증) -- 병렬
  - Branch A: 코드 리뷰 (ts-reviewer/py-reviewer/code-reviewer 에이전트)
  - Branch B: 테스트 실행 (vitest/playwright, 프로젝트에 테스트 있을 때만)
  - 실패 시 자동 수정 시도 (최대 2회)
  - 최종 결과 보고
  - 상태 파일: status="completed", 파일 삭제
```

### 풀 파이프라인 (9단계)

```
Phase 1-4: 설계 단계 (Claude가 순차 실행)
  - 스키마, 컨벤션, 목업, API 순서로
  - 각 단계 결과를 누적

Phase 5: Design checkpoint
  - 자현에게 전체 설계 제시
  - 상태 파일: status="awaiting_approval"
  - 승인 시 Phase 6으로

Phase 6-7: 구현 (Claude가 순차 실행)
  - UI 구현, SEO 적용

Phase 8: Review
  - 코드 리뷰어 에이전트 실행

Phase 9: Deploy
  - 빌드 검증
  - 배포 스킬 호출 (자현 확인 후)

완료: 상태 파일 삭제
```

## Components

### 1. pipeline-intent.mjs (UserPromptSubmit hook)
- 위치: `Nava/naba-tools/conveyor/`
- 역할: 모든 자현 입력을 가로채서 파이프라인 상태에 따라 적절한 systemMessage 주입
- 입력: stdin으로 hook 데이터 (user_prompt 포함)
- 출력: { systemMessage: "..." } 또는 빈 출력
- 로직:
  1. .pipeline-state.json 읽기
  2. 상태 없음 + 기능 개발 키워드 -> 파이프라인 시작
  3. 상태 있음 + awaiting_approval -> 승인/거부 판별
  4. 상태 있음 + running -> 컨텍스트 주입
  5. 상태 없음 + 비기능 키워드 -> passthrough

### 2. pipeline-state.mjs (상태 관리 유틸리티)
- 위치: `Nava/naba-tools/conveyor/`
- 역할: 상태 파일 CRUD
- 함수:
  - getState() -> state object 또는 null
  - createState(type, input) -> state object 생성
  - updatePhase(phase, status) -> 단계 업데이트
  - setAwaitingApproval() -> 승인 대기 상태
  - setApproved() -> 승인됨, 다음 단계로
  - complete() -> 상태 파일 삭제 + 로그 저장
  - cancel() -> 상태 파일 삭제

### 3. pipeline-log.mjs (로그 작성기)
- 위치: `Nava/naba-tools/conveyor/`
- 역할: 파이프라인 완료 시 결과 로그 저장
- 로그 위치: `Nava/naba-tools/logs/pipelines/`
- review-log.mjs와 동일한 패턴

## Hook Registration

settings.json의 UserPromptSubmit에 추가:

```json
{
  "matcher": "",
  "hooks": [
    {
      "type": "command",
      "command": "node C:/Users/exodia/.local/bin/Nava/naba-tools/conveyor/pipeline-intent.mjs"
    }
  ]
}
```

## Log Format

```json
{
  "timestamp": "ISO string",
  "pipeline_id": "uuid",
  "type": "light" | "full",
  "input": "자현의 원본 명령",
  "phases": [
    {
      "name": "design",
      "status": "completed",
      "duration_ms": 45000,
      "approved": true
    },
    {
      "name": "implement",
      "status": "completed",
      "duration_ms": 120000,
      "tasks_completed": 5
    },
    {
      "name": "verify",
      "status": "completed",
      "duration_ms": 30000,
      "review_issues": 2,
      "tests_passed": true
    }
  ],
  "result": "completed" | "failed" | "cancelled",
  "total_duration_ms": 195000
}
```

## Error Handling
- hook(pipeline-intent.mjs) 실패 -> passthrough (기존 동작 유지, 절대 차단 안 함)
- 상태 파일 손상 -> 삭제하고 passthrough
- 파이프라인 단계 실패 -> Claude가 에러 보고, 자현에게 선택지 제시
- 파이프라인 중단 -> 자현이 "중단", "취소" 말하면 hook이 감지, 상태 파일 삭제

## File Structure

```
Nava/naba-tools/
  conveyor/
    pipeline-intent.mjs       # UserPromptSubmit hook (트리거+상태 라우팅)
    pipeline-state.mjs         # 상태 파일 CRUD
    pipeline-log.mjs           # 파이프라인 로그 작성
    reviewer-dispatch.mjs      # (기존) 코드 품질 컨베이어
    review-log.mjs             # (기존) 리뷰 로그
    post-commit-patch.mjs      # (기존) 해시 패치
    install-hook.mjs           # (기존) hook 설치
    .pipeline-state.json       # (런타임) 현재 파이프라인 상태
  logs/
    reviews/                   # (기존) 리뷰 로그
    pipelines/                 # 파이프라인 로그
```

## Decisions
- 실행 주체: Claude 세션 (hook은 systemMessage 주입만)
- 상태 관리: 파일 기반 state machine (.pipeline-state.json)
- 트리거: UserPromptSubmit hook
- 크기 판별: 키워드 1차 + Claude 보정
- 체크포인트: 설계 단계만 자현 확인
- 경량 구성: 설계 -> 구현 -> 리뷰+테스트 병렬
- 풀 모드: Claude가 bkit 스킬 체계 활용하여 9단계 순차 실행
