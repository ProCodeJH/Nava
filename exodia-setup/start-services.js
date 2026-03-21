import { spawn } from 'child_process';
import http from 'http';

const PYTHON = 'C:/Users/exodia/.local/bin/python312/python.exe';
const SCRIPT_DIR = 'C:/Users/exodia/.local/bin/Nava/Nava/exodia-scripts';

const services = [
  { name: 'Screen',      cmd: PYTHON, args: ['screen_service.py'], port: 7778 },
  { name: 'Orchestrator', cmd: PYTHON, args: ['orchestrator.py'],  port: 7779 },
  { name: 'BrainBridge',  cmd: 'node', args: ['brain_bridge.js', '--server', '7780'], port: 7780 },
  { name: 'HideDaemon',   cmd: PYTHON, args: ['hide-daemon.py'],   port: 7781 },
];

async function isRunning(port) {
  return new Promise(resolve => {
    const req = http.get(`http://localhost:${port}/`, { timeout: 2000 }, () => resolve(true));
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

for (const svc of services) {
  if (await isRunning(svc.port)) {
    process.stderr.write(`[OK] ${svc.name} :${svc.port} already running\n`);
    continue;
  }
  const proc = spawn(svc.cmd, svc.args, { cwd: SCRIPT_DIR, detached: true, stdio: 'ignore' });
  proc.unref();
  process.stderr.write(`[START] ${svc.name} :${svc.port} pid=${proc.pid}\n`);
}
