#!/usr/bin/env node
/**
 * 🦋 NAVA — 나바 통합 시스템
 *
 * 나바의 몸. Claude Code에서 bash로 직접 호출.
 * Exodia 4서비스 + SSH + 자식봇 통신 + CDP + 파일감시 전부 통합.
 *
 * 외부 의존성 0개. Node.js 내장 모듈만 사용.
 *
 * Usage:
 *   node nava.mjs status              — 전체 시스템 상태
 *   node nava.mjs see [--analyze]     — 스크린샷 / OmniParser 분석
 *   node nava.mjs click <x> <y>       — 클릭
 *   node nava.mjs type <text>         — 타이핑
 *   node nava.mjs hotkey <k1> <k2>    — 단축키
 *   node nava.mjs scroll <amount>     — 스크롤
 *   node nava.mjs think <message>     — Brain Bridge로 Claude에 질문
 *   node nava.mjs search <query>      — Tavily 웹 검색
 *   node nava.mjs remember <text>     — Cognee에 기억 저장
 *   node nava.mjs recall <query>      — Cognee에서 기억 검색
 *   node nava.mjs monitor [stats]     — AgentOps 통계
 *   node nava.mjs hide                — 창 전체 숨김
 *   node nava.mjs show                — 창 전체 표시
 *   node nava.mjs arrange [n]         — 창 n개 세로 배열
 *   node nava.mjs windows             — 창 목록
 *   node nava.mjs ssh <command>       — 클론컴 SSH 명령 실행
 *   node nava.mjs bot <name> <msg>    — 자식봇에 메시지 전송
 *   node nava.mjs cdp [port] list     — CDP 타겟 목록
 *   node nava.mjs cdp [port] run [n]  — CDP Auto-Run (Esc → Alt+Enter)
 *   node nava.mjs cdp [port] snap     — CDP 스크린샷
 *   node nava.mjs cdp [port] send <msg> — CDP 메시지 전송
 *   node nava.mjs heart [--once]      — 하트비트 (서비스 체크 + 큐 처리)
 *   node nava.mjs queue add <task>    — 작업 큐에 추가
 *   node nava.mjs queue list          — 작업 큐 보기
 *   node nava.mjs workflow <task>     — 6단계 자율 파이프라인 실행
 *   node nava.mjs eyes [--scan]       — 파일 감시 모드
 */

import { createRequire } from 'module';
import http from 'http';
import https from 'https';
import { execSync, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import net from 'net';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════════════════════

const EXODIA_HOST = '100.75.212.102';
const CLONE_HOST = '100.85.94.83';
const CLONE_USER = 'codin';

const SERVICES = {
  screen:       { host: EXODIA_HOST, port: 7778, name: 'Screen (눈+손)' },
  orchestrator: { host: EXODIA_HOST, port: 7779, name: 'Orchestrator (신경계)' },
  brain:        { host: EXODIA_HOST, port: 7780, name: 'Brain Bridge (뇌)' },
  hide:         { host: EXODIA_HOST, port: 7781, name: 'Hide-Daemon (스텔스)' },
};

const BOTS = {
  webi:  { port: 18790, token: '6150eb0c90f14a32d044a2f995ec3c16ac435bc9799ddc2b', emoji: '🕸️', name: '웨비' },
  appi:  { port: 18810, token: 'd25539194509774047af7d5df9355980e4491d77b9ec1b69', emoji: '📱', name: '아피' },
  gami:  { port: 18820, token: 'ab1869e82afbe72fb7ec26c55c3871b540272bf8f09ceb5b', emoji: '🎮', name: '가미' },
  ssoki: { port: 18830, token: '084452e5e6ee3616410ae61d0b88f3b9775768a0e8da124d', emoji: '💻', name: '쏘키' },
  booki: { port: 18840, token: 'ad00cfdd95c9bfc3678edd9f957f3f70f182b8ad2ad288be', emoji: '📚', name: '북이' },
};

const CDP_PORTS = [9222, 9333, 9334, 9335, 9336, 9337, 9338];

const TASK_QUEUE_PATH = path.join(__dirname, 'task-queue.json');
const HEARTBEAT_LOG_PATH = path.join(__dirname, 'heartbeat-log.json');
const WORKFLOW_LOG_PATH = path.join(__dirname, 'workflow-log.json');

const TIMEOUT = { default: 10_000, think: 130_000, remember: 60_000, recall: 30_000 };

// ═══════════════════════════════════════════════════════════════════
//  HTTP HELPERS
// ═══════════════════════════════════════════════════════════════════

function httpGet(service, urlPath, timeout = TIMEOUT.default) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: service.host, port: service.port, path: urlPath, method: 'GET', timeout };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({ raw: data }); } });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout: ${service.name} ${urlPath}`)); });
    req.on('error', reject);
    req.end();
  });
}

function httpPost(service, urlPath, body = {}, timeout = TIMEOUT.default) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const opts = {
      hostname: service.host, port: service.port, path: urlPath, method: 'POST', timeout,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({ raw: data }); } });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout: ${service.name} ${urlPath}`)); });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ═══════════════════════════════════════════════════════════════════
