# Design-DNA 프로젝트 리서치 레퍼런스

> 최종 업데이트: 2026-03-01
> 웹 애니메이션 추출, 사이트 클로닝, 디자인→코드 변환 관련 오픈소스 & 리소스 모음

---

## 1. 웹 애니메이션 추출 / 역공학

### 1.1 Motion (구 Framer Motion)
- **URL**: https://github.com/motiondivision/motion
- **Stars**: ~26k+
- **핵심**: 프로덕션 레벨 웹 애니메이션 라이브러리. React, Vanilla JS 지원
- **design-dna 활용**: 소스코드 분석으로 애니메이션 시스템 아키텍처 이해. `useMotionValue`, `useTransform`, `AnimatePresence` 등의 내부 구현 → 역으로 이 패턴을 감지하는 추출기 개발 가능

### 1.2 Web Animations API (브라우저 네이티브)
- **URL**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API
- **핵심**: `document.getAnimations()`, `Element.getAnimations()` → 현재 실행 중인 모든 애니메이션을 프로그래밍적으로 열거
- **design-dna 활용**: 
  - 핵심 추출 엔진의 기반 API
  - `getAnimations()` → keyframes, timing, easing 전부 추출 가능
  - CSS Animation, CSS Transition, WAAPI Animation 모두 캡처

### 1.3 web-animations-js (Polyfill)
- **참고**: 구 web-animations-js 폴리필은 deprecated. 현재 대부분 브라우저가 WAAPI 네이티브 지원
- **핵심**: Web Animations API 폴리필
- **design-dna 활용**: 구형 브라우저 대응이 필요한 경우 참고. 현재는 네이티브 WAAPI로 충분

### 1.4 Puppeteer
- **URL**: https://github.com/puppeteer/puppeteer
- **Stars**: ~89k+
- **핵심**: Chrome DevTools Protocol 기반 헤드리스 브라우저 자동화
- **design-dna 활용**: 
  - CDP의 `Animation.animationCreated`, `Animation.animationStarted` 이벤트로 애니메이션 감지
  - `CSS.getStyleSheetText`로 @keyframes 규칙 추출
  - `Runtime.evaluate`로 `document.getAnimations()` 실행
  - 스크린캡처 → 프레임 단위 애니메이션 기록

### 1.5 Playwright
- **URL**: https://github.com/microsoft/playwright
- **Stars**: ~68k+
- **핵심**: 멀티 브라우저 자동화 (Chromium, Firefox, WebKit)
- **design-dna 활용**: Puppeteer와 유사하지만 더 안정적. `page.evaluate()`로 WAAPI 추출, `page.screenshot()` 연속 캡처로 시각적 diff

### 1.6 CSSTree
- **URL**: https://github.com/csstree/csstree
- **Stars**: ~2k+
- **핵심**: CSS 파서/생성기. AST 기반 CSS 분석
- **design-dna 활용**: 추출한 CSS에서 `@keyframes`, `animation-*`, `transition-*` 속성을 AST로 파싱하여 구조화

### 1.7 Animation Inspector (Chrome DevTools 내장)
- **URL**: https://developer.chrome.com/docs/devtools/css/animations
- **핵심**: Chrome DevTools의 Animation 탭 — 실행 중인 CSS/JS 애니메이션 시각화
- **design-dna 활용**: CDP (Chrome DevTools Protocol)의 `Animation` 도메인을 프로그래밍적으로 활용하여 같은 데이터 추출

### 1.8 PostCSS
- **URL**: https://github.com/postcss/postcss
- **Stars**: ~29k+
- **핵심**: CSS 변환 도구. 플러그인 아키텍처
- **design-dna 활용**: PostCSS 플러그인으로 `@keyframes` 추출기 작성, `animation` shorthand 파싱

### 1.9 stylelint
- **URL**: https://github.com/stylelint/stylelint
- **Stars**: ~11k+
- **핵심**: CSS 린터/분석기
- **design-dna 활용**: CSS 파싱 로직 참고하여 애니메이션 관련 속성 분석

---

## 2. 웹사이트 클론 / 미러링 (현대적)

### 2.1 abi/screenshot-to-code
- **URL**: https://github.com/abi/screenshot-to-code
- **Stars**: ~67k+
- **핵심**: 스크린샷/URL을 촬영하여 AI(GPT-4V/Claude)로 HTML/Tailwind/React 코드 생성
- **design-dna 활용**: **가장 직접적인 참고 프로젝트**. URL→스크린샷→코드 파이프라인 아키텍처 참고. 우리는 여기에 애니메이션 추출을 추가하는 것

