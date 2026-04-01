# Nava Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 나바 컨베이어 시스템의 실시간 모니터링 대시보드 — JSON 로그 기반, Aurora+Neon 테마

**Architecture:** Next.js 15 App Router로 단일 대시보드 페이지 구축. API Route가 conveyor 로그 JSON을 읽어서 데이터 제공. 프론트에서 motion + auto-animate로 애니메이션. 확정된 테마(Aurora 팔레트 + Neon 글로우) 적용.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, motion (Framer Motion), auto-animate, Inter font

---

## File Structure

```
Nava/dashboard/
  package.json
  next.config.ts
  tailwind.config.ts
  tsconfig.json
  app/
    layout.tsx              -- Root layout (Inter font, global styles)
    page.tsx                -- Main dashboard page (assembles all sections)
    globals.css             -- Tailwind + custom theme CSS variables
    api/
      logs/route.ts         -- GET /api/logs — reads JSON logs, returns unified data
  components/
    nav-bar.tsx             -- Top nav (🦋 NAVA · 자현 › 나바 ● ALL OK)
    conveyor-leads.tsx      -- 3 summary cards (Code Quality / Feature Dev / Watchdog)
    conveyor-lane-quality.tsx   -- Code Quality lane (review history bar)
    conveyor-lane-feature.tsx   -- Feature Dev lane (pipeline flow)
    conveyor-lane-watchdog.tsx  -- Watchdog lane (error status)
    activity-feed.tsx       -- Live activity timeline
    arsenal-grid.tsx        -- Frontend Arsenal 18 weapons grid
    stats-bar.tsx           -- Bottom stats (Agents/Skills/MCP/Health)
  lib/
    read-logs.ts            -- Read JSON files from conveyor logs directories
    types.ts                -- TypeScript types for log data
```

---

### Task 1: Next.js 프로젝트 생성 + 기본 설정

**Files:**
- Create: `Nava/dashboard/` (전체 프로젝트)

- [ ] **Step 1: Next.js 프로젝트 생성**

```bash
cd C:/Users/exodia/.local/bin/Nava
npx create-next-app@latest dashboard --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --turbopack --yes
```

- [ ] **Step 2: 추가 패키지 설치**

```bash
cd C:/Users/exodia/.local/bin/Nava/dashboard
npm install motion @formkit/auto-animate
```

- [ ] **Step 3: globals.css에 테마 변수 추가**

Aurora+Neon 테마 CSS 변수:
- --bg-primary: #050510
- --bg-card: rgba(255,255,255,0.02)
- --border-card: rgba(255,255,255,0.04)
- --color-emerald: #34d399 (Code Quality)
- --color-cyan: #06b6d4 (Feature Dev)
- --color-pink: #f472b6 (Watchdog)
- --color-purple: #8b5cf6 (Nava)
- Inter font import

- [ ] **Step 4: layout.tsx 수정**

Inter font 적용, body에 bg-primary + antialiased

- [ ] **Step 5: 빌드 확인**

```bash
npm run build
```

- [ ] **Step 6: 커밋**

```bash
git add dashboard/
git commit -m "feat: scaffold nava dashboard with Next.js 15 + Tailwind + motion"
```

---

### Task 2: 타입 정의 + 로그 읽기 유틸리티

**Files:**
- Create: `dashboard/lib/types.ts`
- Create: `dashboard/lib/read-logs.ts`

- [ ] **Step 1: types.ts 작성**

