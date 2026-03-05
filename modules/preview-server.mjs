/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Live Preview Server v8.0                                    ║
 * ║  One-command local server + comparison mode                  ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ico': 'image/x-icon',
};

/**
 * Start a live preview server for the clone output
 */
export async function startPreviewServer(outputDir, opts = {}) {
    const { port = 3456, originalUrl, open = false } = opts;

    const cloneDir = path.join(outputDir, 'clone');
    const assetsDir = path.join(outputDir, 'assets');

    // Check if clone exists
    try {
        await fs.access(path.join(cloneDir, 'index.html'));
    } catch {
        throw new Error(`No clone found at ${cloneDir}. Run 'design-dna analyze <url> --clone' first.`);
    }

    const server = http.createServer(async (req, res) => {
        let reqPath = decodeURIComponent(req.url.split('?')[0]);

        // ═══ Special routes ═══
        if (reqPath === '/__compare' && originalUrl) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(generateComparisonPage(originalUrl, port));
            return;
        }

        if (reqPath === '/__livereload') {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            });
            // Keep connection alive for SSE
            const interval = setInterval(() => res.write('data: ping\n\n'), 5000);
            req.on('close', () => clearInterval(interval));
            return;
        }

        // ═══ Static file serving ═══
        if (reqPath === '/') reqPath = '/index.html';

        // Try clone dir first, then assets dir
        const candidates = [
            path.join(cloneDir, reqPath),
            path.join(assetsDir, reqPath),
            path.join(outputDir, reqPath),
        ];

        for (const filePath of candidates) {
            try {
                const normalized = path.resolve(filePath);
                // Security: prevent directory traversal
                if (!normalized.startsWith(path.resolve(outputDir))) continue;

                const stat = await fs.stat(normalized);
                if (stat.isFile()) {
                    const ext = path.extname(normalized).toLowerCase();
                    const mime = MIME_TYPES[ext] || 'application/octet-stream';

                    res.writeHead(200, {
                        'Content-Type': mime,
                        'Content-Length': stat.size,
                        'Cache-Control': 'no-cache',
                        'Access-Control-Allow-Origin': '*',
                    });

                    const data = await fs.readFile(normalized);
                    res.end(data);
                    return;
                }
            } catch { }
        }

        // 404
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(`<h1>404</h1><p>Not found: ${reqPath}</p><p><a href="/">← Home</a> | <a href="/__compare">Compare Mode</a></p>`);
    });

    return new Promise((resolve, reject) => {
        server.listen(port, () => {
            const info = {
                port,
                url: `http://localhost:${port}`,
                compareUrl: originalUrl ? `http://localhost:${port}/__compare` : null,
                close: () => server.close(),
            };
            resolve(info);
        });
        server.on('error', reject);
    });
}

/**
 * Generate side-by-side comparison page
 */
function generateComparisonPage(originalUrl, port) {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Design-DNA Clone Comparison</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui; background: #0a0a0a; color: #fff; }
        .toolbar { 
            position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
            background: rgba(10,10,10,0.95); border-bottom: 1px solid #333;
            padding: 8px 20px; display: flex; align-items: center; gap: 16px;
            backdrop-filter: blur(10px);
        }
        .toolbar h1 { font-size: 14px; color: #00ff88; }
        .toolbar button {
            background: #222; border: 1px solid #444; color: #fff;
            padding: 6px 14px; border-radius: 6px; cursor: pointer;
            font-size: 12px; transition: all 0.2s;
        }
        .toolbar button:hover { background: #333; border-color: #00ff88; }
        .toolbar button.active { background: #00ff88; color: #000; }
        .toolbar .label { font-size: 11px; color: #888; }
        .frames { display: flex; margin-top: 44px; height: calc(100vh - 44px); }
        .frame-wrap { flex: 1; position: relative; border-right: 2px solid #333; }
        .frame-wrap:last-child { border-right: none; }
        .frame-label {
            position: absolute; top: 4px; left: 12px; z-index: 10;
            font-size: 11px; background: rgba(0,0,0,0.7); padding: 3px 8px;
            border-radius: 4px; color: #888;
        }
        iframe { width: 100%; height: 100%; border: none; background: #fff; }
        .overlay-mode .frame-wrap:nth-child(2) {
            position: absolute; top: 44px; left: 0; right: 0; bottom: 0;
            opacity: 0.5; mix-blend-mode: difference;
        }
        .single-mode .frame-wrap:nth-child(2) { display: none; }
        .single-mode .frame-wrap:nth-child(1) { flex: unset; width: 100%; }
    </style>
</head>
<body>
    <div class="toolbar">
        <h1>⚡ Design-DNA Compare</h1>
        <div class="label">View:</div>
        <button onclick="setMode('split')" id="btn-split" class="active">Split</button>
        <button onclick="setMode('overlay')" id="btn-overlay">Overlay</button>
        <button onclick="setMode('single')" id="btn-single">Clone Only</button>
        <div class="label" style="margin-left:auto">Original: ${originalUrl}</div>
    </div>
    <div class="frames" id="frames">
        <div class="frame-wrap">
            <div class="frame-label">ORIGINAL</div>
            <iframe src="${originalUrl}" sandbox="allow-scripts allow-same-origin"></iframe>
        </div>
        <div class="frame-wrap">
            <div class="frame-label">CLONE</div>
            <iframe src="http://localhost:${port}/"></iframe>
        </div>
    </div>
    <script>
        function setMode(mode) {
            const el = document.getElementById('frames');
            el.className = 'frames' + (mode !== 'split' ? ' ' + mode + '-mode' : '');
            document.querySelectorAll('.toolbar button').forEach(b => b.classList.remove('active'));
            document.getElementById('btn-' + mode).classList.add('active');
        }
    </script>
</body>
</html>`;
}