### 2.2 BuilderIO/mitosis
- **URL**: https://github.com/BuilderIO/mitosis
- **Stars**: ~12k+
- **핵심**: 하나의 컴포넌트를 React/Vue/Angular/Svelte/Solid 등 모든 프레임워크로 컴파일
- **design-dna 활용**: 추출한 HTML/CSS를 Mitosis IR로 변환 → 어떤 프레임워크로든 출력 가능. Figma 통합 기능도 참고

### 2.3 nichochar/srcbook → srcbookdev/srcbook
- **URL**: https://github.com/srcbookdev/srcbook
- **Stars**: ~3k+
- **핵심**: TypeScript 중심 AI 앱 빌더 + 노트북 (이후 getmocha.com으로 발전)
- **design-dna 활용**: AI 기반 코드 생성 아키텍처 참고. 웹 인터페이스에서 코드를 즉시 생성/편집/실행하는 UX

### 2.4 nichochar/h-9331 (Lovable 프로젝트)
- **URL**: https://github.com/nichochar/h-9331
- **Stars**: 개인 프로젝트
- **핵심**: Vite + React + shadcn-ui + Tailwind CSS 기반 Lovable AI 앱
- **design-dna 활용**: Lovable의 AI → 코드 생성 패턴 참고

### 2.5 nichochar의 bolt.new 포크
- **URL**: nichochar의 리포 목록에 bolt-new 포크 존재 ("Prompt, run, edit, and deploy full-stack web applications")
- **핵심**: StackBlitz bolt.new의 포크 — 브라우저에서 풀스택 앱 프롬프트 → 생성 → 배포
- **design-dna 활용**: WebContainer 기반 즉시 프리뷰 아키텍처 참고

### 2.6 HTTrack (레거시 참고)
- **URL**: https://www.httrack.com/
- **핵심**: 전통적 웹사이트 미러링 도구
- **design-dna 활용**: 정적 자산 다운로드 로직 참고. 하지만 SPA는 못 잡으므로 Puppeteer/Playwright 필수

### 2.7 SingleFile
- **URL**: https://github.com/gildas-lormeau/SingleFile
- **Stars**: ~15k+
- **핵심**: 웹페이지를 완전한 단일 HTML 파일로 저장. 인라인 CSS/JS/이미지 포함
- **design-dna 활용**: 웹페이지의 완전한 스냅샷을 단일 파일로 캡처하는 로직 참고

### 2.8 Monolith
- **URL**: https://github.com/Y2Z/monolith
- **Stars**: ~11k+
- **핵심**: Rust로 작성된 웹페이지 → 단일 HTML 저장 CLI
- **design-dna 활용**: 빠르고 가벼운 웹페이지 캡처. CLI로 자동화 파이프라인 구축

### 2.9 wget / curl (기본 도구)
- **핵심**: 기본적인 웹 미러링. `wget --mirror --convert-links`
- **design-dna 활용**: 기본 정적 자산 수집에만 사용. SPA 대응 불가

---

## 3. Framer 관련

### 3.1 Motion (구 Framer Motion) 소스코드
- **URL**: https://github.com/motiondivision/motion
- **Stars**: ~26k+
- **핵심 분석 포인트**:
  - `/packages/framer-motion/src/animation/` — 애니메이션 엔진 코어
  - `/packages/framer-motion/src/gestures/` — 제스처 시스템
  - `/packages/framer-motion/src/motion/` — motion() 컴포넌트 팩토리
  - `MotionValue` 시스템 — 반응형 값 전파
  - `useSpring`, `useTransform` — 물리 기반 애니메이션
  - `AnimatePresence` — 마운트/언마운트 애니메이션
  - `LayoutGroup` — 레이아웃 애니메이션
- **design-dna 활용**: Framer Motion을 사용하는 사이트 감지 → motion 패턴 역추출. `data-framer-*` 어트리뷰트로 Framer 사이트 식별

### 3.2 Framer 사이트 구조 분석
- Framer 사이트는 `*.framer.app` 또는 `*.framer.website` 도메인 사용
- 내부적으로 React + Framer Motion으로 렌더링
- HTML에 `data-framer-component-type`, `data-framer-name` 등의 어트리뷰트 존재
- CSS 변수: `--framer-*` 네임스페이스 사용
- **design-dna 활용**: 이 패턴으로 Framer 사이트 자동 감지 → 특화된 추출 로직 적용

