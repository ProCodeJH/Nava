/**
 * CloneEngine — Asset Downloader
 * Downloads images, fonts, videos from extracted asset URLs.
 * Returns a URL → local path mapping for rewriting in generated code.
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

export async function downloadAllAssets(assets, outputDir, config = {}) {
    const assetsDir = path.join(outputDir, 'assets');
    fs.mkdirSync(path.join(assetsDir, 'images'), { recursive: true });
    fs.mkdirSync(path.join(assetsDir, 'fonts'), { recursive: true });
    fs.mkdirSync(path.join(assetsDir, 'videos'), { recursive: true });

    const urlMap = {};
    const maxDownloads = config.maxAssetDownloads || 200;
    const timeout = config.downloadTimeout || 15000;

    const allUrls = [
        ...(assets.images || []).map(u => ({ url: u, type: 'images' })),
        ...(assets.videos || []).map(u => ({ url: u, type: 'videos' })),
        ...(assets.fontFaces || []).flatMap(f => {
            const urls = [];
            const srcMatch = (f.src || '').matchAll(/url\(["']?([^"')]+)["']?\)/g);
            for (const m of srcMatch) {
                if (!m[1].startsWith('data:')) urls.push({ url: m[1], type: 'fonts' });
            }
            return urls;
        }),
    ].slice(0, maxDownloads);

    const batches = [];
    const batchSize = 10;
    for (let i = 0; i < allUrls.length; i += batchSize) {
        batches.push(allUrls.slice(i, i + batchSize));
    }

    for (const batch of batches) {
        await Promise.allSettled(batch.map(async ({ url, type }) => {
            try {
                const ext = guessExtension(url, type);
                const filename = `${type}-${hashUrl(url)}${ext}`;
                const localPath = path.join(assetsDir, type, filename);
                await downloadFile(url, localPath, timeout);
                const relativePath = `/assets/${type}/${filename}`;
                urlMap[url] = relativePath;
            } catch {}
        }));
    }

    return urlMap;
}

function downloadFile(url, dest, timeout = 15000) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const req = client.get(url, { timeout }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                downloadFile(res.headers.location, dest, timeout).then(resolve).catch(reject);
                return;
            }
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }
            const stream = fs.createWriteStream(dest);
            res.pipe(stream);
            stream.on('finish', () => { stream.close(); resolve(); });
            stream.on('error', reject);
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
}

function hashUrl(url) {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
        hash = ((hash << 5) - hash + url.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36);
}

function guessExtension(url, type) {
    const clean = url.split('?')[0].split('#')[0];
    const ext = path.extname(clean).toLowerCase();
    if (ext && ext.length <= 5) return ext;
    const defaults = { images: '.png', fonts: '.woff2', videos: '.mp4' };
    return defaults[type] || '.bin';
}
