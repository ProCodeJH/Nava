#!/usr/bin/env node
/**
 * Telegram Notification Hook — 에이전트 완료/실패/장시간 작업 알림
 *
 * 환경변수 필요:
 *   TELEGRAM_BOT_TOKEN — @BotFather에서 발급
 *   TELEGRAM_CHAT_ID   — 봇에 메시지 후 getUpdates로 확인
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  process.exit(0); // 토큰 없으면 조용히 패스
}

const input = [];
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input.push(chunk));
process.stdin.on('end', async () => {
  try {
    const data = JSON.parse(input.join(''));
    const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    const project = process.cwd().split(/[/\\]/).pop();

    let message = '';

    // Stop event — 세션/에이전트 종료
    if (data.hook_event === 'Stop' || data.hook_event === 'SubagentStop') {
      const icon = data.hook_event === 'Stop' ? '🦋' : '🎯';
      const type = data.hook_event === 'Stop' ? '세션 종료' : '에이전트 완료';
      message = `${icon} <b>나바 ${type}</b>\n📁 ${project}\n⏰ ${now}`;
    }

    // StopFailure — 실패
    if (data.hook_event === 'StopFailure') {
      message = `❌ <b>나바 작업 실패</b>\n📁 ${project}\n⏰ ${now}\n💬 ${data.error || 'Unknown error'}`;
    }

    // Notification — 사용자 입력 대기
    if (data.hook_event === 'Notification') {
      message = `🔔 <b>나바 입력 대기</b>\n📁 ${project}\n⏰ ${now}`;
    }

    if (!message) process.exit(0);

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    });
  } catch {
    // 알림 실패해도 세션에 영향 없음
  }
  process.exit(0);
});