### 3.3 Framer 코드 Export
- Framer 자체에는 공식 코드 export 기능이 제한적
- `framer-sites-css-variables` 패턴으로 디자인 토큰 추출 가능
- Framer Plugin API: https://www.framer.com/developers/plugins
- **design-dna 활용**: Framer Plugin으로 내부 컴포넌트 구조 접근 가능 (향후)

---

## 4. 디자인 → 코드 변환

### 4.1 abi/screenshot-to-code
- **URL**: https://github.com/abi/screenshot-to-code
- **Stars**: ~67k+
- **핵심**: GPT-4V/Claude 3.5 Vision으로 스크린샷 → HTML/React/Vue 코드 생성
- **지원 출력**: HTML+Tailwind, React+Tailwind, Vue+Tailwind, Bootstrap, Ionic, SVG
- **design-dna 활용**: **핵심 참고**. 스크린샷 기반 코드 생성의 gold standard

### 4.2 BuilderIO/figma-html
- **URL**: https://github.com/BuilderIO/figma-html
- **Stars**: ~3k+
- **핵심**: Figma → HTML/CSS/React/Vue/Svelte 변환. Builder.io의 Visual Copilot
- **design-dna 활용**: Figma 디자인 토큰/컴포넌트 → 코드 변환 파이프라인 참고

### 4.3 BuilderIO/mitosis
- **URL**: https://github.com/BuilderIO/mitosis
- **Stars**: ~12k+
- **핵심**: Universal component compiler. Write once → React/Vue/Angular/Svelte/Solid/Qwik
- **design-dna 활용**: 추출한 컴포넌트를 다양한 프레임워크로 출력하는 백엔드

### 4.4 Locofy
- **URL**: https://www.locofy.ai/ (상용)
- **핵심**: Figma/Adobe XD → 프로덕션 React/Next.js/Vue 코드 (상용 SaaS)
- **design-dna 활용**: 경쟁사/참고 제품으로 기능 벤치마킹

### 4.5 Anima
- **URL**: https://www.animaapp.com/ (상용)
- **핵심**: Figma → React/HTML/Vue 코드. 애니메이션 지원
- **design-dna 활용**: 애니메이션 포함 디자인→코드 변환의 상용 사례 참고

### 4.6 TeleportHQ Code Generators
- **URL**: https://github.com/teleporthq/teleport-code-generators
- **Stars**: ~1k+
- **핵심**: UIDL (UI Description Language) → React/Vue/Angular/HTML 코드 생성
- **design-dna 활용**: UIDL 중간 표현 개념 참고. 추출한 UI를 중간 포맷으로 변환 → 다양한 출력

### 4.7 openv0 (v0.dev 오픈소스 대안)
- **URL**: https://github.com/raidendotai/openv0
- **Stars**: ~4k+
- **핵심**: AI 기반 UI 컴포넌트 생성 (v0.dev의 오픈소스 대안)
- **design-dna 활용**: 프롬프트 → UI 컴포넌트 생성 로직 참고

### 4.8 Lovable.dev
- **URL**: https://lovable.dev/ (상용, 오픈소스 아님)
- **핵심**: AI로 전체 웹앱 생성. Vite+React+shadcn+Tailwind 스택
- **design-dna 활용**: nichochar의 h-9331 포크에서 구조 참고 가능

### 4.9 CSS 역공학 도구들
- **getComputedStyle()**: 브라우저 네이티브 API. 렌더링된 최종 CSS 값 추출
- **computed-style-to-inline-style**: npm 패키지. computed style을 inline으로 변환
- **design-dna 활용**: 최종 렌더링 결과의 CSS를 추출하여 원본 CSS 역추론

---

## 5. GSAP / ScrollTrigger / 스크롤 애니메이션

### 5.1 GSAP (GreenSock Animation Platform)
- **공식 사이트**: https://gsap.com/
- **npm**: https://www.npmjs.com/package/gsap
- **Stars**: (GitHub repo는 2023년부터 비공개, npm 주간 다운로드 ~1M+)
- **핵심**: 가장 강력한 JS 애니메이션 라이브러리. ScrollTrigger, Draggable, Flip 등 플러그인
- **design-dna 활용**: 
  - `gsap` 전역 객체 감지로 GSAP 사용 사이트 식별
  - `gsap.globalTimeline` 접근으로 전체 타임라인 구조 추출
  - ScrollTrigger 설정값 (start, end, scrub, pin 등) 추출
  - GSAP의 tween 속성 → CSS/Framer Motion으로 변환

