/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Realtime DB Simulator v10.0                                 ║
 * ║  Firebase/Supabase-style real-time data sync                 ║
 * ║  via Server-Sent Events + WebSocket + Polling                ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Injection script to detect realtime services used by the page
 */
export function getRealtimeDetectionScript() {
    return `
    (function() {
        window.__DNA_REALTIME__ = {
            providers: [],
            subscriptions: [],
            firestoreRefs: [],
            supabaseChannels: [],
            pusherChannels: [],
            socketEvents: [],
        };

        // ═══ Firebase/Firestore detection ═══
        const origFetch = window.fetch;
        window.fetch = function(url, opts) {
            const urlStr = typeof url === 'string' ? url : url?.url || '';
            if (urlStr.includes('firestore.googleapis.com') || urlStr.includes('firebaseio.com')) {
                window.__DNA_REALTIME__.providers.push('firebase');
                window.__DNA_REALTIME__.firestoreRefs.push({
                    url: urlStr.substring(0, 200),
                    method: opts?.method || 'GET',
                    ts: Date.now(),
                });
            }
            if (urlStr.includes('supabase.co') || urlStr.includes('supabase.io')) {
                window.__DNA_REALTIME__.providers.push('supabase');
                window.__DNA_REALTIME__.supabaseChannels.push({
                    url: urlStr.substring(0, 200),
                    method: opts?.method || 'GET',
                    ts: Date.now(),
                });
            }
            return origFetch.apply(this, arguments);
        };

        // ═══ EventSource (SSE) detection ═══
        const OrigEventSource = window.EventSource;
        if (OrigEventSource) {
            window.EventSource = function(url, config) {
                window.__DNA_REALTIME__.providers.push('sse');
                const es = new OrigEventSource(url, config);
                const origOn = es.addEventListener.bind(es);
                es.addEventListener = function(event, handler) {
                    window.__DNA_REALTIME__.subscriptions.push({ type: 'sse', event, url });
                    return origOn(event, function(e) {
                        window.__DNA_REALTIME__.socketEvents.push({
                            type: 'sse-message',
                            event,
                            data: (e.data || '').substring(0, 500),
                            ts: Date.now(),
                        });
                        return handler(e);
                    });
                };
                return es;
            };
        }

        // ═══ Pusher detection ═══
        if (window.Pusher) {
            const OrigPusher = window.Pusher;
            window.Pusher = function(key, config) {
                window.__DNA_REALTIME__.providers.push('pusher');
                const pusher = new OrigPusher(key, config);
                const origSubscribe = pusher.subscribe.bind(pusher);
                pusher.subscribe = function(channel) {
                    window.__DNA_REALTIME__.pusherChannels.push(channel);
                    return origSubscribe(channel);
                };
                return pusher;
            };
        }
    })();
    `;
}

/**
 * Extract realtime data from the page
 */
export async function extractRealtimeData(page) {
    return await page.evaluate(() => {
        const data = window.__DNA_REALTIME__ || {};
        data.providers = [...new Set(data.providers || [])];
        data.stats = {
            providers: data.providers.length,
            subscriptions: data.subscriptions?.length || 0,
            firestoreRefs: data.firestoreRefs?.length || 0,
            supabaseChannels: data.supabaseChannels?.length || 0,
            pusherChannels: data.pusherChannels?.length || 0,
            sseEvents: data.socketEvents?.length || 0,
        };
        return data;
    });
}

/**
 * Generate realtime middleware code for Express server
 */