//  NERVE — Exodia 4 서비스 제어
// ═══════════════════════════════════════════════════════════════════

const Nerve = {
  async status(serviceName = null) {
    const targets = serviceName ? { [serviceName]: SERVICES[serviceName] } : SERVICES;
    const result = {};
    await Promise.all(Object.entries(targets).map(async ([key, svc]) => {
      if (!svc) { result[key] = { ok: false, error: 'Unknown' }; return; }
      try {
        const r = await httpGet(svc, '/status', 5000);
        result[key] = { ok: true, ...r };
      } catch (e) {
        result[key] = { ok: false, error: e.message };
      }
    }));
    return result;
  },

  async see(opts = {}) {
    if (opts.analyze) return httpPost(SERVICES.orchestrator, '/see', {});
    return httpGet(SERVICES.screen, opts.save ? '/screenshot/save' : '/screenshot');
  },

  async act(action, params = {}) {
    const direct = ['doubleclick', 'move', 'drag'];
    if (direct.includes(action)) return httpPost(SERVICES.screen, `/${action}`, params);
    return httpPost(SERVICES.orchestrator, '/act', { action, ...params });
  },

  async think(message, opts = {}) {
    const timeout = (opts.timeout || 120) * 1000 + 10_000;
    return httpPost(SERVICES.brain, '/think', {
      message, cdp_port: opts.cdp_port || 9222, timeout: opts.timeout || 120,
    }, timeout);
  },

  async search(query, opts = {}) {
    return httpPost(SERVICES.orchestrator, '/search', {
      query, max_results: opts.max_results || 5, depth: opts.depth || 'basic',
    });
  },

  async remember(text, dataset = 'exodia') {
    return httpPost(SERVICES.orchestrator, '/remember', { text, dataset }, TIMEOUT.remember);
  },

  async recall(query) {
    return httpPost(SERVICES.orchestrator, '/recall', { query }, TIMEOUT.recall);
  },

  async monitor(action = 'stats', opts = {}) {
    return httpPost(SERVICES.orchestrator, '/monitor', { action, ...opts });
  },

  async hideAll() { return httpGet(SERVICES.hide, '/hide'); },
  async showAll() { return httpGet(SERVICES.hide, '/show'); },
  async arrange(n = 6) { return httpGet(SERVICES.hide, `/arrange?n=${n}`); },
  async windows() { return httpGet(SERVICES.hide, '/windows'); },
};

// ═══════════════════════════════════════════════════════════════════
//  COMM — SSH + 자식봇 통신
// ═══════════════════════════════════════════════════════════════════

