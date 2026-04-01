# Nava (나바) 🦋

**CTO AI for Jahyeon** — Claude Code 기반 AI 개발 파트너 시스템

## Quick Start

```bash
# 1. Clone
git clone https://github.com/ProCodeJH/Nava.git
cd Nava

# 2. Setup (모든 설정 자동)
node setup.mjs

# 3. 풀 설치 (ai-resources 포함)
node setup.mjs --full

# 4. Claude Code 재시작
# 끝. 이제 평소처럼 쓰면 된다.
```

## What is Nava?

나바는 Claude Code 위에 구축된 AI CTO 시스템이다. 13개 전문 에이전트, 16개 자동 스킬, 19개 커맨드, 39개 플러그인, 7개 MCP 서버를 통합 운용한다.

자현(Jahyeon)이 말만 하면, 나바가 intent를 분석해서 최적의 도구를 자동 선택하고 실행한다.

## Setup이 하는 것

`node setup.mjs` 한 줄이면 자동으로:

| 항목 | 설명 |
|---|---|
| 글로벌 Git Hooks | 모든 git repo에서 커밋 시 자동 코드 리뷰 |
| 컨베이어 B Hook | "만들어" 류 명령 시 자동 파이프라인 실행 |
| 컨베이어 C Hook | Bash 에러 시 자동 디버깅 유도 |
| 플러그인 39개 | settings.json에 자동 활성화 |
| MCP 서버 설정 | config/mcp.json 템플릿 복사 |
| 디렉토리 구조 | logs, instinct 등 런타임 디렉토리 생성 |

`--full` 플래그 추가 시: ai-resources (785 스킬 + 16 에이전트 + 28 템플릿) 자동 clone

## Conveyor System (자동화 회로)

3개 컨베이어가 항상 자동으로 작동한다. 설정 불필요.

### Conveyor A: Code Quality
- **트리거**: `git commit` (모든 프로젝트)
- **동작**: staged 파일을 확장자별 리뷰어(ts-reviewer/py-reviewer/code-reviewer)가 자동 리뷰
- **심각한 이슈**: 자동 수정 후 커밋 진행
- **경미한 이슈**: 터미널에 보고만
- **로그**: `naba-tools/logs/reviews/`

### Conveyor B: Feature Dev
- **트리거**: "만들어", "구현해", "시스템 구축" 등 기능 개발 명령
- **동작**: 키워드로 경량(3단계)/풀(9단계) 자동 판별
  - 경량: 설계 → 구현 → 리뷰+테스트
  - 풀: bkit 9단계 파이프라인
- **체크포인트**: 설계 단계만 사용자 승인 필요
- **로그**: `naba-tools/logs/pipelines/`

### Conveyor C: Watchdog
- **트리거**: Bash 명령 에러 (exit code !== 0)
- **동작**: 에러 패턴 분석 → 심각하면 자동 디버깅 유도
- **테스트 실패**: 최대 3회 자동 재시도 유도
- **로그**: `naba-tools/logs/errors/`

## Structure

```
Nava/
├── setup.mjs                    # 원클릭 세팅 스크립트
├── CLAUDE.md                    # 나바 정체성 + 모든 설정
├── config/
│   └── mcp.json                 # MCP 서버 설정 템플릿
├── .claude/
│   ├── agents/                  # 13개 전문 에이전트
│   ├── skills/                  # 16개 자동 발동 스킬
│   ├── commands/                # 19개 슬래시 커맨드
│   ├── rules/                   # 코딩/시스템 룰
│   └── settings.local.json      # 프로젝트 레벨 설정
├── naba-tools/
│   ├── conveyor/                # 컨베이어 시스템
│   │   ├── reviewer-dispatch.mjs    # A: 코드 리뷰 디스패처
│   │   ├── review-log.mjs           # A: 리뷰 로그 작성기
│   │   ├── post-commit-patch.mjs    # A: commit hash 패치
│   │   ├── install-hook.mjs         # A: hook 설치 (setup.mjs가 대체)
│   │   ├── pipeline-intent.mjs      # B: 기능 개발 intent 감지
│   │   ├── pipeline-state.mjs       # B: 파이프라인 상태 관리
│   │   ├── pipeline-log.mjs         # B: 파이프라인 로그
│   │   ├── watchdog.mjs             # C: 에러 감지
│   │   └── watchdog-log.mjs         # C: 에러 로그
│   ├── hooks/                   # 커스텀 hooks
│   │   ├── telegram-notify.mjs      # 텔레그램 알림
│   │   └── post-compact-save.mjs    # 컨텍스트 압축 기록
│   ├── instinct/                # 학습 시스템
│   │   ├── instinct.json            # 활성 패턴
│   │   └── instinct-engine.mjs      # 패턴 인식 엔진
│   └── logs/                    # 런타임 로그 (gitignored)
│       ├── reviews/
│       ├── pipelines/
│       └── errors/
└── docs/
    ├── specs/                   # 설계 문서
    └── plans/                   # 구현 계획
```