```typescript
// Review log (Conveyor A)
export interface ReviewLog {
  timestamp: string;
  commit_hash: string;
  files_reviewed: string[];
  reviewers_used: string[];
  duration_ms: number;
  issues: ReviewIssue[];
  result: string;
  summary: { total_issues: number; critical: number; minor: number; auto_fixed: number };
}

export interface ReviewIssue {
  file: string;
  line: number | null;
  severity: 'critical' | 'minor';
  category?: string;
  message: string;
  auto_fixed?: boolean;
}

// Pipeline log (Conveyor B)
export interface PipelineLog {
  timestamp: string;
  pipeline_id: string;
  type: 'light' | 'full';
  input: string;
  phases: PipelinePhase[];
  result: string;
  total_duration_ms: number;
}

export interface PipelinePhase {
  name: string;
  status: string;
  duration_ms?: number;
}

// Error log (Conveyor C)
export interface ErrorLog {
  timestamp: string;
  type: 'bash_error' | 'test_fail' | 'session_error';
  severity: 'critical' | 'warning';
  command: string;
  exit_code: number;
  error_message: string;
  auto_debug: boolean;
}

// Unified activity item
export interface ActivityItem {
  timestamp: string;
  conveyor: 'A' | 'B' | 'C';
  message: string;
  status: 'success' | 'error' | 'running' | 'info';
}

// Dashboard data
export interface DashboardData {
  reviews: ReviewLog[];
  pipelines: PipelineLog[];
  errors: ErrorLog[];
  activity: ActivityItem[];
  stats: {
    totalReviews: number;
    autoFixed: number;
    activePipelines: number;
    totalErrors: number;
    resolvedErrors: number;
  };
}
```

- [ ] **Step 2: read-logs.ts 작성**

```typescript
// Reads JSON files from Nava/naba-tools/logs/ directories
// Returns parsed DashboardData

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Absolute path — not relative to cwd
const LOGS_BASE = 'C:/Users/exodia/.local/bin/Nava/naba-tools/logs';
// 3 directories: reviews/, pipelines/, errors/
// If dir doesn't exist, return empty array (graceful fallback)
```

Functions:
- readJsonDir(dir) -> reads all .json files, parses, returns array sorted by timestamp desc
- getReviews() -> readJsonDir('reviews')
- getPipelines() -> readJsonDir('pipelines')
- getErrors() -> readJsonDir('errors')
- buildActivity(reviews, pipelines, errors) -> merges into ActivityItem[] sorted by time
- getDashboardData() -> combines all, returns DashboardData

- [ ] **Step 3: 구문 검증**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: 커밋**

```bash
git add dashboard/lib/
git commit -m "feat: add log types and reader utility"
```

---

### Task 3: API Route

**Files:**
- Create: `dashboard/app/api/logs/route.ts`

- [ ] **Step 1: route.ts 작성**

```typescript
// GET /api/logs
// Returns DashboardData JSON
// Reads from filesystem (server-side only)

import { NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/read-logs';

export const dynamic = 'force-dynamic'; // no cache

export async function GET() {
  const data = getDashboardData();
  return NextResponse.json(data);
}
```

- [ ] **Step 2: 로컬 테스트**

```bash
npm run dev
# 브라우저에서 http://localhost:3000/api/logs 확인
```

Expected: JSON with reviews, pipelines, errors, activity, stats

- [ ] **Step 3: 커밋**

```bash
git add dashboard/app/api/
git commit -m "feat: add logs API route"
```

---

### Task 4: UI 컴포넌트 — NavBar + ConveyorLeads + StatsBar

**Files:**
- Create: `dashboard/components/nav-bar.tsx`
- Create: `dashboard/components/conveyor-leads.tsx`
- Create: `dashboard/components/stats-bar.tsx`

- [ ] **Step 1: nav-bar.tsx 작성**

확정 디자인 그대로:
- 🦋 NAVA · 자현 › 나바 ● (glow dot)
- 우측: ALL OK + 시간
- gradient 로고 배경, Inter font

- [ ] **Step 2: conveyor-leads.tsx 작성**

3개 요약 카드 (props로 stats 받음):
- Code Quality: emerald, review count + auto-fixed
- Feature Dev: cyan, pipeline count + running status, live-shimmer animation
- Watchdog: pink, error count + resolved

motion으로 stagger 진입 애니메이션 (80ms 간격)

- [ ] **Step 3: stats-bar.tsx 작성**

하단 4칸: Agents(16) / Skills(44) / MCP(7) / Health(OK with glow)

- [ ] **Step 4: page.tsx에 조립**

```tsx
// app/page.tsx — Server Component (no 'use client')
import { NavBar } from '@/components/nav-bar';
import { ConveyorLeads } from '@/components/conveyor-leads';
import { StatsBar } from '@/components/stats-bar';
import { getDashboardData } from '@/lib/read-logs';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const data = getDashboardData();
  // pass data as props to client components
}
```

- [ ] **Step 5: 브라우저 확인**

```bash
npm run dev
```

http://localhost:3000 에서 테마 + 레이아웃 확인