const Comm = {
  ssh(command, timeout = 30000) {
    try {
      const result = execSync(
        `ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no ${CLONE_USER}@${CLONE_HOST} ${JSON.stringify(command)}`,
        { timeout, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
      );
      return { ok: true, output: result.trim() };
    } catch (e) {
      return { ok: false, error: e.stderr?.trim() || e.message };
    }
  },

  async sshAsync(command, timeout = 30000) {
    return new Promise((resolve) => {
      const proc = exec(
        `ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no ${CLONE_USER}@${CLONE_HOST} ${JSON.stringify(command)}`,
        { timeout, encoding: 'utf-8' },
        (err, stdout, stderr) => {
          if (err) resolve({ ok: false, error: stderr?.trim() || err.message });
          else resolve({ ok: true, output: stdout.trim() });
        }
      );
    });
  },

  async bot(name, message) {
    const bot = BOTS[name];
    if (!bot) return { ok: false, error: `Unknown bot: ${name}. Available: ${Object.keys(BOTS).join(', ')}` };

    const payload = JSON.stringify({
      model: 'claude-opus-4-6-thinking',
      messages: [{ role: 'user', content: message }],
    });

    return new Promise((resolve) => {
      const opts = {
        hostname: CLONE_HOST, port: bot.port, path: '/v1/chat/completions',
        method: 'POST', timeout: 120_000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bot.token}`,
          'Content-Length': Buffer.byteLength(payload),
        },
      };
      const req = http.request(opts, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const reply = json.choices?.[0]?.message?.content || data;
            resolve({ ok: true, bot: bot.name, reply });
          } catch { resolve({ ok: true, bot: bot.name, reply: data }); }
        });
      });
      req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'Timeout' }); });
      req.on('error', e => resolve({ ok: false, error: e.message }));
      req.write(payload);
      req.end();
    });
  },

  async botStatus() {
    const result = {};
    await Promise.all(Object.entries(BOTS).map(async ([name, bot]) => {
      try {
        const r = await new Promise((resolve, reject) => {
          const req = http.get({ hostname: CLONE_HOST, port: bot.port, path: '/v1/models', timeout: 5000 }, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(data));
          });
          req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
          req.on('error', reject);
        });
        result[name] = { ok: true, emoji: bot.emoji, name: bot.name };
      } catch (e) {
        result[name] = { ok: false, emoji: bot.emoji, name: bot.name, error: e.message };
      }
    }));
    return result;
  },
};

// ═══════════════════════════════════════════════════════════════════
//  CDP — Chrome DevTools Protocol (Raw WebSocket)
// ═══════════════════════════════════════════════════════════════════

const CDP = {
  async list(port = 9222) {
    return new Promise(resolve => {
      const req = http.get(`http://127.0.0.1:${port}/json/list`, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve([]); } });
      });
      req.on('error', () => resolve([]));
      req.setTimeout(3000, () => { req.destroy(); resolve([]); });
    });
  },

  async scanAll() {
    const all = [];
    await Promise.all(CDP_PORTS.map(async port => {
      const pages = await CDP.list(port);
      for (const p of pages) {
        if (p.type === 'page' && p.webSocketDebuggerUrl) {
          all.push({ port, title: p.title || '', url: p.url || '', wsUrl: p.webSocketDebuggerUrl });
        }
      }
    }));
    return all;
  },

  sendRawWs(wsUrl, commands) {
    return new Promise(resolve => {
      const timeout = setTimeout(() => resolve(false), 5000);
      try {
        const parsed = new URL(wsUrl);
        const key = crypto.randomBytes(16).toString('base64');
        const socket = net.createConnection(parseInt(parsed.port) || 80, parsed.hostname, () => {
          socket.write(
            `GET ${parsed.pathname} HTTP/1.1\r\n` +
            `Host: ${parsed.host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n` +
            `Sec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`
          );
        });

        let handshakeDone = false;
        let msgId = 1;
        let responseData = '';

        function sendFrame(data) {
          const payload = Buffer.from(JSON.stringify(data));
          const mask = crypto.randomBytes(4);
          let header;
          if (payload.length < 126) {
            header = Buffer.alloc(6);
            header[0] = 0x81; header[1] = 0x80 | payload.length;
            mask.copy(header, 2);
          } else if (payload.length < 65536) {
            header = Buffer.alloc(8);
            header[0] = 0x81; header[1] = 0x80 | 126;
            header.writeUInt16BE(payload.length, 2);
            mask.copy(header, 4);
          } else {
            header = Buffer.alloc(14);
            header[0] = 0x81; header[1] = 0x80 | 127;
            header.writeBigUInt64BE(BigInt(payload.length), 2);
            mask.copy(header, 10);
          }
          const masked = Buffer.alloc(payload.length);
          for (let i = 0; i < payload.length; i++) masked[i] = payload[i] ^ mask[i % 4];
          socket.write(Buffer.concat([header, masked]));
        }

        function closeWs() {
          try {
            const close = Buffer.alloc(6);
            close[0] = 0x88; close[1] = 0x80;
            crypto.randomBytes(4).copy(close, 2);
            socket.write(close);
          } catch {}
          setTimeout(() => { socket.destroy(); clearTimeout(timeout); resolve(true); }, 50);
        }

        socket.on('data', data => {
          if (!handshakeDone) {
            if (data.toString('utf8').includes('101')) {
              handshakeDone = true;
              // Execute commands sequentially with delays
              let i = 0;
              function next() {
                if (i >= commands.length) { setTimeout(closeWs, 100); return; }
                const cmd = commands[i++];
                if (cmd.delay) { setTimeout(next, cmd.delay); return; }
                sendFrame({ id: msgId++, ...cmd });
                setTimeout(next, 30);
              }
              next();
            } else {
              clearTimeout(timeout); socket.destroy(); resolve(false);
            }
          }
        });
        socket.on('error', () => { clearTimeout(timeout); try { socket.destroy(); } catch {} resolve(false); });
      } catch { clearTimeout(timeout); resolve(false); }
    });
  },

  async run(wsUrl) {
    return CDP.sendRawWs(wsUrl, [
      // Escape
      { method: 'Input.dispatchKeyEvent', params: { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 } },
      { method: 'Input.dispatchKeyEvent', params: { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 } },
      { delay: 150 },
      // Alt+Enter
      { method: 'Input.dispatchKeyEvent', params: { type: 'keyDown', modifiers: 1, key: 'Alt', code: 'AltLeft', windowsVirtualKeyCode: 18 } },
      { method: 'Input.dispatchKeyEvent', params: { type: 'keyDown', modifiers: 1, key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 } },
      { method: 'Input.dispatchKeyEvent', params: { type: 'keyUp', modifiers: 1, key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 } },
      { method: 'Input.dispatchKeyEvent', params: { type: 'keyUp', modifiers: 0, key: 'Alt', code: 'AltLeft', windowsVirtualKeyCode: 18 } },
    ]);
  },

  async runAll(port) {
    const targets = port ? await CDP.list(port) : await CDP.scanAll();
    const valid = (Array.isArray(targets) ? targets : [])
      .filter(t => t.title && !t.title.includes('Launchpad'));
    let sent = 0;
    for (const t of valid) {
      const wsUrl = t.wsUrl || t.webSocketDebuggerUrl;
      if (wsUrl && await CDP.run(wsUrl)) sent++;
    }
    return { sent, total: valid.length };
  },

  async snap(port = 9222, keyword = null) {
    const pages = await CDP.list(port);
    const target = keyword
      ? pages.find(p => p.title?.toLowerCase().includes(keyword.toLowerCase()))
      : pages.find(p => p.type === 'page' && !p.title?.includes('Launchpad'));
    if (!target) return { ok: false, error: 'No matching target' };
    // Use CDP Page.captureScreenshot through raw WS — simplified version
    return { ok: true, target: target.title, wsUrl: target.webSocketDebuggerUrl };
  },
};

