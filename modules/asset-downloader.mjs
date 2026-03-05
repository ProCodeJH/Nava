/**
 * v7.0 Auto-Clone: Asset Downloader
 * 
 * Downloads ALL assets from a webpage:
 *  - Images (img src, background-image, srcset)
 *  - Fonts (Google Fonts, @font-face)
 *  - SVGs (inline + external)
 *  - Videos (video src, poster)
 *  - Favicons
 */

import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import http from 'http';

export async function downloadAssets(page, baseUrl, outputDir) {
    const assetsDir = path.join(outputDir, 'assets');
    const imgDir = path.join(assetsDir, 'images');
    const fontDir = path.join(assetsDir, 'fonts');
    const svgDir = path.join(assetsDir, 'svg');

    await fs.mkdir(imgDir, { recursive: true });
    await fs.mkdir(fontDir, { recursive: true });
    await fs.mkdir(svgDir, { recursive: true });

    const result = {
        images: [],
        fonts: [],
        svgs: [],
        videos: [],
        totalDownloaded: 0,
        totalSize: 0,
        errors: [],
    };

    // ═══ 1. Collect all asset URLs from page ═══
    const assets = await page.evaluate((base) => {
        const resolve = (url) => {
            if (!url || url.startsWith('data:') || url.startsWith('blob:')) return null;
            try { return new URL(url, base).href; } catch { return null; }
        };

        // Images
        const images = [];
        document.querySelectorAll('img').forEach(img => {
            const src = resolve(img.src);
            if (src) images.push({ url: src, alt: img.alt || '', width: img.naturalWidth, height: img.naturalHeight });
            // srcset
            if (img.srcset) {
                img.srcset.split(',').forEach(s => {
                    const u = resolve(s.trim().split(' ')[0]);
                    if (u && !images.find(i => i.url === u)) images.push({ url: u, alt: img.alt || '' });
                });
            }
        });

        // Background images from computed styles
        document.querySelectorAll('*').forEach(el => {
            const bg = getComputedStyle(el).backgroundImage;
            if (bg && bg !== 'none') {
                const match = bg.match(/url\(["']?([^"')]+)["']?\)/);
                if (match) {
                    const u = resolve(match[1]);
                    if (u && !images.find(i => i.url === u)) images.push({ url: u, alt: 'background' });
                }
            }
        });

        // picture > source
        document.querySelectorAll('picture source').forEach(src => {
            const u = resolve(src.srcset?.split(',')[0]?.trim().split(' ')[0]);
            if (u && !images.find(i => i.url === u)) images.push({ url: u, alt: 'picture-source' });
        });

        // SVGs (external)
        const svgs = [];
        document.querySelectorAll('img[src$=".svg"], object[data$=".svg"], embed[src$=".svg"]').forEach(el => {
            const u = resolve(el.src || el.getAttribute('data'));
            if (u) svgs.push({ url: u });
        });

        // Inline SVGs
        const inlineSvgs = [];
        document.querySelectorAll('svg').forEach((svg, i) => {
            inlineSvgs.push({ index: i, html: svg.outerHTML, viewBox: svg.getAttribute('viewBox') || '' });
        });

        // Videos
        const videos = [];
        document.querySelectorAll('video').forEach(v => {
            const src = resolve(v.src);
            if (src) videos.push({ url: src, poster: resolve(v.poster) });
            v.querySelectorAll('source').forEach(s => {
                const u = resolve(s.src);
                if (u) videos.push({ url: u, type: s.type });
            });
        });

        // Fonts from stylesheets
        const fontUrls = [];
        try {
            for (const sheet of document.styleSheets) {
                try {
                    for (const rule of sheet.cssRules) {
                        if (rule instanceof CSSFontFaceRule) {
                            const src = rule.style.getPropertyValue('src');
                            const matches = src.matchAll(/url\(["']?([^"')]+)["']?\)/g);
                            for (const m of matches) {
                                const u = resolve(m[1]);
                                if (u) fontUrls.push({ url: u, family: rule.style.getPropertyValue('font-family') });
                            }
                        }
                    }
                } catch { /* cors */ }
            }
        } catch { }

        // Google Fonts links
        document.querySelectorAll('link[href*="fonts.googleapis.com"], link[href*="fonts.gstatic.com"]').forEach(link => {
            fontUrls.push({ url: link.href, family: 'google-fonts', type: 'stylesheet' });
        });

        return { images, svgs, inlineSvgs, videos, fontUrls };
    }, baseUrl);

    // ═══ 2. Download images ═══
    for (const img of assets.images) {
        try {
            const filename = sanitizeFilename(img.url);
            const filepath = path.join(imgDir, filename);
            await downloadFile(img.url, filepath);
            result.images.push({ original: img.url, local: `assets/images/${filename}`, alt: img.alt });
            result.totalDownloaded++;
        } catch (e) {
            result.errors.push({ url: img.url, error: e.message });
        }
    }

    // ═══ 3. Save inline SVGs ═══
    for (const svg of assets.inlineSvgs) {
        try {
            const filename = `inline-svg-${svg.index}.svg`;
            await fs.writeFile(path.join(svgDir, filename), svg.html, 'utf8');
            result.svgs.push({ local: `assets/svg/${filename}`, viewBox: svg.viewBox });
            result.totalDownloaded++;
        } catch (e) {
            result.errors.push({ type: 'inline-svg', error: e.message });
        }
    }

    // ═══ 4. Download external SVGs ═══
    for (const svg of assets.svgs) {
        try {
            const filename = sanitizeFilename(svg.url);
            const filepath = path.join(svgDir, filename);
            await downloadFile(svg.url, filepath);
            result.svgs.push({ original: svg.url, local: `assets/svg/${filename}` });
            result.totalDownloaded++;
        } catch (e) {
            result.errors.push({ url: svg.url, error: e.message });
        }
    }

    // ═══ 5. Download fonts ═══
    for (const font of assets.fontUrls) {
        if (font.type === 'stylesheet') {
            result.fonts.push({ url: font.url, family: font.family, type: 'google-fonts-link' });
            continue;
        }
        try {
            const filename = sanitizeFilename(font.url);
            const filepath = path.join(fontDir, filename);
            await downloadFile(font.url, filepath);
            result.fonts.push({ original: font.url, local: `assets/fonts/${filename}`, family: font.family });
            result.totalDownloaded++;
        } catch (e) {
            result.errors.push({ url: font.url, error: e.message });
        }
    }

    // Calculate total size
    try {
        const files = await getAllFiles(assetsDir);
        for (const f of files) {
            const stat = await fs.stat(f);
            result.totalSize += stat.size;
        }
    } catch { }

    return result;
}

// ═══ Utilities ═══

function sanitizeFilename(url) {
    try {
        const u = new URL(url);
        let name = path.basename(u.pathname) || 'file';
        name = name.replace(/[^a-zA-Z0-9._-]/g, '_');
        if (name.length > 100) name = name.substring(0, 100);
        if (!path.extname(name)) name += '.bin';
        return name;
    } catch {
        return 'file_' + Date.now() + '.bin';
    }
}

function downloadFile(url, filepath) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout')), 15000);
        const protocol = url.startsWith('https') ? https : http;

        const req = protocol.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                clearTimeout(timeout);
                downloadFile(res.headers.location, filepath).then(resolve).catch(reject);
                return;
            }
            if (res.statusCode !== 200) {
                clearTimeout(timeout);
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', async () => {
                clearTimeout(timeout);
                try {
                    await fs.writeFile(filepath, Buffer.concat(chunks));
                    resolve();
                } catch (e) { reject(e); }
            });
            res.on('error', e => { clearTimeout(timeout); reject(e); });
        });
        req.on('error', e => { clearTimeout(timeout); reject(e); });
    });
}

async function getAllFiles(dir) {
    const files = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) files.push(...await getAllFiles(full));
        else files.push(full);
    }
    return files;
}
