/**
 * ═══════════════════════════════════════════════════════════════
 *  CLONE ENGINE — STAGE 1: CRAWL
 *  URL → site-snapshot.json
 *
 *  Puppeteer-based extraction:
 *  - DOM tree + computed CSS for every element
 *  - CSS variables, keyframes, font-face
 *  - Scroll animations (differential capture)
 *  - Hover/click interactions, parallax, 3D transforms
 *  - Image/font/asset URL collection
 *  - Responsive screenshots
 * ═══════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';
import { getBrowserPool, closeBrowserPool } from './browser-pool.mjs';
import { downloadAllAssets } from './downloader.mjs';
import { autoScroll, CSS_PROPERTIES, sleep } from './utils.mjs';
import { getLogger } from './logger.mjs';
import { extractFramerDynamics } from './framer-extract.mjs';

const DEFAULT_CONFIG = {
    viewportWidth: 1920,
    viewportHeight: 1080,
    maxSections: 50,
    maxAssetDownloads: 200,
    timeout: 60000,
    downloadTimeout: 15000,
    responsive: true,
    breakpoints: [1920, 1440, 1024, 768, 375],
    minSectionHeight: 50,
    scrollDelay: 150,
};

export async function crawl(targetUrl, options = {}) {
    const log = getLogger();
    const config = { ...DEFAULT_CONFIG, ...options };
    const outputDir = options.outputDir || 'clone-output';
    fs.mkdirSync(outputDir, { recursive: true });

    log.phaseStart('STAGE 1: CRAWL', targetUrl);

    const pool = getBrowserPool({
        viewportWidth: config.viewportWidth,
        viewportHeight: config.viewportHeight,
    });
    await pool.init();

    const page = await pool.navigateTo('crawl', targetUrl, { timeout: config.timeout });
    log.info('Page loaded: ' + targetUrl);

    log.progress('Scrolling to trigger lazy content...');
    await autoScroll(page, config.scrollDelay);
    await sleep(2000);

    log.progress('Extracting DOM structure & computed CSS...');
    const pageData = await extractPageData(page, config);

    log.progress(`Downloading assets (${pageData.assets.images.length} images, ${pageData.assets.videos.length} videos)...`);
    const urlMap = await downloadAllAssets(pageData.assets, outputDir, config);
    pageData.urlMap = urlMap;

    log.progress('Capturing section screenshots...');
    const screenshotsDir = path.join(outputDir, 'screenshots');
    fs.mkdirSync(screenshotsDir, { recursive: true });

    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(500);

    for (let i = 0; i < pageData.sections.length; i++) {
        const section = pageData.sections[i];
        if (section.rect && section.rect.w > 0 && section.rect.h > 0) {
            try {
                await pool.screenshotSection('crawl', section.rect,
                    path.join(screenshotsDir, `section-${i}.png`));
            } catch {}
        }
    }

    try {
        const bodyH = await page.evaluate(() => document.body.scrollHeight);
        if (bodyH <= 15000) {
            await pool.screenshotFullPage('crawl', path.join(screenshotsDir, 'fullpage.png'));
        } else {
            await page.screenshot({
                path: path.join(screenshotsDir, 'fullpage.png'),
                clip: { x: 0, y: 0, width: config.viewportWidth, height: 8000 },
            });
            log.warn(`Page very tall (${bodyH}px), screenshot clipped to 8000px`);
        }
    } catch (e) { log.warn('Full-page screenshot failed: ' + e.message); }

    if (config.responsive) {
        log.progress('Capturing responsive data...');
        pageData.responsive = await extractResponsive(page, pageData.sections, config, screenshotsDir);
    }

    log.progress('Extracting dynamic interactions (scroll, hover, parallax, 3D)...');
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(500);
    try {
        pageData.dynamics = await extractFramerDynamics(page, config);
    } catch (e) {
        log.warn('Dynamics extraction partial/failed: ' + e.message);
        pageData.dynamics = {};
    }

    const snapshotPath = path.join(outputDir, 'site-snapshot.json');
    fs.writeFileSync(snapshotPath, JSON.stringify(pageData, null, 2));
    log.success(`Snapshot saved -> ${snapshotPath}`);
    log.info(`  ${pageData.sections.length} sections | ${Object.keys(urlMap).length} assets`);

    if (pageData.dynamics && Object.keys(pageData.dynamics).length > 0) {
        fs.writeFileSync(
            path.join(outputDir, 'dynamics.json'),
            JSON.stringify(pageData.dynamics, null, 2)
        );
    }

    await pool.releasePage('crawl');
    log.phaseEnd();

    return pageData;
}


async function extractPageData(page, config) {
    return await page.evaluate((cssProperties, maxSections, minSectionHeight) => {
        function getStyles(el) {
            const cs = window.getComputedStyle(el);
            const s = {};
            for (const p of cssProperties) { s[p] = cs.getPropertyValue(p); }
            return s;
        }

        function getRect(el) {
            const r = el.getBoundingClientRect();
            return {
                x: Math.round(r.left + window.scrollX),
                y: Math.round(r.top + window.scrollY),
                w: Math.round(r.width),
                h: Math.round(r.height),
            };
        }

        const meta = {
            title: document.title || '',
            url: window.location.href,
            width: document.documentElement.scrollWidth,
            height: document.documentElement.scrollHeight,
            viewport: { w: window.innerWidth, h: window.innerHeight },
            charset: document.characterSet,
            lang: document.documentElement.lang || 'en',
            generator: document.querySelector('meta[name="generator"]')?.content || '',
        };

        const isFramer = !!document.querySelector('[data-framer-hydrate-v2]') ||
            meta.generator.toLowerCase().includes('framer');
        const isWebflow = !!document.querySelector('[data-wf-site]') ||
            !!document.querySelector('.w-layout-grid');
        meta.platform = isFramer ? 'framer' : isWebflow ? 'webflow' : 'generic';

        const cssVariables = {};
        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules) {
                    if (rule.selectorText === ':root' || rule.selectorText === 'html') {
                        for (let i = 0; i < rule.style.length; i++) {
                            const p = rule.style[i];
                            if (p.startsWith('--')) {
                                cssVariables[p] = rule.style.getPropertyValue(p).trim();
                            }
                        }
                    }
                }
            } catch {}
        }

        const fonts = [];
        try {
            for (const sheet of document.styleSheets) {
                try {
                    for (const rule of sheet.cssRules) {
                        if (rule instanceof CSSFontFaceRule) {
                            fonts.push({
                                family: rule.style.getPropertyValue('font-family').replace(/['"]/g, ''),
                                src: rule.style.getPropertyValue('src'),
                                weight: rule.style.getPropertyValue('font-weight') || 'normal',
                                style: rule.style.getPropertyValue('font-style') || 'normal',
                            });
                        }
                    }
                } catch {}
            }
        } catch {}

        const keyframes = {};
        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules) {
                    if (rule instanceof CSSKeyframesRule) {
                        const frames = {};
                        for (const kf of rule.cssRules) {
                            const props = {};
                            for (let i = 0; i < kf.style.length; i++) {
                                const p = kf.style[i];
                                props[p] = kf.style.getPropertyValue(p);
                            }
                            frames[kf.keyText] = props;
                        }
                        keyframes[rule.name] = frames;
                    }
                }
            } catch {}
        }

        function splitSections() {
            let candidates = Array.from(document.querySelectorAll(
                'section[id], div[id], header, footer, nav, main, article'
            )).filter(el => {
                const r = el.getBoundingClientRect();
                return r.height >= minSectionHeight && r.width > 100;
            });
            if (candidates.length >= 3 && candidates.length <= maxSections) return candidates;

            candidates = Array.from(document.querySelectorAll(
                '[data-framer-name], [data-section-id], [data-wf-section], [class*="section"], [class*="Section"]'
            )).filter(el => {
                const r = el.getBoundingClientRect();
                return r.height >= minSectionHeight && r.width > 200;
            });
            if (candidates.length >= 3 && candidates.length <= maxSections) return candidates;

            candidates = Array.from(document.body.children).filter(el => {
                const r = el.getBoundingClientRect();
                return r.height >= minSectionHeight && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE';
            });
            if (candidates.length >= 2) return candidates.slice(0, maxSections);

            const dh = document.documentElement.scrollHeight;
            const splitHeight = Math.max(800, window.innerHeight);
            const fakeSections = [];
            let y = 0;
            while (y < dh && fakeSections.length < maxSections) {
                const h = Math.min(splitHeight, dh - y);
                fakeSections.push({ isFake: true, rect: { x: 0, y, w: window.innerWidth, h } });
                y += splitHeight;
            }
            return fakeSections;
        }

        const rawSections = splitSections();

        function extractNode(el, depth = 0, maxDepth = 20) {
            if (depth > maxDepth) return null;
            if (!el || el.nodeType !== 1) {
                if (el?.nodeType === 3 && el.textContent.trim()) {
                    return { type: 'text', content: el.textContent.trim().substring(0, 1000) };
                }
                return null;
            }

            const tag = el.tagName.toLowerCase();
            if (['script', 'style', 'noscript', 'link', 'meta'].includes(tag)) return null;

            const r = el.getBoundingClientRect();
            if (r.width === 0 && r.height === 0 && !['br', 'hr', 'wbr'].includes(tag)) return null;

            const node = { tag, rect: getRect(el), styles: getStyles(el) };

            if (el.id) node.id = el.id;
            if (el.className && typeof el.className === 'string') node.className = el.className;
            if (el.getAttribute('href')) node.href = el.getAttribute('href');
            if (el.getAttribute('src')) node.src = el.getAttribute('src');
            if (el.getAttribute('alt')) node.alt = el.getAttribute('alt');
            if (el.getAttribute('data-framer-name')) node.framerName = el.getAttribute('data-framer-name');
            if (el.getAttribute('data-wf-element')) node.webflowElement = el.getAttribute('data-wf-element');

            if (tag === 'img') node.src = el.src;
            if (tag === 'video') {
                node.src = el.src || el.querySelector('source')?.src;
                if (el.poster) node.poster = el.poster;
                node.autoplay = el.autoplay;
                node.muted = el.muted;
                node.loop = el.loop;
            }

            if (el.childNodes.length === 1 && el.childNodes[0].nodeType === 3) {
                node.text = el.textContent.trim().substring(0, 1000);
            }

            const children = [];
            for (const child of el.childNodes) {
                const n = extractNode(child, depth + 1, maxDepth);
                if (n) children.push(n);
            }
            if (children.length > 0) node.children = children;

            return node;
        }

        const sections = rawSections.map((el, i) => {
            if (el.isFake) return { index: i, ...el };
            const dom = extractNode(el);
            return {
                index: i,
                id: el.id || `section-${i}`,
                tag: el.tagName?.toLowerCase() || 'div',
                rect: getRect(el),
                framerName: el.getAttribute?.('data-framer-name') || null,
                dom,
            };
        });

        const images = [...new Set(Array.from(document.querySelectorAll('img[src]')).map(i => i.src))];
        const videos = [...new Set(Array.from(document.querySelectorAll('video source[src], video[src]')).map(v => v.src))];
        const svgs = Array.from(document.querySelectorAll('svg')).slice(0, 50).map(svg => ({
            viewBox: svg.getAttribute('viewBox') || '0 0 24 24',
            width: svg.getAttribute('width') || 'auto',
            height: svg.getAttribute('height') || 'auto',
            innerHTML: svg.innerHTML.substring(0, 5000),
        }));

        const bgImages = [];
        document.querySelectorAll('*').forEach(el => {
            const bg = window.getComputedStyle(el).backgroundImage;
            if (bg && bg !== 'none' && bg.includes('url(')) {
                const urlMatch = bg.match(/url\(["']?([^"')]+)["']?\)/);
                if (urlMatch && !urlMatch[1].startsWith('data:')) bgImages.push(urlMatch[1]);
            }
        });
        const allImages = [...new Set([...images, ...bgImages])];

        return {
            meta,
            cssVariables,
            fonts,
            fontFaces: fonts,
            keyframes,
            sections,
            assets: { images: allImages, videos, svgs, fontFaces: fonts },
        };
    }, CSS_PROPERTIES, config.maxSections, config.minSectionHeight);
}


async function extractResponsive(page, sections, config, screenshotsDir) {
    const breakpoints = config.breakpoints || [1920, 1440, 1024, 768, 375];
    const responsive = {};

    for (const bp of breakpoints) {
        if (bp === config.viewportWidth) continue;

        await page.setViewport({ width: bp, height: config.viewportHeight });
        await sleep(500);

        try {
            const bodyH = await page.evaluate(() => document.body.scrollHeight);
            const clipH = Math.min(bodyH, 8000);
            await page.screenshot({
                path: path.join(screenshotsDir, `responsive-${bp}.png`),
                clip: { x: 0, y: 0, width: bp, height: clipH },
            });
        } catch {}

        responsive[bp] = await page.evaluate((sectionIds) => {
            const data = {};
            for (const sid of sectionIds) {
                const el = document.getElementById(sid);
                if (el) {
                    const r = el.getBoundingClientRect();
                    data[sid] = {
                        x: Math.round(r.left), y: Math.round(r.top + window.scrollY),
                        w: Math.round(r.width), h: Math.round(r.height),
                    };
                }
            }
            return data;
        }, sections.filter(s => s.id).map(s => s.id));
    }

    await page.setViewport({ width: config.viewportWidth, height: config.viewportHeight });
    await sleep(300);

    return responsive;
}