### 5.2 ScrollTrigger 고급 패턴
- **공식 문서**: https://gsap.com/docs/v3/Plugins/ScrollTrigger/
- **핵심 패턴들**:
  - `scrub: true` — 스크롤 진행도에 따른 애니메이션 연동
  - `pin: true` — 요소 고정 + 스크롤 애니메이션
  - `snap` — 스크롤 스냅 포인트
  - `batch()` — 다수 요소 순차 등장
  - `containerAnimation` — 가로 스크롤 + 세로 스크롤 중첩
- **design-dna 활용**: 이 패턴들을 자동 감지하여 재현 코드 생성

### 5.3 Locomotive Scroll
- **URL**: https://github.com/locomotivemtl/locomotive-scroll
- **Stars**: ~8k+
- **핵심**: 스무스 스크롤 + 패럴랙스 + 스크롤 기반 애니메이션
- **design-dna 활용**: `data-scroll`, `data-scroll-speed` 등의 어트리뷰트로 사이트 감지

### 5.4 Lenis (구 Locomotive Scroll v5)
- **URL**: https://github.com/darkroomengineering/lenis
- **Stars**: ~9k+
- **핵심**: 초경량 스무스 스크롤 라이브러리. Locomotive의 후속
- **design-dna 활용**: Lenis 사용 사이트 감지 → 스무스 스크롤 설정 추출

### 5.5 ScrollMagic
- **URL**: https://github.com/janpaepke/ScrollMagic
- **Stars**: ~15k+
- **핵심**: 스크롤 기반 애니메이션 컨트롤러 (GSAP 전용은 아님)
- **design-dna 활용**: ScrollMagic Scene 감지 → trigger/duration/offset 추출

### 5.6 Lottie Web
- **URL**: https://github.com/airbnb/lottie-web
- **Stars**: ~30k+
- **핵심**: After Effects 애니메이션을 JSON으로 export → 웹/모바일에서 네이티브 렌더링
- **design-dna 활용**: 
  - 페이지 내 Lottie JSON 데이터 추출 (네트워크 요청 감시 또는 `lottie-player` 태그 파싱)
  - 추출한 JSON → 그대로 재사용 가능 (벡터 애니메이션)

### 5.7 @lottiefiles/lottie-player
- **URL**: https://github.com/LottieFiles/lottie-player
- **Stars**: ~1k+
- **핵심**: 웹 컴포넌트 기반 Lottie 플레이어
- **design-dna 활용**: `<lottie-player>` 또는 `<dotlottie-player>` 태그에서 src 속성으로 JSON URL 추출

### 5.8 rive-app/rive-wasm
- **URL**: https://github.com/rive-app/rive-wasm
- **Stars**: ~1k+
- **핵심**: Rive (인터랙티브 벡터 애니메이션) 웹 런타임
- **design-dna 활용**: Rive 사용 사이트 감지 → .riv 파일 추출

### 5.9 theatre-js/theatre
- **URL**: https://github.com/theatre-js/theatre
- **Stars**: ~11k+
- **핵심**: 비주얼 애니메이션 에디터 + JS 런타임. Three.js/React 통합
- **design-dna 활용**: Theatre.js 사용 사이트의 애니메이션 시퀀스 데이터 추출 가능성

### 5.10 ScrollReveal
- **URL**: https://github.com/jlmakes/scrollreveal
- **Stars**: ~22k+
- **핵심**: 간단한 스크롤 reveal 애니메이션
- **design-dna 활용**: `data-sr` 어트리뷰트로 감지, 설정값 추출

### 5.11 AOS (Animate On Scroll)
- **URL**: https://github.com/michalsnik/aos
- **Stars**: ~26k+
- **핵심**: `data-aos="fade-up"` 스타일의 선언적 스크롤 애니메이션
- **design-dna 활용**: `data-aos-*` 어트리뷰트로 즉시 감지 + 설정 추출

### 5.12 react-spring
- **URL**: https://github.com/pmndrs/react-spring
- **Stars**: ~28k+
- **핵심**: 물리 기반 React 애니메이션 라이브러리
- **design-dna 활용**: react-spring 사용 감지 → spring 설정값 추출