// ═══════════════════════════════════════════════════════════════════
//  HEART — 스케줄러 + 작업 큐
// ═══════════════════════════════════════════════════════════════════

function loadJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return fallback; }
}
function saveJson(p, data) { fs.writeFileSync(p, JSON.stringify(data, null, 2)); }

const Heart = {
  loadQueue() { return loadJson(TASK_QUEUE_PATH, { queue: [], completed: [], failed: [] }); },
  saveQueue(q) { saveJson(TASK_QUEUE_PATH, q); },

  addTask(instruction, id = null) {
    const q = Heart.loadQueue();
    const task = { id: id || `task-${Date.now()}`, instruction, createdAt: new Date().toISOString() };
    q.queue.push(task);
    Heart.saveQueue(q);
    return task;
  },

  appendLog(entry) {
    const log = loadJson(HEARTBEAT_LOG_PATH, []);
    log.push({ ...entry, timestamp: new Date().toISOString() });
    while (log.length > 500) log.shift();
    saveJson(HEARTBEAT_LOG_PATH, log);
  },

  async beat() {
    const start = Date.now();
    const log = { type: 'heartbeat', services: {}, bots: {}, tasks_processed: 0, tasks_failed: 0 };

    console.log(`\n${'═'.repeat(50)}`);
    console.log(`  🦋 NAVA HEARTBEAT — ${new Date().toLocaleString('ko-KR')}`);
    console.log(`${'═'.repeat(50)}`);

    // 1) Exodia 서비스 상태
    console.log('\n[1/4] Exodia 서비스...');
    try {
      const st = await Nerve.status();
      for (const [k, v] of Object.entries(st)) {
        console.log(`  ${v.ok ? '✅' : '❌'} ${k}: ${v.ok ? 'OK' : v.error}`);
        log.services[k] = v.ok;
      }
    } catch (e) { console.log(`  ❌ ${e.message}`); }

    // 2) 클론컴 SSH
    console.log('\n[2/4] 클론컴 SSH...');
    const sshResult = Comm.ssh('echo OK');
    console.log(`  ${sshResult.ok ? '✅' : '❌'} SSH: ${sshResult.ok ? 'connected' : sshResult.error}`);
    log.ssh = sshResult.ok;

    // 3) 자식봇 상태
    console.log('\n[3/4] 자식봇...');
    try {
      const bots = await Comm.botStatus();
      for (const [k, v] of Object.entries(bots)) {
        console.log(`  ${v.ok ? '✅' : '❌'} ${v.emoji} ${v.name}: ${v.ok ? 'OK' : v.error || 'offline'}`);
        log.bots[k] = v.ok;
      }
    } catch (e) { console.log(`  ❌ ${e.message}`); }

    // 4) 작업 큐
    console.log('\n[4/4] 작업 큐...');
    const q = Heart.loadQueue();
    console.log(`  📋 대기: ${q.queue.length} | 완료: ${q.completed.length} | 실패: ${q.failed.length}`);

    if (q.queue.length > 0) {
      while (q.queue.length > 0) {
        const task = q.queue.shift();
        console.log(`  ▶ ${task.id}: ${task.instruction?.slice(0, 60)}`);
        try {
          const result = await Brain.execute(task);
          task.result = result;
          task.completedAt = new Date().toISOString();
          q.completed.push(task);
          log.tasks_processed++;
        } catch (e) {
          task.error = e.message;
          task.failedAt = new Date().toISOString();
          q.failed.push(task);
          log.tasks_failed++;
        }
        Heart.saveQueue(q);
      }
    }

    log.duration_ms = Date.now() - start;
    Heart.appendLog(log);
    console.log(`\n⏱ ${log.duration_ms}ms`);
    console.log(`${'═'.repeat(50)}\n`);
    return log;
  },
};

