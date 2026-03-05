/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Multi-Page Clone v8.0                                       ║
 * ║  Crawl + clone entire site with shared assets                ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Crawl internal links and clone multiple pages
 */
export async function cloneMultiplePages(page, baseUrl, outputDir, cloneSinglePage, opts = {}) {
    const { maxPages = 20, spinner, chalk } = opts;
    const parsed = new URL(baseUrl);
    const origin = parsed.origin;
    const visited = new Set();
    const toVisit = [baseUrl];
    const pageResults = [];

    // ═══ 1. Discover all internal links ═══
    const allLinks = await page.evaluate((origin) => {
        const links = new Set();
        document.querySelectorAll('a[href]').forEach(a => {
            try {
                const url = new URL(a.href, window.location.origin);
                if (url.origin === origin && !url.hash && !url.href.match(/\.(pdf|zip|png|jpg|gif|svg|mp4|mp3)$/i)) {
                    // Normalize: remove trailing slash, use pathname
                    const normalized = url.origin + url.pathname.replace(/\/$/, '');
                    links.add(normalized || url.origin);
                }
            } catch { }
        });
        return [...links];
    }, origin);

    for (const link of allLinks) {
        if (!visited.has(link) && toVisit.indexOf(link) === -1) {
            toVisit.push(link);
        }
    }

    // Limit pages
    const pagesToClone = toVisit.slice(0, maxPages);

    if (spinner && chalk) {
        spinner.info(chalk.blue(`[Multi] Discovered ${allLinks.length} internal links, cloning ${pagesToClone.length} pages`));
    }

    // ═══ 2. Clone each page ═══
    const cloneDir = path.join(outputDir, 'clone');
    await fs.mkdir(cloneDir, { recursive: true });

    for (let i = 0; i < pagesToClone.length; i++) {
        const pageUrl = pagesToClone[i];
        visited.add(pageUrl);

        if (spinner && chalk) {
            spinner.start(chalk.blue(`[Multi ${i + 1}/${pagesToClone.length}]`) + ` ${pageUrl}`);
        }

        try {
            await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            await new Promise(r => setTimeout(r, 2000));

            // Get page HTML
            const html = await page.evaluate(() => document.documentElement.outerHTML);

            // Derive filename from URL path
            const urlParsed = new URL(pageUrl);
            let filename = urlParsed.pathname.replace(/^\//, '').replace(/\/$/, '') || 'index';
            filename = filename.replace(/\//g, '-') + '.html';

            await fs.writeFile(path.join(cloneDir, filename), html, 'utf-8');

            pageResults.push({
                url: pageUrl,
                file: filename,
                size: html.length,
                ok: true,
            });

            if (spinner && chalk) {
                spinner.succeed(chalk.blue(`[Multi ${i + 1}/${pagesToClone.length}]`) + ` ${filename} (${Math.round(html.length / 1024)}KB)`);
            }
        } catch (e) {
            pageResults.push({ url: pageUrl, error: e.message?.substring(0, 80), ok: false });
            if (spinner && chalk) {
                spinner.warn(chalk.yellow(`[Multi ${i + 1}] ${pageUrl}: ${e.message?.substring(0, 60)}`));
            }
        }
    }

    // ═══ 3. Remap navigation links ═══
    await remapNavigationLinks(cloneDir, pageResults, origin);

    // Navigate back to original URL
    try {
        await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 2000));
    } catch { }

    return {
        totalDiscovered: allLinks.length,
        totalCloned: pageResults.filter(p => p.ok).length,
        totalFailed: pageResults.filter(p => !p.ok).length,
        pages: pageResults,
    };
}

/**
 * Remap absolute links to local relative links
 */
async function remapNavigationLinks(cloneDir, pageResults, origin) {
    const urlToFile = {};
    for (const p of pageResults) {
        if (p.ok) {
            urlToFile[p.url] = p.file;
            // Also map with trailing slash
            urlToFile[p.url + '/'] = p.file;
        }
    }

    for (const p of pageResults) {
        if (!p.ok) continue;
        const filePath = path.join(cloneDir, p.file);
        try {
            let html = await fs.readFile(filePath, 'utf-8');
            let replaced = 0;

            // Replace href="https://example.com/about" with href="about.html"
            for (const [url, file] of Object.entries(urlToFile)) {
                const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`href=["']${escaped}["']`, 'g');
                const newHref = `href="${file}"`;
                const before = html;
                html = html.replace(regex, newHref);
                if (html !== before) replaced++;
            }

            // Also replace origin-relative paths
            for (const [url, file] of Object.entries(urlToFile)) {
                const relPath = new URL(url).pathname;
                if (relPath && relPath !== '/') {
                    const escaped = relPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`href=["']${escaped}["']`, 'g');
                    html = html.replace(regex, `href="${file}"`);
                }
            }

            if (replaced > 0) {
                await fs.writeFile(filePath, html, 'utf-8');
            }
        } catch { }
    }
}
