#!/usr/bin/env node
/**
 * TeammateIdle Hook — 팀원이 유휴 상태일 때 자동 재투입
 *
 * exit code 2 = 피드백 전송 (팀원에게 다음 작업 지시)
 * exit code 0 = 무시
 */

const input = [];
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input.push(chunk));
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input.join(''));
    const teammate = data.teammate_name || 'unknown';
    const role = data.teammate_role || '';

    // 피드백 메시지: 다음 할 일을 찾아서 하라고 지시
    const feedback = JSON.stringify({
      decision: 'send_feedback',
      feedback: [
        `[NAVA:IDLE] ${teammate} 유휴 감지.`,
        '남은 태스크가 있으면 다음 태스크를 시작해라.',
        '태스크가 없으면 현재 작업의 품질을 검증하고 리포트해라.',
      ].join('\n'),
    });

    process.stdout.write(feedback);
    process.exit(2); // exit 2 = send feedback to teammate
  } catch {
    process.exit(0);
  }
});