// ═══════════════════════════════════════════════════════════════════
//  BRAIN — 자율 워크플로우 (6단계 파이프라인)
// ═══════════════════════════════════════════════════════════════════

const MAX_RETRIES = 3;

const Brain = {
  appendLog(entry) {
    const log = loadJson(WORKFLOW_LOG_PATH, []);
    log.push({ ...entry, timestamp: new Date().toISOString() });
    while (log.length > 200) log.shift();
    saveJson(WORKFLOW_LOG_PATH, log);
  },

  async execute(task) {
    const start = Date.now();
    const instruction = task.instruction || task.description || '';
    console.log(`\n──── Workflow Start ────`);
    console.log(`  Task: ${instruction.slice(0, 80)}`);

    let lastReport = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 1) console.log(`\n  🔄 재시도 ${attempt}/${MAX_RETRIES}`);
      try {
        // Stage 1: Wake
        console.log('  [1/6] Wake...');
        const st = await Nerve.status();
        const alive = Object.values(st).filter(s => s.ok).length;
        console.log(`        ${alive}/${Object.keys(st).length} online`);
        if (alive === 0) throw new Error('모든 서비스 오프라인');

        // Stage 2: Recall
        console.log('  [2/6] Recall...');
        let memory = null;
        try { memory = await Nerve.recall(instruction); } catch {}

        // Stage 3: Perceive
        console.log('  [3/6] Perceive...');
        let vision = null;
        try { vision = await Nerve.see({ analyze: true }); }
        catch { try { await Nerve.see({ save: true }); } catch {} }

        // Stage 4: Think
        console.log('  [4/6] Think...');
        let prompt = `[Nava Workflow]\nInstruction: ${instruction}\n`;
        if (vision?.element_count) prompt += `Screen: ${vision.element_count} elements\n`;
        prompt += `Respond with JSON: { "actions": [...], "reasoning": "...", "done": bool }`;

        let plan = null;
        try {
          const resp = await Nerve.think(prompt, { timeout: 120 });
          const raw = resp.response || '';
          const m = raw.match(/\{[\s\S]*"actions"[\s\S]*\}/);
          if (m) try { plan = JSON.parse(m[0]); } catch {}
        } catch {}

        // Stage 5: Act
        console.log('  [5/6] Act...');
        const results = [];
        if (plan?.actions?.length > 0) {
          for (const action of plan.actions) {
            const { type, ...params } = action;
            try {
              const r = await Nerve.act(type, params);
              results.push({ type, ok: true });
              await new Promise(r => setTimeout(r, 500));
            } catch (e) {
              results.push({ type, ok: false, error: e.message });
            }
          }
        }

        // Stage 6: Report
        console.log('  [6/6] Report...');
        lastReport = {
          task: instruction, attempt,
          stages: { wake: alive, recall: !!memory, perceive: !!vision, think: !!plan, act: results.length },
          done: plan?.done || results.every(r => r.ok),
          duration_ms: Date.now() - start,
        };
        Brain.appendLog(lastReport);

        if (lastReport.done) {
          console.log(`  ✅ Complete (attempt ${attempt}, ${lastReport.duration_ms}ms)`);
          return lastReport;
        }
      } catch (e) {
        console.log(`  ❌ ${e.message}`);
        if (attempt >= MAX_RETRIES) {
          lastReport = { task: instruction, error: e.message, attempt, duration_ms: Date.now() - start };
          Brain.appendLog(lastReport);
        }
      }
    }
    console.log(`  ❌ Failed after ${MAX_RETRIES} attempts`);
    return lastReport;
  },
};