### 5.13 auto-animate
- **URL**: https://github.com/formkit/auto-animate
- **Stars**: ~13k+
- **핵심**: 한 줄 코드로 DOM 변화에 자동 애니메이션 적용
- **design-dna 활용**: auto-animate 감지 → 단순 추출 (설정이 최소이므로)

---

## 6. 학술 논문 / 연구

### 6.1 "pix2code: Generating Code from a Graphical User Interface Screenshot" (2017)
- **URL**: https://arxiv.org/abs/1705.07962
- **GitHub**: https://github.com/tonybeltramelli/pix2code
- **핵심**: CNN으로 GUI 스크린샷 → DSL → HTML/iOS/Android 코드 생성. 최초의 스크린샷→코드 논문
- **design-dna 활용**: 시각적 UI → 코드 변환의 학술적 기반

### 6.2 "Sketch2Code: Transformation of Sketches to UI in Real-Time Using Deep Learning" (2019)
- **URL**: https://arxiv.org/abs/1905.13750 (Microsoft)
- **핵심**: 실시간 손 스케치 → HTML/CSS 변환
- **design-dna 활용**: 시각적 입력 → 코드 생성 파이프라인 참고

### 6.3 "Learning to Denoise Raw Mobile UI Layouts for Improving Datasets at Scale" (2022)
- **URL**: https://arxiv.org/abs/2201.04100 (Google)
- **핵심**: UI 레이아웃 데이터셋 자동 정제
- **design-dna 활용**: UI 레이아웃 이해를 위한 데이터 전처리 기법 참고

### 6.4 "WebSight: Dataset and model for HTML generation from screenshots" (2024)
- **URL**: https://huggingface.co/datasets/HuggingFaceM4/WebSight
- **핵심**: 대규모 웹 스크린샷-HTML 페어 데이터셋. 파인튜닝용
- **design-dna 활용**: 스크린샷→HTML 변환 모델 학습 데이터로 활용 가능

### 6.5 "Design2Code: How Far Are We From Automating Front-End Engineering?" (2024)
- **URL**: https://arxiv.org/abs/2403.03163 (Stanford)
- **핵심**: GPT-4V, Gemini Pro Vision 등을 이용한 웹 디자인→코드 벤치마크
- **design-dna 활용**: **매우 직접적**. 디자인→코드 자동화의 현재 수준과 한계점 파악

### 6.6 "Reverse Engineering Web Pages" (관련 연구)
- **키워드**: Web UI reverse engineering, visual web cloning
- **핵심 주제들**:
  - DOM 구조 분석을 통한 웹 페이지 역공학
  - 시각적 유사도 기반 웹 클로닝 품질 평가
  - CSS 자동 리팩토링 (중복 제거, 최적화)
- **design-dna 활용**: 학술적 방법론 기반으로 추출 품질 평가 메트릭 수립

### 6.7 "CSSCheck: Detecting and Fixing CSS Issues" (2021)
- **URL**: 관련 IEEE/ACM 논문들
- **핵심**: CSS 이슈 자동 감지. Computed style vs authored style 불일치 분석
- **design-dna 활용**: 추출한 CSS의 품질 검증 로직

### 6.8 "Understanding and Automatically Detecting Web Page Clones" (연구)
- **핵심**: 피싱 탐지 맥락에서의 웹 페이지 클론 탐지 기법
- **design-dna 활용**: 역으로, 더 완벽한 클론을 만들기 위한 유사도 메트릭

---

## 7. 추가 도구 & 라이브러리

### 7.1 Tailwind CSS
- **URL**: https://github.com/tailwindlabs/tailwindcss
- **Stars**: ~84k+
- **핵심**: 유틸리티 기반 CSS 프레임워크
- **design-dna 활용**: 추출한 CSS를 Tailwind 클래스로 변환. `@tailwindcss/oxide` 파서 참고

### 7.2 html-react-parser
- **URL**: https://github.com/remarkablemark/html-react-parser
- **npm**: `html-react-parser`
- **핵심**: HTML 문자열 → React 컴포넌트 변환
- **design-dna 활용**: 추출한 HTML을 React JSX로 변환하는 중간 단계

### 7.3 juice
- **URL**: https://github.com/Automattic/juice
- **Stars**: ~3k+
- **핵심**: CSS를 인라인 스타일로 변환
- **design-dna 활용**: 외부 CSS를 인라인으로 병합하여 단일 파일 추출

