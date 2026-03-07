/**
 * CloneEngine — Browser Pool
 * Manages Puppeteer browser instances for crawling.
 * Wraps stealth-browser.mjs for anti-detection.
 */

import { createStealthBrowser, applyStealthPatches } from './stealth-browser.mjs';

let _browser = null;
let _pages = {};

export function getBrowserPool(options = {}) {
    const viewportWidth = options.viewportWidth || 1920;
    const viewportHeight = options.viewportHeight || 1080;

    return {
        async init() {
            if (_browser) return;
            const { browser } = await createStealthBrowser({
                headless: options.headless !== false ? true : false,
            });
            _browser = browser;
        },

        async navigateTo(name, url, opts = {}) {
            if (!_browser) await this.init();
            const page = await _browser.newPage();
            await page.setViewport({ width: viewportWidth, height: viewportHeight });

            // Apply stealth patches if available
            try { await applyStealthPatches(page); } catch {}

            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: opts.timeout || 60000,
            });
            _pages[name] = page;
            return page;
        },

        async screenshotSection(name, rect, outputPath) {
            const page = _pages[name];
            if (!page) throw new Error(`No page named "${name}"`);
            await page.screenshot({
                path: outputPath,
                clip: { x: rect.x, y: rect.y, width: rect.w, height: rect.h },
            });
        },

        async screenshotFullPage(name, outputPath) {
            const page = _pages[name];
            if (!page) throw new Error(`No page named "${name}"`);
            await page.screenshot({ path: outputPath, fullPage: true });
        },

        async releasePage(name) {
            const page = _pages[name];
            if (page) {
                try { await page.close(); } catch {}
                delete _pages[name];
            }
        },
    };
}

export async function closeBrowserPool() {
    if (_browser) {
        try { await _browser.close(); } catch {}
        _browser = null;
        _pages = {};
    }
}
