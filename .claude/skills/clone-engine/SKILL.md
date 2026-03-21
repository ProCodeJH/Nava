---
name: clone-engine
description: |
  AI-Native website cloning engine v2.0 — URL to clean React/Next.js source code.
  Framer/Webflow/Squarespace/Wix to Next.js 15 + Tailwind + Framer Motion.
  Computed styles extraction + AI understanding + feedback loop.
  Triggers: clone, website clone, reverse engineer, framer, webflow, design DNA, copy site,
  클론, 웹사이트 복제, 리버스 엔지니어링, 디자인 DNA, 사이트 따라 만들어,
  이 사이트처럼, 이거 똑같이, 이 디자인 따, 사이트 카피, 웹 클론,
  URL to code, 소스코드로 변환, 내 코드로 만들어
context: fork
agent: general-purpose
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebFetch
---

# CloneEngine v2.0 — AI-Native Web Cloning

**경로**: `C:\Users\exodia\.local\bin\CloneEngine-v2\`

## Usage
```bash
cd C:\Users\exodia\.local\bin\CloneEngine-v2
node cli.mjs clone <url>                    # 기본 클론
node cli.mjs clone <url> --no-headless      # 브라우저 표시
node cli.mjs clone <url> --max-iterations 3 # 피드백 반복
node cli.mjs compare <original> <clone>     # 시각 비교
```

## Pipeline
```
URL → Phase 0 (Stealth Browser)
    → Phase 1 (Framer 섹션 감지 + freeze-dry 추출 + 스크린샷)
    → Phase 2 (AI Vision 시맨틱 분석 + 컴포넌트 트리)
    → Phase 3 (SmartConverter: computed styles → React/Tailwind)
    → Phase 4 (Next.js 15 App Router 조립 + 빌드)
    → Phase 5 (Visual Feedback: pixelmatch 비교 → AI 진단 → 코드 수정 반복)
    → Output: Clean Next.js project (zero platform dependencies)
```

## Core Modules
- `core/orchestrator.mjs` — 메인 파이프라인
- `core/smart-converter.mjs` — computed styles → Tailwind 변환
- `core/visual-feedback.mjs` — Phase 5 피드백 루프
- `core/font-detector.mjs` — Framer 동적 폰트 감지
- `core/asset-collector.mjs` — 이미지/비디오/폰트 자동 다운로드
- `core/nextjs-assembler.mjs` — Next.js 프로젝트 조립
- `ai/` — Claude Vision/LLM 통합 (5개 모듈)
- `modules/v13/` → CloneEngine v13 (85개 모듈 재사용)

## Test
```bash
node test-precise-extract-v2.mjs  # Phase 1 추출 테스트
node rebuild-from-extraction.mjs   # Phase 3 코드 생성 테스트
```
