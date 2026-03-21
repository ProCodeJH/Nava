---
name: nava-system
description: |
  Nava system management — Exodia services, SSH, CDP, heartbeat, workflow, queue, full status.
  Triggers: nava, system status, heartbeat, SSH, CDP, queue, workflow, health, uptime, services,
  나바 시스템, 하트비트, 큐, 워크플로우, 시스템 상태, 서비스 상태, 연결 상태,
  살아있어, 돌아가고 있어, 상태 확인, 헬스체크, 점검, 진단
context: inline
allowed-tools: Bash, Read
---

# Nava System Management

## Live System Status
!`node C:/Users/exodia/.local/bin/Nava/Nava/naba-tools/nava.mjs status 2>/dev/null || echo "status unavailable"`

## Unified CLI
All commands via: `node C:/Users/exodia/.local/bin/Nava/Nava/naba-tools/nava.mjs`

## Commands Reference

### System
- `status` — Full system health (services + SSH + CDP)
- `heart --once` — Single heartbeat cycle
- `workflow "instruction"` — 6-stage autonomous pipeline
- `queue add "task"` — Add to task queue
- `eyes` — File watch mode (10s interval)

### CDP (Chrome DevTools Protocol)
- `cdp list` — All CDP targets
- `cdp 9333 run` — Auto-Run on Exodia
- `cdp 9222 snap` — Screenshot Antigravity

### Exodia Services (classroom 100.75.212.102)
| Port | Service | Role |
|------|---------|------|
| 7778 | Screen Service | Vision + input |
| 7779 | Orchestrator | Task coordination |
| 7780 | Brain Bridge | Claude communication |
| 7781 | hide-daemon | Stealth window mgmt |

### Screen Control
- `see --analyze` — OmniParser screen analysis
- `click X Y` — Coordinate click
- `type "text"` — Keyboard input
- `hotkey ctrl c` — Shortcut key
- `hide` / `show` / `arrange` — Window management

### Knowledge
- `think "question"` — Brain Bridge query
- `search "query"` — Tavily web search
- `remember "fact"` — Cognee store
- `recall "query"` — Cognee retrieve

### Obsidian
- `obs daily` — Today's note
- `obs search query="term"` — Search notes
- `obs read file=Name` — Read note
- `obs create name=Name content="text"` — Create note

## Usage
Execute the user's request: $ARGUMENTS
