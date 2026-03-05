/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  WebSocket Replay v9.0                                       ║
 * ║  Capture WS messages → generate replay server                ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

import fs from 'fs/promises';
import path from 'path';

export function getWebSocketCaptureScript() {
    return `(function(){if(window.__DNA_WS__)return;window.__DNA_WS__=true;window.__dnaWS={conns:[],msgs:[]};const O=WebSocket;window.WebSocket=function(u,p){const ws=p?new O(u,p):new O(u);const id=window.__dnaWS.conns.length;window.__dnaWS.conns.push({id,url:u,protocols:p||null,ts:Date.now()});ws.addEventListener('message',e=>{window.__dnaWS.msgs.push({id,dir:'in',data:typeof e.data==='string'?e.data.substring(0,5000):'[bin]',ts:Date.now()})});const origSend=ws.send.bind(ws);ws.send=function(d){window.__dnaWS.msgs.push({id,dir:'out',data:typeof d==='string'?d.substring(0,5000):'[bin]',ts:Date.now()});return origSend(d)};return ws};window.WebSocket.CONNECTING=O.CONNECTING;window.WebSocket.OPEN=O.OPEN;window.WebSocket.CLOSING=O.CLOSING;window.WebSocket.CLOSED=O.CLOSED})();`;
}

export async function extractWebSocketData(page) {
    return page.evaluate(() => {
        const d = window.__dnaWS || { conns: [], msgs: [] };
        const hasSocketIO = d.msgs.some(m => m.data?.startsWith('42') || m.data?.startsWith('0{'));
        return {
            connections: d.conns,
            messages: d.msgs.slice(0, 500),
            stats: {
                total: d.conns.length, messages: d.msgs.length,
                incoming: d.msgs.filter(m => m.dir === 'in').length,
                outgoing: d.msgs.filter(m => m.dir === 'out').length,
                protocol: hasSocketIO ? 'socket.io' : 'websocket'
            },
        };
    });
}

export async function saveWSFixtures(wsData, outputDir) {
    const dir = path.join(outputDir, 'mock-server', 'ws-fixtures');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'messages.json'), JSON.stringify(wsData.messages, null, 2));
    await fs.writeFile(path.join(dir, 'connections.json'), JSON.stringify(wsData.connections, null, 2));
    return wsData.stats;
}

export function generateWSReplayCode(wsData) {
    if (!wsData?.stats?.messages) return '';
    return `import{WebSocketServer}from'ws';import fs from'fs';import path from'path';import{fileURLToPath}from'url';const __dirname=path.dirname(fileURLToPath(import.meta.url));export function startWSReplay(server,opts={}){const wss=new WebSocketServer({server,path:'/ws'});let msgs=[];try{msgs=JSON.parse(fs.readFileSync(path.join(__dirname,'ws-fixtures','messages.json'),'utf-8'))}catch{}const incoming=msgs.filter(m=>m.dir==='in');wss.on('connection',ws=>{let i=0;function next(){if(i>=incoming.length){i=0;setTimeout(next,3000);return}try{ws.send(incoming[i].data)}catch{}const d=incoming[i+1]?Math.min(incoming[i+1].ts-incoming[i].ts,5000):3000;i++;setTimeout(next,Math.max(d,100))}setTimeout(next,500);ws.on('message',d=>console.log('[WS]',String(d).substring(0,80)))});console.log('  WS replay: ws://localhost:'+(opts.port||3457)+'/ws');return wss}`;
}