// ═══════════════════════════════════════════════════════════════════
//  EYES — 파일 감시 + CDP 자동 Run
// ═══════════════════════════════════════════════════════════════════

const SCRATCH_DIRS = {
  local: 'C:\\Users\\exodia\\.gemini\\antigravity\\scratch',
  exodia: 'C:\\Users\\MIN\\.gemini\\antigravity\\scratch',
};

const Eyes = {
  getChanges(dir, since) {
    const changes = [];
    try {
      const walk = (d, depth = 0) => {
        if (depth > 4) return;
        for (const item of fs.readdirSync(d, { withFileTypes: true })) {
          if (['node_modules', '.git', '.next', 'dist', '.cache', '__pycache__', '.vscode'].includes(item.name)) continue;
          const full = path.join(d, item.name);
          try {
            if (item.isFile()) {
              const stat = fs.statSync(full);
              if (stat.mtimeMs > since) changes.push({ file: path.relative(dir, full), time: stat.mtimeMs });
            } else if (item.isDirectory()) walk(full, depth + 1);
          } catch {}
        }
      };
      walk(dir);
    } catch {}
    return changes.sort((a, b) => b.time - a.time).slice(0, 10);
  },

  async watch(opts = {}) {
    const scratchDir = fs.existsSync(SCRATCH_DIRS.local) ? SCRATCH_DIRS.local : SCRATCH_DIRS.exodia;
    const interval = opts.interval || 8000;
    const debounce = opts.debounce || 2000;

    console.log(`🦋 NAVA Eyes — 감시 모드`);
    console.log(`  디렉토리: ${scratchDir}`);
    console.log(`  주기: ${interval / 1000}초\n`);

    // List projects
    try {
      const dirs = fs.readdirSync(scratchDir, { withFileTypes: true }).filter(d => d.isDirectory());
      dirs.forEach(d => console.log(`  📂 ${d.name}`));
    } catch { console.log('  ❌ 스크래치 디렉토리 없음'); return; }

    let checks = 0, runs = 0, lastRun = 0;
    const timers = {};

    setInterval(async () => {
      checks++;
      const now = Date.now();
      try {
        const dirs = fs.readdirSync(scratchDir, { withFileTypes: true }).filter(d => d.isDirectory());
        for (const d of dirs) {
          const full = path.join(scratchDir, d.name);
          const changes = Eyes.getChanges(full, now - interval - 2000);
          if (changes.length > 0) {
            const files = changes.slice(0, 3).map(c => path.basename(c.file)).join(', ');
            console.log(`  📝 ${d.name}: ${files}`);
            if (timers[d.name]) clearTimeout(timers[d.name]);
            timers[d.name] = setTimeout(async () => {
              const r = await CDP.runAll();
              runs++;
              lastRun = Date.now();
              console.log(`  🤚 Run ${r.sent}/${r.total}창`);
            }, debounce);
          }
        }
      } catch {}

      if (checks % 60 === 0) {
        const mem = process.memoryUsage();
        console.log(`  📊 ${new Date().toLocaleTimeString('ko-KR')} | checks:${checks} runs:${runs} | RSS:${Math.round(mem.rss / 1048576)}MB`);
      }
    }, interval);

    // Keep alive
    setInterval(() => {}, 1 << 30);
  },
};

