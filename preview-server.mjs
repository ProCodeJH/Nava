import http from 'http';
import fs from 'fs';
import path from 'path';

const DIR = process.argv[2] || 'C:\\Users\\louis\\.gemini\\antigravity\\scratch\\design-dna\\projects\\clone-1771561985227\\clone';
const ASSETS = DIR.replace('\\clone', '\\assets');
const PORT = parseInt(process.argv[3]) || 4001;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.mp4': 'video/mp4',
};

http.createServer((req, res) => {
    let url = decodeURIComponent(req.url.split('?')[0]);
    if (url === '/') url = '/index.html';
    
    // Try clone dir first, then assets
    let filePath = path.join(DIR, url);
    if (!fs.existsSync(filePath)) {
        // Try assets subfolders
        const assetName = path.basename(url);
        for (const sub of ['images', 'fonts', 'svg', 'lottie', '']) {
            const tryPath = path.join(ASSETS, sub, assetName);
            if (fs.existsSync(tryPath)) { filePath = tryPath; break; }
        }
        // Try direct assets path
        if (!fs.existsSync(filePath)) {
            filePath = path.join(ASSETS, url.replace(/^\/assets\//, ''));
        }
    }
    
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
    } else {
        res.writeHead(404);
        res.end('Not found: ' + url);
    }
}).listen(PORT, () => {
    console.log(`Clone preview: http://localhost:${PORT}`);
});
