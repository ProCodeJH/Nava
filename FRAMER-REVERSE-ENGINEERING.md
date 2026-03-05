# Framer 역공학 가이드 — Design DNA 프로젝트용

## Framer 사이트 감지법
Framer로 만든 사이트는 다음 특징이 있다:
```
- <div id="main"> 아래 data-framer-* 속성 대량 존재
- window.__framer_importMap 전역 객체
- framer.com 도메인의 스크립트 로딩 (https://framerusercontent.com/*)
- CSS 클래스: framer-xxxxx (해시 기반)
- <meta name="generator" content="Framer">
- React + framer-motion 런타임 번들 포함
```

## Framer 내부 구조 (핵심)

### 1. Framer Config (최고 가치 데이터)
Framer 사이트에는 숨겨진 설정 JSON이 있다:
```js
// 페이지 내 __framer_importMap 또는 인라인 스크립트에서 추출
// 섹션별 variant, transition, animation 정보 전부 포함
window.__framer_importMap
```

### 2. Framer의 애니메이션 구현 방식
Framer는 내부적으로 `framer-motion`을 사용. 핵심 패턴:

#### Scroll Animation
```jsx
// Framer 내부
<motion.div 
  style={{ opacity: useTransform(scrollY, [0, 300], [0, 1]) }}
  initial={{ y: 100 }}
  whileInView={{ y: 0 }}
/>

// 우리가 변환할 코드 (GSAP ScrollTrigger)
gsap.to('.element', {
  scrollTrigger: { trigger: '.element', start: 'top 80%', end: 'top 20%' },
  opacity: 1, y: 0
});
```

#### Hover Interaction
```jsx
// Framer 내부
<motion.div whileHover={{ scale: 1.05, rotate: 2 }} />

// 변환 결과
<motion.div whileHover={{ scale: 1.05, rotate: 2 }} />  // 이건 그대로 써도 OK (framer-motion 라이브러리)
```

#### Page Transition
```jsx
// Framer의 페이지 전환
<AnimatePresence mode="wait">
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
</AnimatePresence>
```

#### Parallax
```jsx
// Framer 내부: transform delta per scroll step
// 추출: 스크롤 전/후 transform 값 비교 → parallax ratio 계산
// 변환:
gsap.to('.parallax-element', {
  scrollTrigger: { trigger: '.section', scrub: true },
  y: -200  // parallax ratio에 따라
});
```

### 3. 추출 대상 9가지
1. **CSS Variables** — `getComputedStyle(document.documentElement)`로 `--fr-*` 변수 추출
2. **Keyframe Animations** — `document.getAnimations()` (Web Animations API)
3. **Scroll Animations** — 스크롤 전/후 요소 상태 비교 (transform, opacity 등)
4. **Parallax** — 스크롤 delta당 transform 변화량 측정
5. **Hover/Click Interactions** — `mouseenter`/`click` 이벤트 전/후 상태 비교
6. **Page Transitions** — 라우트 변경 시 DOM 변화 캡처
7. **CSS Animation Properties** — `animation-name`, `animation-duration` 등
8. **3D Transforms** — `perspective`, `rotateX/Y`, `translateZ`
9. **Transition Properties** — `transition` CSS 속성 전부

### 4. 추출 방법 (Puppeteer)
```js
// 1. 페이지 로딩 후 모든 애니메이션 캡처
const animations = await page.evaluate(() => {
  return document.getAnimations().map(a => ({
    element: a.effect.target?.className,
    keyframes: a.effect.getKeyframes(),
    timing: a.effect.getTiming(),
  }));
});

// 2. 스크롤하면서 요소 상태 변화 기록
const before = await getElementStates(page);
await page.evaluate(() => window.scrollBy(0, 500));
const after = await getElementStates(page);
const scrollAnimations = diffStates(before, after);

// 3. 호버 시 변화 감지
await page.hover('.target-element');
const hoverState = await getElementState(page, '.target-element');
```

## 기존 코드 (반드시 먼저 읽어!)
- `../clone-engine/lib/framer-extract.js` (46KB) — 9단계 Framer 추출기 구현
- `../clone-engine/lib/framer-generate.js` (40KB) — 추출 데이터 → React+Motion 코드 생성
- `../clone-engine/lib/animation-analyzer.js` (33KB) — 범용 애니메이션 패턴 분류
- `../clone-engine/patterns/framer.json` — Framer 패턴 DB

## 변환 출력 형식
모든 Framer 애니메이션은 다음 두 형태 중 하나로 변환:

### GSAP + ScrollTrigger (스크롤 기반)
```bash
npm install gsap @gsap/react
```
```jsx
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);
```

### Framer Motion (인터랙션 기반)
```bash
npm install motion
```
```jsx
import { motion, useScroll, useTransform } from 'motion/react';
```

**핵심 원칙: Framer 플랫폼 종속성 0%. framer-motion 오픈소스 라이브러리만 사용.**

## 레퍼런스
- GSAP 공식: https://github.com/greensock/GSAP
- GSAP ScrollTrigger docs: https://gsap.com/docs/v3/Plugins/ScrollTrigger/
- Motion (구 Framer Motion) 공식: https://github.com/motiondivision/motion
- Motion docs: https://motion.dev/docs
- Web Animations API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API
