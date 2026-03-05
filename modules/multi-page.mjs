/**
 * Upgrade 5: Multi-Page Crawl
 * Discovers and analyzes all pages on a site via sitemap or internal links
 */

export async function discoverPages(page, baseUrl) {
    const discovered = new Set();
    discovered.add(baseUrl);

    // ── Try sitemap.xml first ──
    try {
        const sitemapUrl = new URL('/sitemap.xml', baseUrl).href;
        const response = await page.goto(sitemapUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
        if (response && response.ok()) {
            const urls = await page.evaluate(() => {
                const locs = document.querySelectorAll('loc');
                return [...locs].map(l => l.textContent?.trim()).filter(Boolean);
            });
            urls.forEach(u => discovered.add(u));
        }
    } catch (e) { /* no sitemap */ }

    // ── Crawl internal links ──
    try {
        await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 2000));

        const internalLinks = await page.evaluate((base) => {
            const hostname = new URL(base).hostname;
            const links = new Set();

            document.querySelectorAll('a[href]').forEach(a => {
                try {
                    const url = new URL(a.href, base);
                    if (url.hostname === hostname) {
                        // Clean URL — remove hash and trailing slash
                        url.hash = '';
                        let clean = url.href.replace(/\/$/, '');
                        links.add(clean);
                    }
                } catch (e) { }
            });

            return [...links];
        }, baseUrl);

        internalLinks.forEach(u => discovered.add(u));
    } catch (e) { }

    // Filter out asset URLs and duplicates
    const filtered = [...discovered].filter(url => {
        const lower = url.toLowerCase();
        return !lower.match(/\.(jpg|jpeg|png|gif|svg|webp|mp4|pdf|zip|css|js|ico|woff|woff2|ttf|eot)$/);
    });

    return {
        pages: filtered.slice(0, 50), // Max 50 pages
        total: filtered.length,
        fromSitemap: discovered.size > 1,
    };
}

/**
 * Run analysis on multiple pages
 */
export async function analyzeMultiPage(page, pages, analyzeFunc, options = {}) {
    const results = [];
    const maxPages = options.maxPages || 10;
    const pagesToAnalyze = pages.slice(0, maxPages);

    for (const pageUrl of pagesToAnalyze) {
        try {
            await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            await new Promise(r => setTimeout(r, 2000));

            const pageResult = await analyzeFunc(page, pageUrl);
            results.push({
                url: pageUrl,
                status: 'success',
                data: pageResult,
            });
        } catch (e) {
            results.push({
                url: pageUrl,
                status: 'error',
                error: e.message,
            });
        }
    }

    return {
        analyzed: results.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'error').length,
        results,
    };
}