export function generateRealtimeMiddleware(realtimeData, wsData) {
    const hasSSE = realtimeData?.providers?.includes('sse');
    const hasWS = wsData?.stats?.messages > 0;
    const hasFirebase = realtimeData?.providers?.includes('firebase');
    const hasSupabase = realtimeData?.providers?.includes('supabase');

    let code = `/**
 * ═══ Realtime Data Simulator — Design-DNA v10.0 ═══
 * Simulates Firebase/Supabase/SSE real-time data streams
 */

import { WebSocketServer } from 'ws';

export function setupRealtime(server, db) {
    const clients = new Set();

`;

    // SSE endpoint
    code += `    // ═══ Server-Sent Events ═══\n`;
    code += `    server.app.get('/api/realtime/stream', (req, res) => {\n`;
    code += `        res.setHeader('Content-Type', 'text/event-stream');\n`;
    code += `        res.setHeader('Cache-Control', 'no-cache');\n`;
    code += `        res.setHeader('Connection', 'keep-alive');\n`;
    code += `        res.setHeader('Access-Control-Allow-Origin', '*');\n`;
    code += `        res.flushHeaders();\n`;
    code += `        clients.add(res);\n`;
    code += `        req.on('close', () => clients.delete(res));\n`;
    code += `\n`;
    code += `        // Send initial data\n`;
    code += `        res.write('event: connected\\ndata: {"status":"connected"}\\n\\n');\n`;
    code += `\n`;
    code += `        // Simulate periodic updates\n`;
    code += `        const interval = setInterval(() => {\n`;
    code += `            const update = {\n`;
    code += `                type: 'update',\n`;
    code += `                timestamp: new Date().toISOString(),\n`;
    code += `                data: generateMockUpdate(),\n`;
    code += `            };\n`;
    code += `            res.write('event: update\\ndata: ' + JSON.stringify(update) + '\\n\\n');\n`;
    code += `        }, 5000);\n`;
    code += `        req.on('close', () => clearInterval(interval));\n`;
    code += `    });\n\n`;

    // WebSocket realtime
    code += `    // ═══ WebSocket Realtime ═══\n`;
    code += `    const wss = new WebSocketServer({ server: server.httpServer, path: '/realtime' });\n`;
    code += `    wss.on('connection', (ws) => {\n`;
    code += `        ws.send(JSON.stringify({ type: 'connected', ts: Date.now() }));\n`;
    code += `\n`;
    code += `        ws.on('message', (msg) => {\n`;
    code += `            try {\n`;
    code += `                const parsed = JSON.parse(msg);\n`;
    code += `                // Handle subscribe/unsubscribe\n`;
    code += `                if (parsed.type === 'subscribe') {\n`;
    code += `                    ws.channels = ws.channels || new Set();\n`;
    code += `                    ws.channels.add(parsed.channel);\n`;
    code += `                    ws.send(JSON.stringify({ type: 'subscribed', channel: parsed.channel }));\n`;
    code += `                }\n`;
    code += `                // Handle CRUD over WebSocket\n`;
    code += `                if (parsed.type === 'insert' || parsed.type === 'update' || parsed.type === 'delete') {\n`;
    code += `                    broadcast(wss, { type: 'change', operation: parsed.type, data: parsed.data, channel: parsed.channel });\n`;
    code += `                }\n`;
    code += `            } catch {}\n`;
    code += `        });\n`;
    code += `\n`;
    code += `        // Simulate periodic data\n`;
    code += `        const interval = setInterval(() => {\n`;
    code += `            if (ws.readyState === 1) {\n`;
    code += `                ws.send(JSON.stringify({\n`;
    code += `                    type: 'realtime_update',\n`;
    code += `                    data: generateMockUpdate(),\n`;
    code += `                    ts: Date.now(),\n`;
    code += `                }));\n`;
    code += `            }\n`;
    code += `        }, 5000);\n`;
    code += `        ws.on('close', () => clearInterval(interval));\n`;
    code += `    });\n\n`;

    // Firebase REST emulator
    if (hasFirebase) {
        code += `    // ═══ Firebase REST Emulator ═══\n`;
        code += `    server.app.all('/firebase/*', (req, res) => {\n`;
        code += `        const path = req.params[0];\n`;
        code += `        if (req.method === 'GET') {\n`;
        code += `            res.json(db?.data?.[path] || {});\n`;
        code += `        } else if (req.method === 'PUT' || req.method === 'PATCH') {\n`;
        code += `            if (!db.data) db.data = {};\n`;
        code += `            db.data[path] = req.body;\n`;
        code += `            broadcastSSE(clients, { type: 'firebase', path, data: req.body });\n`;
        code += `            res.json(req.body);\n`;
        code += `        } else if (req.method === 'DELETE') {\n`;
        code += `            if (db.data) delete db.data[path];\n`;
        code += `            res.json({ success: true });\n`;
        code += `        }\n`;
        code += `    });\n\n`;
    }

    // Supabase REST emulator
    if (hasSupabase) {
        code += `    // ═══ Supabase REST Emulator ═══\n`;
        code += `    server.app.all('/rest/v1/:table', (req, res) => {\n`;
        code += `        const table = req.params.table;\n`;
        code += `        if (req.method === 'GET') {\n`;
        code += `            try {\n`;
        code += `                const rows = db.prepare('SELECT * FROM ' + table + ' LIMIT 100').all();\n`;
        code += `                res.json(rows);\n`;
        code += `            } catch { res.json([]); }\n`;
        code += `        } else if (req.method === 'POST') {\n`;
        code += `            try {\n`;
        code += `                const fields = Object.keys(req.body);\n`;
        code += `                const result = db.prepare('INSERT INTO ' + table + ' (' + fields.join(',') + ') VALUES (' + fields.map(() => '?').join(',') + ')').run(...fields.map(f => req.body[f]));\n`;
        code += `                broadcastSSE(clients, { type: 'INSERT', table, new: { id: result.lastInsertRowid, ...req.body } });\n`;
        code += `                res.status(201).json({ id: result.lastInsertRowid, ...req.body });\n`;
        code += `            } catch (e) { res.status(400).json({ error: e.message }); }\n`;
        code += `        }\n`;
        code += `    });\n\n`;
    }

    // Helpers
    code += `    function broadcast(wss, data) {\n`;
    code += `        const msg = JSON.stringify(data);\n`;
    code += `        wss.clients.forEach(c => { if (c.readyState === 1) c.send(msg); });\n`;
    code += `    }\n\n`;

    code += `    function broadcastSSE(clients, data) {\n`;
    code += `        const msg = 'event: change\\ndata: ' + JSON.stringify(data) + '\\n\\n';\n`;
    code += `        clients.forEach(c => { try { c.write(msg); } catch {} });\n`;
    code += `    }\n\n`;

    code += `    let counter = 0;\n`;
    code += `    function generateMockUpdate() {\n`;
    code += `        counter++;\n`;
    code += `        return {\n`;
    code += `            id: counter,\n`;
    code += `            value: Math.round(Math.random() * 1000),\n`;
    code += `            message: 'Update #' + counter,\n`;
    code += `            timestamp: new Date().toISOString(),\n`;
    code += `        };\n`;
    code += `    }\n\n`;

    code += `    return { wss, clients };\n`;
    code += `}\n`;

    return code;
}

/**
 * Save realtime middleware to output directory
 */
export async function saveRealtimeMiddleware(outputDir, realtimeData, wsData) {
    const code = generateRealtimeMiddleware(realtimeData, wsData);
    const fsDir = path.join(outputDir, 'fullstack-clone');
    await fs.mkdir(fsDir, { recursive: true });
    await fs.writeFile(path.join(fsDir, 'realtime.mjs'), code, 'utf-8');

    // Update package.json
    const pkgPath = path.join(fsDir, 'package.json');
    try {
        const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
        pkg.dependencies = pkg.dependencies || {};
        pkg.dependencies.ws = '^8.16.0';
        await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2), 'utf-8');
    } catch { }

    return {
        providers: realtimeData?.providers || [],
        hasSSE: true,
        hasWS: true,
        hasFirebase: realtimeData?.providers?.includes('firebase'),
        hasSupabase: realtimeData?.providers?.includes('supabase'),
    };
}
