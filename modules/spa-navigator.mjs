/**
 * v5.0 Module: SPA Navigator — Client-side route discovery and per-route analysis
 *
 * Features:
 *  - Detect routing library (React Router, Vue Router, Next.js, Nuxt, SvelteKit)
 *  - Discover all internal routes from <a>, <Link>, router config
 *  - Navigate each route programmatically
 *  - Per-route screenshots + mini design token extraction
 *  - Route tree visualization
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Discover routes and optionally analyze each
 */
export async function navigateSPA(page, baseUrl, outputDir, options = {}) {
    const {
        maxRoutes = 20,
        screenshotPerRoute = true,
    } = options;

    const result = {
        routerType: null,
        discoveredRoutes: [],
        routeTree: {},
        analyzedRoutes: [],
    };

    // ═══ 1. Detect Router Type ═══
    result.routerType = await page.evaluate(() => {
        if (document.querySelector('#__next') || window.__NEXT_DATA__) return 'Next.js';
        if (window.__remixContext) return 'Remix';
        if (window.__VUE__) return 'Vue Router';
        if (window.__NUXT__) return 'Nuxt';
        if (document.querySelector('[data-sveltekit-hydrate]')) return 'SvelteKit';
        if (window.___gatsby) return 'Gatsby';
        if (window.ng) return 'Angular';
        if (document.querySelector('[data-astro-cid]')) return 'Astro';
        if (document.querySelectorAll('a[href^="/"]').length > 3) return 'MPA/History API';
        return null;
    });

    // ═══ 2. Discover Routes ═══
    const baseOrigin = new URL(baseUrl).origin;

    const discoveredRoutes = await page.evaluate((origin) => {
        const routes = new Set();

        document.querySelectorAll('a[href]').forEach(a => {
            const href = a.href;
            if (href.startsWith(origin) || href.startsWith('/')) {
                const routePath = href.startsWith(origin) ? href.replace(origin, '') : href;
                if (routePath && !routePath.includes('#') && !routePath.match(/\.(jpg|png|gif|svg|css|js|pdf|zip|mp4|webp)$/i)) {
                    routes.add(routePath || '/');
                }
            }
        });

        if (window.__NEXT_DATA__) {
            try {
                if (window.__NEXT_DATA__.page) routes.add(window.__NEXT_DATA__.page);
                const manifest = window.__NEXT_DATA__.buildManifest || window.__BUILD_MANIFEST__;
                if (manifest) Object.keys(manifest).forEach(k => { if (k.startsWith('/')) routes.add(k); });
            } catch (e) { }
        }

        if (window.__NUXT__) {
            try {
                (window.__NUXT__?.config?.app?.routes || []).forEach(r => { if (r.path) routes.add(r.path); });
            } catch (e) { }
        }

        document.querySelectorAll('nav a[href], [role="navigation"] a[href], header a[href]').forEach(a => {
            const href = a.href;
            if (href.startsWith(origin) || href.startsWith('/')) {
                routes.add(href.startsWith(origin) ? (href.replace(origin, '') || '/') : href);
            }
        });

        return [...routes].slice(0, 50);
    }, baseOrigin);

    result.discoveredRoutes = discoveredRoutes.slice(0, maxRoutes);

    // ═══ 3. Build Route Tree ═══
    const tree = {};
    result.discoveredRoutes.forEach(route => {
        const parts = route.split('/').filter(Boolean);
        let current = tree;
        parts.forEach(part => {
            if (!current[part]) current[part] = {};
            current = current[part];
        });
    });
    result.routeTree = tree;

    // ═══ 4. Navigate & Analyze Each Route ═══
    if (screenshotPerRoute && outputDir) {
        const routeDir = path.join(outputDir, 'route-screenshots');
        await fs.mkdir(routeDir, { recursive: true });

        for (let i = 0; i < Math.min(result.discoveredRoutes.length, maxRoutes); i++) {
            const route = result.discoveredRoutes[i];
            const fullUrl = route.startsWith('http') ? route : baseOrigin + route;

            try {
                await page.goto(fullUrl, { waitUntil: 'networkidle2', timeout: 15000 });
                await new Promise(r => setTimeout(r, 1000));

                const safeName = route.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50) || 'root';
                const screenshotPath = path.join(routeDir, `route-${safeName}.png`);
                await page.screenshot({ path: screenshotPath, fullPage: false });

                const meta = await page.evaluate(() => ({
                    title: document.title,
                    metaDescription: document.querySelector('meta[name="description"]')?.content || null,
                    h1: document.querySelector('h1')?.textContent?.trim()?.substring(0, 80) || null,
                    backgroundColor: getComputedStyle(document.body).backgroundColor,
                    sectionCount: document.querySelectorAll('section, [role="region"]').length,
                    scripts: document.querySelectorAll('script[src]').length,
                }));

                result.analyzedRoutes.push({
                    route,
                    url: fullUrl,
                    title: meta.title,
                    h1: meta.h1,
                    metaDescription: meta.metaDescription,
                    backgroundColor: meta.backgroundColor,
                    sectionCount: meta.sectionCount,
                    scripts: meta.scripts,
                    screenshot: path.basename(screenshotPath),
                });
            } catch (e) {
                result.analyzedRoutes.push({
                    route,
                    error: e.message?.substring(0, 100),
                });
            }
        }

        // Navigate back to original page
        try {
            await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 15000 });
        } catch (e) { }
    }

    return result;
}