### 7.4 cheerio
- **URL**: https://github.com/cheeriojs/cheerio
- **Stars**: ~28k+
- **핵심**: 서버사이드 jQuery. HTML 파싱/조작
- **design-dna 활용**: 추출한 HTML에서 특정 요소/속성 추출. 클린업 처리

### 7.5 jsdom
- **URL**: https://github.com/jsdom/jsdom
- **Stars**: ~20k+
- **핵심**: 순수 JS DOM 구현. Node.js에서 DOM 시뮬레이션
- **design-dna 활용**: 추출한 HTML의 DOM 조작, getComputedStyle 에뮬레이션

### 7.6 css-to-react-native
- **URL**: https://github.com/styled-components/css-to-react-native
- **Stars**: ~1k+
- **핵심**: CSS 속성 → React Native StyleSheet 변환
- **design-dna 활용**: 웹→React Native 변환 파이프라인에 활용 가능

### 7.7 svgr
- **URL**: https://github.com/gregberge/svgr
- **Stars**: ~11k+
- **핵심**: SVG → React 컴포넌트 변환
- **design-dna 활용**: 추출한 SVG 아이콘/그래픽을 React 컴포넌트화

### 7.8 sharp
- **URL**: https://github.com/lovell/sharp
- **Stars**: ~29k+
- **핵심**: 고성능 이미지 처리 (Node.js)
- **design-dna 활용**: 스크린샷 처리, 이미지 최적화, 시각적 diff 비교

### 7.9 pixelmatch
- **URL**: https://github.com/mapbox/pixelmatch
- **Stars**: ~6k+
- **핵심**: 픽셀 단위 이미지 비교
- **design-dna 활용**: 원본 사이트 스크린샷 vs 재생성 결과의 시각적 정확도 측정

### 7.10 Storybook
- **URL**: https://github.com/storybookjs/storybook
- **Stars**: ~84k+
- **핵심**: UI 컴포넌트 개발/문서화/테스트 도구
- **design-dna 활용**: 추출한 컴포넌트를 Storybook으로 문서화하여 미리보기 제공

---

## 8. 핵심 API & 프로토콜

### 8.1 Chrome DevTools Protocol (CDP)
- **URL**: https://chromedevtools.github.io/devtools-protocol/
- **핵심 도메인들**:
  - `Animation` — 애니메이션 생성/시작/종료 이벤트
  - `CSS` — 스타일시트, 계산된 스타일, @keyframes
  - `DOM` — DOM 트리 순회
  - `Page` — 스크린샷, PDF, 네비게이션
  - `Runtime` — JS 실행 (getAnimations() 등)
  - `Network` — 네트워크 요청 (Lottie JSON, 폰트 등)
  - `Emulation` — 뷰포트, 미디어쿼리 시뮬레이션
- **design-dna 활용**: 추출 엔진의 핵심 인터페이스

### 8.2 Web Animations API
- **URL**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API
- **핵심 메서드들**:
  - `document.getAnimations()` — 모든 실행 중 애니메이션 열거
  - `Element.getAnimations()` — 특정 요소의 애니메이션
  - `animation.effect.getKeyframes()` — 키프레임 데이터 추출
  - `animation.effect.getComputedTiming()` — 타이밍 정보
  - `animation.playState` — 상태 (running/paused/finished)
- **design-dna 활용**: 런타임 애니메이션 추출의 핵심 API

### 8.3 CSSOM (CSS Object Model)
- **URL**: https://developer.mozilla.org/en-US/docs/Web/API/CSS_Object_Model
- **핵심**:
  - `document.styleSheets` — 모든 스타일시트 열거
  - `CSSStyleSheet.cssRules` — CSS 규칙 순회
  - `CSSKeyframesRule` — @keyframes 규칙 접근
  - `window.getComputedStyle()` — 최종 계산된 스타일
- **design-dna 활용**: CSS 규칙 수준에서 애니메이션 정의 추출

---

## 9. 유사한 상용 제품 (벤치마크)

