import { getState, createState, setApproved, cancel } from './pipeline-state.mjs';

const FEATURE_KEYWORDS = /만들어|추가해|구현해|개발해|기능\s|시스템|구축|페이지\s*만들|build|create|implement|add\s*feature|develop/i;
const FULL_SIGNALS = /시스템|구축|처음부터|파이프라인|아키텍처|전체|완전한|풀스택|full.?stack|database|인증|auth/i;
const APPROVE_KEYWORDS = /^(좋아|진행|진행해|해|응|ㅇㅇ|ㅇ|ㄱ|go|ok|yes|승인|괜찮|됐어|좋|ㄱㄱ)$/i;
const CANCEL_KEYWORDS = /^(취소|중단|그만|cancel|stop|멈춰|아니|안해)$/i;
const BUG_KEYWORDS = /고쳐|에러|안돼|안\s*되|왜\s*이래|터졌|버그|fix|error|bug|crash/i;

const input = [];
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input.push(chunk));
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input.join(''));
    const prompt = (data.user_prompt || '').trim();

    const state = getState();

    if (state === null) {
      // No active pipeline
      if (BUG_KEYWORDS.test(prompt)) {
        // Passthrough — let quick-fix handle it
        process.exit(0);
      }

      if (FEATURE_KEYWORDS.test(prompt)) {
        const size = FULL_SIGNALS.test(prompt) ? 'full' : 'light';
        createState(size, prompt);

        const msg = `[PIPELINE:STARTED] type=${size} input='${prompt}'
Phase 1: Design — 이 요청에 대한 구현 계획을 작성해라.
type=light: 간단한 설계 후 자현에게 제시
type=full: 9단계 파이프라인 전체 설계 후 자현에게 제시
설계 완료 후 자현 승인을 받아라.`;

        console.log(JSON.stringify({ systemMessage: msg }));
        process.exit(0);
      }

      // Not a feature or bug — passthrough
      process.exit(0);
    }

    if (state.status === 'awaiting_approval') {
      if (CANCEL_KEYWORDS.test(prompt)) {
        cancel();
        console.log(JSON.stringify({ systemMessage: '[PIPELINE:CANCELLED] 파이프라인 취소됨.' }));
        process.exit(0);
      }

      if (APPROVE_KEYWORDS.test(prompt)) {
        setApproved();
        const msg = `[PIPELINE:APPROVED] Phase 2: Implement
승인된 설계에 따라 구현을 시작해라.
서브에이전트를 활용해서 태스크별로 구현하고,
완료 후 Phase 3(리뷰+테스트)를 병렬로 실행해라.`;
        console.log(JSON.stringify({ systemMessage: msg }));
        process.exit(0);
      }

      // Feedback / revision
      const msg = `[PIPELINE:REVISION] 자현이 피드백을 줬다: '${prompt}'
설계를 수정해서 다시 자현에게 제시해라.`;
      console.log(JSON.stringify({ systemMessage: msg }));
      process.exit(0);
    }

    if (state.status === 'running') {
      const msg = `[PIPELINE:CONTEXT] 파이프라인 진행 중 (phase: ${state.current_phase}).
자현의 입력에 대응하되, 파이프라인을 이어서 진행해라.`;
      console.log(JSON.stringify({ systemMessage: msg }));
      process.exit(0);
    }

    // Any other status — passthrough
    process.exit(0);
  } catch {
    // Parse error -> passthrough
    process.exit(0);
  }
});