// ═══════════════════════════════════════════════════════════════════
//  STATUS — 전체 시스템 한눈에
// ═══════════════════════════════════════════════════════════════════

async function fullStatus() {
  console.log(`\n🦋 NAVA System Status — ${new Date().toLocaleString('ko-KR')}`);
  console.log(`${'═'.repeat(55)}`);

  // Exodia Services
  console.log('\n📡 Exodia Services:');
  try {
    const st = await Nerve.status();
    for (const [k, v] of Object.entries(st)) {
      console.log(`  ${v.ok ? '✅' : '❌'} ${SERVICES[k].name} (:${SERVICES[k].port})`);
    }
  } catch (e) { console.log(`  ❌ Unreachable: ${e.message}`); }

  // Clone Computer SSH
  console.log('\n💻 Clone Computer:');
  const ssh = Comm.ssh('echo OK');
  console.log(`  ${ssh.ok ? '✅' : '❌'} SSH ${CLONE_USER}@${CLONE_HOST}`);

  // Child Bots
  console.log('\n🤖 Child Bots:');
  try {
    const bots = await Comm.botStatus();
    for (const [, v] of Object.entries(bots)) {
      console.log(`  ${v.ok ? '✅' : '❌'} ${v.emoji} ${v.name}`);
    }
  } catch { console.log('  ❌ Unreachable'); }

  // CDP Targets
  console.log('\n🎯 CDP Targets:');
  const cdp = await CDP.scanAll();
  if (cdp.length === 0) console.log('  (없음)');
  else cdp.forEach(t => console.log(`  ✅ :${t.port} ${t.title.slice(0, 45)}`));

  console.log(`\n${'═'.repeat(55)}\n`);
}

// ═══════════════════════════════════════════════════════════════════
//  CLI
// ═══════════════════════════════════════════════════════════════════

const [,, cmd, ...args] = process.argv;
const print = d => console.log(JSON.stringify(d, null, 2));