| 제품 | URL | 핵심 기능 | 참고 사항 |
|------|-----|-----------|-----------|
| v0.dev | https://v0.dev/ | 프롬프트 → React+Tailwind UI | Vercel. shadcn/ui 기반 |
| Lovable | https://lovable.dev/ | AI 전체 앱 생성 | Vite+React+shadcn 스택 |
| bolt.new | https://bolt.new/ | 브라우저 내 풀스택 앱 생성 | StackBlitz WebContainer |
| Locofy | https://locofy.ai/ | Figma → 프로덕션 코드 | 가장 성숙한 Figma→코드 |
| Anima | https://animaapp.com/ | Figma → React/HTML | 애니메이션 지원 |
| Framer | https://framer.com/ | 노코드 웹사이트 빌더 | 자체 애니메이션 시스템 |
| Webflow | https://webflow.com/ | 비주얼 웹 빌드 + CMS | CSS 애니메이션 에디터 |
| Relume | https://relume.io/ | AI 와이어프레임 → Figma | 사이트맵→구조 생성 |
| Galileo AI | https://galileo-ai.com/ | 텍스트 → UI 디자인 | UI 디자인 생성 AI |
| TeleportHQ | https://teleporthq.io/ | 비주얼→코드 플랫폼 | 오픈소스 코드 생성기 |

---

## 10. 추천 리서치 우선순위 (design-dna 프로젝트)

### 🔴 최우선 (핵심 기술)
1. **Web Animations API** — 애니메이션 추출의 기반
2. **Chrome DevTools Protocol** — 추출 엔진 인터페이스
3. **abi/screenshot-to-code** — 아키텍처 참고
4. **motiondivision/motion** — Framer 사이트 감지/역공학

### 🟡 높은 우선순위
5. **BuilderIO/mitosis** — 멀티 프레임워크 출력
6. **Puppeteer/Playwright** — 브라우저 자동화 기반
7. **GSAP ScrollTrigger** — 스크롤 애니메이션 패턴 감지
8. **airbnb/lottie-web** — Lottie 애니메이션 추출
9. **Design2Code 논문** — 학술적 벤치마크

### 🟢 보통 우선순위
10. **SingleFile** — 웹페이지 완전 캡처
11. **PostCSS/css-tree** — CSS 파싱
12. **Locomotive/Lenis** — 스크롤 라이브러리 감지
13. **AOS/ScrollReveal** — 선언적 애니메이션 감지
14. **pix2code/Sketch2Code** — 학술 참고

---

## 11. 기술 블로그 & 참고 글

### 11.1 Web Animations API 관련
- "Using the Web Animations API" — MDN: https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Using_the_Web_Animations_API
- "Discover CSS Animations with the Chrome DevTools Animation Inspector" — Chrome 블로그
- "A comprehensive guide to the Web Animations API" — LogRocket: https://blog.logrocket.com/guide-web-animations-api/

### 11.2 Framer 분석
- "How Framer Sites Work Under the Hood" — 커뮤니티 분석 글
- "Reverse Engineering Framer's Animation Engine" — 관련 블로그 포스트
- Framer Developer Docs: https://www.framer.com/developers/

### 11.3 GSAP/ScrollTrigger
- "Advanced ScrollTrigger Techniques" — GSAP 공식 블로그: https://gsap.com/blog/
- "The Definitive Guide to GSAP ScrollTrigger" — 다수 튜토리얼
- "GSAP 3 Migration Guide" — 라이브러리 감지 시 버전 호환성 참고

### 11.4 디자인→코드
- "Design2Code: How Far Are We?" — Stanford 블로그
- "Building screenshot-to-code" — abi의 블로그
- "The State of AI Code Generation from Design" — 다양한 매체

---

## 12. npm 패키지 (직접 활용 가능)

```
# 애니메이션 분석
postcss                    # CSS 파싱/변환
css-tree                   # CSS AST 파서
csstype                    # CSS 타입 정의

# 브라우저 자동화
puppeteer                  # Chrome 자동화
playwright                 # 멀티 브라우저 자동화

# HTML/DOM 처리
cheerio                    # 서버사이드 HTML 파싱
jsdom                      # DOM 시뮬레이션
html-react-parser          # HTML → React 변환
@builder.io/mitosis        # Universal 컴포넌트 컴파일러

# 이미지 처리
sharp                      # 이미지 프로세싱
pixelmatch                 # 시각적 diff

# 유틸리티
juice                      # CSS 인라인화
svgr                       # SVG → React
```

---

*이 문서는 design-dna 프로젝트의 기술 리서치를 위해 작성되었습니다.*
*각 항목은 지속적으로 업데이트될 수 있습니다.*