- [ ] **Step 6: 커밋**

```bash
git add dashboard/components/ dashboard/app/page.tsx
git commit -m "feat: add nav-bar, conveyor-leads, stats-bar components"
```

---

### Task 5: UI 컴포넌트 — Conveyor Lanes

**Files:**
- Create: `dashboard/components/conveyor-lane-quality.tsx`
- Create: `dashboard/components/conveyor-lane-feature.tsx`
- Create: `dashboard/components/conveyor-lane-watchdog.tsx`

- [ ] **Step 1: conveyor-lane-quality.tsx 작성**

- 왼쪽 emerald dot + "Code Quality" + "PASS"
- 리뷰 히스토리 바 (reviews 배열 기반, 각 리뷰를 bar segment로)
  - clean = emerald, critical = pink (with glow)
- 마지막 리뷰 요약 텍스트

- [ ] **Step 2: conveyor-lane-feature.tsx 작성**

- cyan glow dot (pulse) + "Feature Dev" + LIVE badge
- 3단계 파이프라인 흐름 (Design → Implement → Verify)
  - 완료 단계: emerald border
  - 현재 단계: cyan background + glow
  - 미래 단계: 어두운 border
- live-shimmer 배경 애니메이션
- pipeline 정보 텍스트

- [ ] **Step 3: conveyor-lane-watchdog.tsx 작성**

- pink dot + "Watchdog" + open count
- 에러 그리드 (각 에러를 작은 사각형으로)
  - resolved: emerald border + ✓
  - open: pink border + ! (with subtle glow)

- [ ] **Step 4: page.tsx에 추가**

Conveyor Leads 아래에 3개 Lane 순서대로 배치

- [ ] **Step 5: 브라우저 확인**

- [ ] **Step 6: 커밋**

```bash
git add dashboard/components/conveyor-lane-*.tsx dashboard/app/page.tsx
git commit -m "feat: add conveyor lane components with real log data"
```

---

### Task 6: UI 컴포넌트 — Activity Feed + Arsenal Grid

**Files:**
- Create: `dashboard/components/activity-feed.tsx`
- Create: `dashboard/components/arsenal-grid.tsx`

- [ ] **Step 1: activity-feed.tsx 작성**

- "Activity" section title
- ActivityItem 배열을 시간순으로 표시
- 각 항목: 시간 + 색상 사각형(A=emerald, B=cyan, C=pink) + 메시지 + 상태
- auto-animate로 새 항목 추가 시 자동 트랜지션

- [ ] **Step 2: arsenal-grid.tsx 작성**

확정 디자인의 4-layer 무기고 그리드:
- L1 Engine (purple): motion, anime.js, GSAP — 3열
- L2 Scroll (cyan): lenis, fullPage, barba.js, Swiper — 4열
- L3 3D (emerald): three.js, R3F, Spline, cobe, Lottie, remotion — 6열
- L4 Components (pink): typed.js, cursor, auto-animate, react-bits, motion-primitives — 5열

각 아이템: 이름 + GitHub stars
레이어별 라벨 + 색상 border
hover 시 미세 lift 효과

- [ ] **Step 3: page.tsx 최종 조립**

전체 순서:
1. NavBar
2. ConveyorLeads (3 summary cards)
3. ConveyorLaneQuality
4. ConveyorLaneFeature
5. ConveyorLaneWatchdog
6. ActivityFeed
7. ArsenalGrid
8. StatsBar

- [ ] **Step 4: 브라우저 전체 확인**

- [ ] **Step 5: 빌드 확인**

```bash
npm run build
```

- [ ] **Step 6: 커밋**

```bash
git add dashboard/
git commit -m "feat: complete nava dashboard v1.0 with all components"
```

---

## Summary

| Task | 내용 | 주요 파일 |
|---|---|---|
| 1 | Next.js 프로젝트 + 테마 설정 | package.json, globals.css, layout.tsx |
| 2 | 타입 정의 + 로그 읽기 | types.ts, read-logs.ts |
| 3 | API Route | api/logs/route.ts |
| 4 | NavBar + ConveyorLeads + StatsBar | 3 components + page.tsx |
| 5 | Conveyor Lanes (3개) | 3 lane components |
| 6 | Activity Feed + Arsenal Grid | 2 components, 최종 조립 |