## Agents (13)

| Agent | Model | Role |
|---|---|---|
| ai-engineer | opus | AI 시스템 설계/배포/최적화 |
| debugger | opus | 멀티시스템 버그 추적 |
| security-auditor | opus | 보안 감사, OWASP, 시크릿 스캔 |
| multi-agent-coordinator | opus | 에이전트 간 협업 조율 |
| web-clone-specialist | opus | CloneEngine 15단계 사이트 복제 |
| fullstack-dev | sonnet | React/Next.js/Node.js 풀스택 |
| code-explorer | sonnet | 코드베이스 분석/추적 |
| performance-optimizer | sonnet | 성능 최적화/번들 분석 |
| devops-engineer | sonnet | CI/CD, 인프라, 배포 자동화 |
| mcp-expert | sonnet | MCP 서버 설계/구현 |
| data-engineer | sonnet | DB 설계, 마이그레이션 |
| doc-writer | sonnet | 기술 문서, API 문서, 교재 구조 |
| deployer | — | Vercel 배포 전용 |

## Skills (16) — Auto-triggered

자현이 한국어든 영어든, 구어체든 정식 표현이든 — 나바가 intent 분석 후 최적 스킬을 자동 선택한다.

| Trigger (예시) | Skill |
|---|---|
| "이거 어떻게 돌아가" / "구조 알려줘" | deep-research |
| "버그" / "안돼" / "왜 이래" / "TypeError" | quick-fix |
| "PR 봐줘" / "머지해도 되나" | pr-summary |
| "노트" / "메모" / "적어둬" / "할 일" | obsidian-sync |
| "교재" / "코딩쏙" / "퀴즈" | teach-prep |
| "시각화" / "구조도" / "파일 구조 보여줘" | codebase-viz |
| "스킬 찾아" / "무기고" / "뭐 있어" | ai-arsenal |
| "시스템 상태" / "하트비트" | nava-system |
| "파이프라인" / "새 기능 개발" | bkit-pipeline |
| "화면 봐" / "클릭" / "학원 화면" | exodia-control |
| "클론해" / "사이트 복제" | clone-engine |
| "프로젝트 만들어" / "셋업" | project-init |
| "리팩토링" / "정리해" / "깔끔하게" | refactor |
| "설명해" / "이게 뭐야" / "이해가 안 돼" | explain |
| "모니터링" / "로그 봐" / "프로세스" | monitor |
| "DB" / "스키마" / "쿼리" | data-ops |

## Plugins (39)

### Development
commit-commands, pr-review-toolkit, feature-dev, frontend-design, playground, plugin-dev, agent-sdk-dev, skill-creator, code-simplifier, hookify, ralph-loop

### External Services
supabase, firebase, stripe, slack, linear, asana, gitlab, github, greptile, serena, context7

### LSP (11 languages)
typescript, csharp, clangd, gopls, jdtls, kotlin, lua, php, pyright, rust-analyzer, swift

### Utility
claude-code-setup, claude-md-management, security-guidance, explanatory-output-style, learning-output-style, playwright, superpowers

## MCP Servers

| Server | Use |
|---|---|
| Playwright | Browser automation, screenshots |
| Filesystem | File/directory operations |
| Memory | Knowledge graph |
| Context7 | Library documentation |
| Firebase | Firebase projects |
| Cloudflare | Workers, D1, KV, R2 |
| Vercel | Deployments, domains |

## Environment Variables (Optional)

```bash
TELEGRAM_BOT_TOKEN=xxx    # Telegram 알림
TELEGRAM_CHAT_ID=xxx      # Telegram 채팅 대상
```

## Requirements

- Node.js v24+
- Claude Code CLI
- Git
- Python 3.12+ (일부 MCP 서버용, optional)

## Philosophy

1. **Spec-first** — 코드 전에 반드시 계획
2. **PDCA** — Quick Fix = Do→Check | Feature = Plan→Design→Do→Check→Act
3. **Same mistake twice = incompetence** — 실수는 기록
4. **자현's time is sacred** — 1시간 투자해서 5분 절약
5. **Proactive** — 할 일 없으면 찾아서 한다

## License

Private — ProCodeJH
