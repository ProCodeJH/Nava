# Nava (나바) 🦋

**CTO AI for Jahyeon** — Claude Code 기반 AI 개발 파트너 시스템

## What is Nava?

나바는 Claude Code 위에 구축된 AI CTO 시스템이다. 13개 전문 에이전트, 16개 자동 스킬, 19개 커맨드, 6개 룰, 5개 아웃풋 스타일, 42개 플러그인, 7개 MCP 서버를 통합 운용한다.

자현(Jahyeon)이 말만 하면, 나바가 intent를 분석해서 최적의 도구를 자동 선택하고 실행한다.

## Structure

```
Nava/
├── CLAUDE.md                    # 메인 인스트럭션 (나바 정체성 + 모든 설정)
├── .claude/
│   ├── agents/                  # 13개 전문 에이전트
│   │   ├── ai-engineer.md       #   AI 시스템 설계/배포/최적화
│   │   ├── code-explorer.md     #   코드베이스 분석/추적
│   │   ├── data-engineer.md     #   DB 설계, 마이그레이션
│   │   ├── debugger.md          #   멀티시스템 버그 추적
│   │   ├── deployer.md          #   Vercel 배포 전용
│   │   ├── devops-engineer.md   #   CI/CD, 인프라, 배포
│   │   ├── doc-writer.md        #   기술 문서, API 문서
│   │   ├── fullstack-dev.md     #   React/Next.js/Node.js 풀스택
│   │   ├── mcp-expert.md        #   MCP 서버 설계/구현
│   │   ├── multi-agent-coordinator.md  # 에이전트 간 협업 조율
│   │   ├── performance-optimizer.md    # 성능 최적화/번들 분석
│   │   ├── security-auditor.md  #   보안 감사, OWASP
│   │   └── web-clone-specialist.md     # CloneEngine 사이트 복제
│   ├── skills/                  # 16개 자동 발동 스킬
│   │   ├── ai-arsenal/          #   785 스킬 검색/브라우즈
│   │   ├── bkit-pipeline/       #   9단계 PDCA 개발 파이프라인
│   │   ├── clone-engine/        #   AI-Native 웹 클로닝
│   │   ├── codebase-viz/        #   프로젝트 구조 시각화
│   │   ├── data-ops/            #   DB/데이터 파이프라인
│   │   ├── deep-research/       #   코드베이스 심층 분석
│   │   ├── exodia-control/      #   학원 원격 제어
│   │   ├── explain/             #   코드/개념 설명
│   │   ├── monitor/             #   프로세스/로그 모니터링
│   │   ├── nava-system/         #   시스템 상태 관리
│   │   ├── obsidian-sync/       #   Obsidian 노트 연동
│   │   ├── pr-summary/          #   PR 요약/리뷰
│   │   ├── project-init/        #   프로젝트 초기화
│   │   ├── quick-fix/           #   빠른 버그 수정
│   │   ├── refactor/            #   코드 리팩토링
│   │   └── teach-prep/          #   교재 제작 (코딩쏙)
│   ├── commands/                # 19개 슬래시 커맨드
│   ├── rules/                   # 6개 코딩/시스템 룰
│   ├── output-styles/           # 5개 아웃풋 스타일
│   └── settings.local.json     # 프로젝트 레벨 설정 (permissions, hooks)
├── config/
│   └── global-settings.json     # 글로벌 설정 (hooks, 42개 plugins)
└── exodia-setup/                # Exodia 학원 서비스 부팅 스크립트
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

## Plugins (42)

### Development
commit-commands, pr-review-toolkit, feature-dev, frontend-design, playground, plugin-dev, agent-sdk-dev, skill-creator, code-simplifier, hookify, ralph-loop

### External Services
supabase, firebase, stripe, slack, linear, asana, gitlab, github, greptile, serena, context7

### LSP (11 languages)
typescript, csharp, clangd, gopls, jdtls, kotlin, lua, php, pyright, rust-analyzer, swift

### Utility
claude-code-setup, claude-md-management, security-guidance, explanatory-output-style, learning-output-style, playwright

## MCP Servers (7)

| Server | Use |
|---|---|
| Playwright | Browser automation, screenshots |
| Filesystem | File/directory operations |
| Memory | Knowledge graph |
| Context7 | Library documentation |
| Firebase | Firebase projects |
| Cloudflare | Workers, D1, KV, R2 |
| Vercel | Deployments, domains |

## Hooks

### Global (settings.json)
- **PreToolUse:Bash** — Destructive command blocker (`rm -rf /`, `format`, `del /s`)
- **PostToolUse:Write|Edit** — Hardcoded secret detector

### Project-level (settings.local.json)
- **SessionStart** — Exodia 서비스 자동 부팅
- **PreToolUse:Bash** — Destructive command warning (prompt-based)
- **PreToolUse:Write|Edit** — Secret/path validation (prompt-based)
- **PostToolUse:Write** — TODO/console.log/import check (prompt-based)
- **Stop** — Task completion verification (prompt-based)

## Tech Stack

- **Runtime**: Node.js v24, Python 3.12
- **AI**: Claude Opus 4.6 (primary), Gemini Flash (fallback)
- **Desktop**: pyautogui, Win32 API, CDP, Puppeteer, Playwright
- **Vision**: OmniParser (YOLO+Florence2), EasyOCR
- **Network**: Tailscale VPN, SSH
- **Infra**: Telegram Bot API, Supabase, Vercel, Cloudflare Workers

## Philosophy

1. **Spec-first** — 코드 전에 반드시 계획
2. **PDCA** — Quick Fix = Do→Check | Feature = Plan→Design→Do→Check→Act
3. **Same mistake twice = incompetence** — 실수는 MEMORY.md에 기록
4. **자현's time is sacred** — 1시간 투자해서 5분 절약
5. **Proactive** — 할 일 없으면 찾아서 한다
