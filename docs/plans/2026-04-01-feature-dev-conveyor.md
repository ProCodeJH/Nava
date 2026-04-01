# Feature Development Conveyor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 자현의 자연어 명령을 감지해서 경량/풀 파이프라인을 자동 실행하는 기능 개발 컨베이어 구축

**Architecture:** UserPromptSubmit hook이 intent를 감지하고 systemMessage로 Claude에게 지시 주입. 파이프라인 상태는 JSON 파일로 관리. Claude 세션이 실제 실행 주체.

**Tech Stack:** Node.js v24 (ESM), Claude Code hooks (systemMessage), JSON state file

**Spec:** `docs/specs/2026-04-01-feature-dev-conveyor-design.md`

---

## File Structure

```
Nava/naba-tools/conveyor/
  pipeline-state.mjs     -- 상태 파일 CRUD (getState, createState, updatePhase, etc.)
  pipeline-log.mjs       -- 파이프라인 로그 작성
  pipeline-intent.mjs    -- UserPromptSubmit hook (트리거+상태 라우팅)
```

---

### Task 1: 파이프라인 상태 관리 (pipeline-state.mjs)

**Files:**
- Create: `Nava/naba-tools/conveyor/pipeline-state.mjs`
- Create: `Nava/naba-tools/logs/pipelines/.gitkeep`

- [ ] **Step 1: logs/pipelines 디렉토리 생성**

```bash
mkdir -p C:/Users/exodia/.local/bin/Nava/naba-tools/logs/pipelines
touch C:/Users/exodia/.local/bin/Nava/naba-tools/logs/pipelines/.gitkeep
```

- [ ] **Step 2: pipeline-state.mjs 작성**

ESM 모듈. 상태 파일 경로: join(import.meta.dirname, '.pipeline-state.json')

Exported functions:

```
getState() -> object | null
  - .pipeline-state.json 읽기, 없으면 null
  - JSON 파싱 실패 시 파일 삭제하고 null (손상 복구)

createState(type, input) -> object
  - pipeline_id: crypto.randomUUID()
  - type: "light" | "full"
  - input: 자현 원본 명령
  - current_phase: "design"
  - status: "running"
  - created_at: new Date().toISOString()
  - phases: { design: { status: "in_progress" } }
  - 파일에 저장

updatePhase(phaseName, phaseStatus, extra) -> object
  - phases[phaseName].status = phaseStatus
  - extra 필드 머지 (duration_ms 등)
  - current_phase 업데이트
  - 파일에 저장

setAwaitingApproval() -> object
  - status = "awaiting_approval"
  - 파일에 저장

setApproved() -> object
  - status = "running"
  - phases.design.approved = true
  - current_phase를 다음 단계로 (light: "implement", full: 다음 phase)
  - 파일에 저장

complete() -> object
  - status = "completed"
  - 상태 파일 삭제
  - 반환: 최종 state (로그용)

cancel() -> void
  - 상태 파일 삭제
```

- [ ] **Step 3: 구문 검증 + 인라인 테스트**

```bash
node --check conveyor/pipeline-state.mjs
```

createState -> getState -> setAwaitingApproval -> setApproved -> complete 순서 테스트

- [ ] **Step 4: 커밋**

```bash
git add naba-tools/conveyor/pipeline-state.mjs naba-tools/logs/pipelines/.gitkeep
git commit -m "feat: add pipeline state manager for feature dev conveyor"
```

---

### Task 2: 파이프라인 로그 작성기 (pipeline-log.mjs)

**Files:**
- Create: `Nava/naba-tools/conveyor/pipeline-log.mjs`

- [ ] **Step 1: pipeline-log.mjs 작성**

review-log.mjs와 동일 패턴. LOGS_DIR = join(import.meta.dirname, '..', 'logs', 'pipelines')

Exported function:

```
savePipelineLog(state) -> filepath
  - state 객체를 받아 JSON 파일로 저장
  - 파일명: YYYY-MM-DD_HHmmss_pipeline.json
  - total_duration_ms 계산 (now - created_at)
  - 저장하고 경로 반환
```

- [ ] **Step 2: 구문 검증**

```bash
node --check conveyor/pipeline-log.mjs
```

- [ ] **Step 3: 커밋**

```bash
git add naba-tools/conveyor/pipeline-log.mjs
git commit -m "feat: add pipeline log writer for feature dev conveyor"
```

---

### Task 3: Intent Detector Hook (pipeline-intent.mjs)

**Files:**
- Create: `Nava/naba-tools/conveyor/pipeline-intent.mjs`

- [ ] **Step 1: pipeline-intent.mjs 작성**

UserPromptSubmit hook script. stdin에서 hook 데이터를 받아서 처리.

입력 형식 (stdin JSON):
```json
{
  "hook_event": "UserPromptSubmit",
  "user_prompt": "결제 시스템 만들어"
}
```

Main logic:

