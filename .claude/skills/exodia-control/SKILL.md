---
name: exodia-control
description: |
  Exodia classroom infrastructure remote control — screen capture, input,
  window management, Brain Bridge, web search, memory.
  Triggers: exodia, classroom, screen, click, type, hide, arrange, brain bridge, remote,
  엑조디아, 학원, 화면, 클릭, 타이핑, 숨기기, 정리, 학원 컴퓨터, 원격,
  스크린샷, 학원 화면 봐, 모니터, 키보드, 마우스, 창 관리, 윈도우 관리,
  학원에서 뭐 하고 있어, 화면 캡처, 입력해, 눌러
context: inline
allowed-tools: Bash
---

# Exodia Control — Classroom Infrastructure

## Target
Classroom computer via Tailscale VPN (100.75.212.102)

## CLI
`node C:/Users/exodia/.local/bin/Nava/Nava/naba-tools/nava.mjs`

## Vision (OmniParser: YOLO + Florence2)
- `see` — Raw screenshot
- `see --analyze` — AI-analyzed screenshot with element detection

## Input Control
- `click X Y` — Mouse click at coordinates
- `type "text"` — Keyboard typing
- `hotkey ctrl c` — Key combination

## Window Management
- `hide` — Hide all Antigravity windows
- `show` — Restore windows
- `arrange` — Auto-arrange Antigravity windows

## Brain Bridge
- `think "question"` — Send query to Claude via Brain Bridge

## Web Intelligence
- `search "query"` — Tavily web search
- `remember "fact"` — Store in Cognee knowledge base
- `recall "query"` — Retrieve from Cognee

## Instructions
Execute the user's Exodia command: $ARGUMENTS