const COMMANDS = {
  // Status
  status:   () => fullStatus(),

  // Nerve — Exodia control
  see:      () => Nerve.see({ analyze: args.includes('--analyze'), save: args.includes('--save') }).then(print),
  click:    () => Nerve.act('click', { x: +args[0], y: +args[1] }).then(print),
  type:     () => Nerve.act('type', { text: args.join(' ') }).then(print),
  hotkey:   () => Nerve.act('hotkey', { keys: args }).then(print),
  scroll:   () => Nerve.act('scroll', { amount: +args[0] || 3 }).then(print),
  think:    () => Nerve.think(args.join(' ')).then(print),
  search:   () => Nerve.search(args.join(' ')).then(print),
  remember: () => Nerve.remember(args.join(' ')).then(print),
  recall:   () => Nerve.recall(args.join(' ')).then(print),
  monitor:  () => Nerve.monitor(args[0] || 'stats').then(print),
  hide:     () => Nerve.hideAll().then(print),
  show:     () => Nerve.showAll().then(print),
  arrange:  () => Nerve.arrange(+args[0] || 6).then(print),
  windows:  () => Nerve.windows().then(print),

  // Comm — SSH + Bots
  ssh:      async () => print(Comm.ssh(args.join(' '))),
  bot:      () => Comm.bot(args[0], args.slice(1).join(' ')).then(print),
  bots:     () => Comm.botStatus().then(print),

  // CDP
  cdp:      async () => {
    const port = /^\d+$/.test(args[0]) ? +args.shift() : null;
    const sub = args[0] || 'list';
    if (sub === 'list') {
      const targets = port ? await CDP.list(port) : await CDP.scanAll();
      const filtered = targets.filter(t => t.type !== 'service_worker');
      filtered.forEach(t => console.log(`  :${t.port || port} | ${(t.title || '').slice(0, 50)}`));
      console.log(`\n총 ${filtered.length}개`);
    } else if (sub === 'run') {
      const r = await CDP.runAll(port);
      console.log(`🤚 Run: ${r.sent}/${r.total}창`);
    } else if (sub === 'snap') {
      print(await CDP.snap(port || 9222, args[1]));
    }
  },

  // Heart
  heart:    async () => {
    if (args.includes('--once')) { await Heart.beat(); return; }
    const interval = (() => { const i = args.indexOf('--interval'); return i >= 0 ? +args[i + 1] || 30 : 30; })();
    while (true) {
      await Heart.beat();
      console.log(`💤 다음: ${interval}분 후`);
      await new Promise(r => setTimeout(r, interval * 60_000));
    }
  },

  // Queue
  queue:    async () => {
    const sub = args[0] || 'list';
    if (sub === 'list') {
      const q = Heart.loadQueue();
      console.log(`대기: ${q.queue.length} | 완료: ${q.completed.length} | 실패: ${q.failed.length}`);
      q.queue.forEach(t => console.log(`  📋 ${t.id}: ${t.instruction}`));
    } else if (sub === 'add') {
      const task = Heart.addTask(args.slice(1).join(' '));
      console.log(`✅ 추가: ${task.id}`);
    } else if (sub === 'clear') {
      Heart.saveQueue({ queue: [], completed: [], failed: [] });
      console.log('🗑️ 큐 초기화');
    }
  },

  // Brain
  workflow: async () => print(await Brain.execute({ instruction: args.join(' '), id: `cli-${Date.now()}` })),

  // Eyes
  eyes:     async () => {
    if (args.includes('--scan')) { const t = await CDP.scanAll(); t.forEach(x => console.log(`  :${x.port} ${x.title}`)); return; }
    await Eyes.watch();
  },

  // Obsidian CLI — 나바의 지식 관리
  obs:      async () => {
    const sub = args.shift() || 'help';
    const obsCmd = [sub, ...args].join(' ');
    const obsPath = 'C:\\Users\\exodia\\AppData\\Local\\Programs\\Obsidian\\Obsidian.com';
    try {
      // Windows .com 파일은 cmd.exe로 실행해야 함
      const result = execSync(`"${obsPath}" ${obsCmd}`, {
        encoding: 'utf-8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'],
        shell: process.env.COMSPEC || 'C:\\Windows\\System32\\cmd.exe',
      });
      console.log(result.trim());
    } catch (e) {
      if (e.stdout) console.log(e.stdout.trim());
      if (e.stderr) console.error(e.stderr.trim());
      else console.error(`❌ Obsidian CLI 오류: ${e.message}`);
    }
  },
};

// ─── Execute ────────────────────────────────────────────────────
if (!cmd || !COMMANDS[cmd]) {
  console.log(`
🦋 NAVA — 나바 통합 시스템
${'═'.repeat(50)}
  status              전체 시스템 상태
  ─── Exodia 제어 ───
  see [--analyze]     스크린샷 / OmniParser
  click <x> <y>       클릭
  type <text>         타이핑
  hotkey <k1> <k2>    단축키
  scroll <n>          스크롤
  think <msg>         Brain Bridge → Claude
  search <query>      Tavily 웹 검색
  remember <text>     Cognee 기억 저장
  recall <query>      Cognee 기억 검색
  monitor [stats]     AgentOps 통계
  hide / show         창 숨김/표시
  arrange [n]         창 배열
  windows             창 목록
  ─── 통신 ───
  ssh <command>       클론컴 SSH
  bot <name> <msg>    자식봇 메시지
  bots                자식봇 상태
  ─── CDP ───
  cdp [port] list     타겟 목록
  cdp [port] run      Auto-Run
  cdp [port] snap     스크린샷
  ─── 자율 ───
  heart [--once]      하트비트
  queue add|list|clear 작업 큐
  workflow <task>     6단계 파이프라인
  eyes [--scan]       파일 감시
  ─── Obsidian ───
  obs daily            오늘의 노트
  obs search <query>   노트 검색
  obs read [file=name] 노트 읽기
  obs create name=X    노트 생성
  obs <any command>    Obsidian CLI 직접 실행
${'═'.repeat(50)}
`);
  process.exit(0);
}

COMMANDS[cmd]().catch(e => { console.error(`❌ ${e.message}`); process.exit(1); });