```
1. stdin에서 JSON 파싱 -> user_prompt 추출
2. getState() 호출

3. if (state === null):
   - 기능 개발 키워드 검사
   - 매칭 안 되면 -> exit 0 (빈 출력, passthrough)
   - 매칭 되면 -> classifySize(prompt) -> createState(size, prompt)
   - stdout에 systemMessage 출력:
     "[PIPELINE:STARTED] type={size} input='{prompt}'
      Phase 1: Design
      이 요청에 대한 구현 계획을 작성해라.
      - type이 light면: brainstorming 스킬로 간단히 설계
      - type이 full이면: 9단계 파이프라인 설계
      계획 작성 후 자현에게 제시하고 승인을 받아라."

4. if (state.status === "awaiting_approval"):
   - 승인 키워드 검사 ("좋아", "진행", "해", "응", "ㅇㅇ", "go", "ok", "yes")
   - 취소 키워드 검사 ("취소", "중단", "그만", "cancel", "stop")
   - 승인 -> setApproved() -> systemMessage:
     "[PIPELINE:APPROVED] Phase 2: Implement
      승인된 설계에 따라 구현을 시작해라.
      서브에이전트를 활용해서 태스크별로 구현하고,
      완료 후 Phase 3(리뷰+테스트)를 병렬로 실행해라."
   - 취소 -> cancel() -> systemMessage:
     "[PIPELINE:CANCELLED] 파이프라인 취소됨."
   - 둘 다 아님 -> systemMessage:
     "[PIPELINE:REVISION] 자현이 피드백을 줬다. 설계를 수정해라.
      수정 후 다시 자현에게 제시하고 승인을 받아라."

5. if (state.status === "running"):
   - systemMessage:
     "[PIPELINE:CONTEXT] 파이프라인 진행 중 (phase: {current_phase}).
      자현의 입력에 대응하되, 파이프라인을 이어서 진행해라."
```

키워드 정의 (모듈 상단 상수):

```javascript
const FEATURE_KEYWORDS = /만들어|추가해|구현해|개발해|기능\s|시스템|구축|페이지\s*만들|build|create|implement|add\s*feature|develop/i;

const FULL_SIGNALS = /시스템|구축|처음부터|파이프라인|아키텍처|전체|완전한|풀스택|full.?stack|database|인증|auth/i;

const APPROVE_KEYWORDS = /^(좋아|진행|진행해|해|응|ㅇㅇ|ㅇ|go|ok|yes|승인|괜찮|됐어|좋|ㄱ|ㄱㄱ)$/i;

const CANCEL_KEYWORDS = /^(취소|중단|그만|cancel|stop|멈춰|아니|안해)$/i;

const BUG_KEYWORDS = /고쳐|에러|안돼|안\s*되|왜\s*이래|터졌|버그|fix|error|bug|crash/i;
```

크기 판별:
```javascript
function classifySize(prompt) {
  if (FULL_SIGNALS.test(prompt)) return "full";
  return "light";
}
```

비기능 개발 판별: BUG_KEYWORDS에 매칭되면 passthrough.
기능 키워드와 버그 키워드 둘 다 매칭되면 -> passthrough (버그 우선).

- [ ] **Step 2: 구문 검증**

```bash
node --check conveyor/pipeline-intent.mjs
```

- [ ] **Step 3: 키워드 매칭 테스트**

여러 입력으로 테스트:
- "결제 시스템 만들어" -> STARTED, full
- "버튼 추가해" -> STARTED, light
- "버그 고쳐" -> passthrough
- "이게 뭐야" -> passthrough

echo로 stdin 주입해서 테스트:
```bash
echo '{"hook_event":"UserPromptSubmit","user_prompt":"결제 시스템 만들어"}' | node conveyor/pipeline-intent.mjs
```

- [ ] **Step 4: 커밋**

```bash
git add naba-tools/conveyor/pipeline-intent.mjs
git commit -m "feat: add pipeline intent detector hook"
```

---

### Task 4: Hook 등록 + 통합 테스트

**Files:**
- Modify: `~/.claude/settings.json` (UserPromptSubmit hook 추가)

- [ ] **Step 1: settings.json에 hook 등록**

UserPromptSubmit 섹션에 pipeline-intent.mjs 추가.
기존 UserPromptSubmit hook이 있으면 배열에 추가, 없으면 새로 생성.

```json
"UserPromptSubmit": [
  {
    "matcher": "",
    "hooks": [
      {
        "type": "command",
        "command": "node C:/Users/exodia/.local/bin/Nava/naba-tools/conveyor/pipeline-intent.mjs"
      }
    ]
  }
]
```

- [ ] **Step 2: 상태 파일 라이프사이클 테스트**

```bash
# 1. 파이프라인 시작
echo '{"hook_event":"UserPromptSubmit","user_prompt":"로그인 페이지 만들어"}' | node conveyor/pipeline-intent.mjs
# -> STARTED 출력, .pipeline-state.json 생성 확인

# 2. 승인 대기 상태로 변경 (수동)
node -e "import {setAwaitingApproval} from './conveyor/pipeline-state.mjs'; setAwaitingApproval();"

# 3. 승인
echo '{"hook_event":"UserPromptSubmit","user_prompt":"응"}' | node conveyor/pipeline-intent.mjs
# -> APPROVED 출력

# 4. 진행 중 다른 입력
echo '{"hook_event":"UserPromptSubmit","user_prompt":"저 파일 뭐였지?"}' | node conveyor/pipeline-intent.mjs
# -> CONTEXT 출력

# 5. 정리
node -e "import {cancel} from './conveyor/pipeline-state.mjs'; cancel();"
```

- [ ] **Step 3: 커밋**

```bash
git add -A
git commit -m "feat: register pipeline intent hook and complete feature dev conveyor"
```

---

## Summary

| Task | 내용 | 파일 |
|---|---|---|
| 1 | 상태 관리 | pipeline-state.mjs |
| 2 | 로그 작성기 | pipeline-log.mjs |
| 3 | Intent Detector Hook | pipeline-intent.mjs |
| 4 | Hook 등록 + 통합 테스트 | settings.json 수정 |
