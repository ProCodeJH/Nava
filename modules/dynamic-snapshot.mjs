/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Dynamic Data Snapshot v9.0                                  ║
 * ║  Multiple time-point captures of changing content            ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Detect dynamic content areas and take multiple snapshots
 */
export async function captureDynamicData(page, url, opts = {}) {
    const { snapshots = 3, intervalMs = 5000, spinner, chalk } = opts;

    // ═══ 1. Detect dynamic regions ═══
    const dynamicRegions = await page.evaluate(() => {
        const regions = [];

        // Counters / numbers that might animate
        document.querySelectorAll('*').forEach(el => {
            const text = el.textContent?.trim();
            if (!text || el.children.length > 0 || text.length > 50) return;

            const hasNumber = /^\$?[\d,]+\.?\d*[%+KMB]?$/.test(text) || /\d{2,}/.test(text);
            const isPrice = /^\$|€|£|¥|₩/.test(text);
            const isCounter = el.closest('[data-counter], [data-count], .counter, .stat, .metric');
            const isTimestamp = /\d{4}-\d{2}|\d{2}:\d{2}|ago|mins?|hours?/.test(text);

            if (hasNumber || isPrice || isCounter || isTimestamp) {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    const sel = buildSelector(el);
                    if (sel) {
                        regions.push({
                            selector: sel,
                            type: isPrice ? 'price' : isCounter ? 'counter' : isTimestamp ? 'timestamp' : 'number',
                            value: text,
                            rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
                        });
                    }
                }
            }
        });

        // Feeds / lists that might update
        document.querySelectorAll('.feed, .timeline, .notifications, [data-feed], .live-feed, .chat-messages').forEach(el => {
            const sel = buildSelector(el);
            if (sel) {
                regions.push({
                    selector: sel, type: 'feed',
                    childCount: el.children.length,
                    innerHTML: el.innerHTML.substring(0, 1000),
                });
            }
        });

        // Infinite scroll containers
        document.querySelectorAll('[data-infinite-scroll], .infinite-scroll, [data-page]').forEach(el => {
            const sel = buildSelector(el);
            if (sel) {
                regions.push({ selector: sel, type: 'infinite-scroll', childCount: el.children.length });
            }
        });

        return regions;

        function buildSelector(el) {
            if (el.id) return '#' + CSS.escape(el.id);
            const classes = [...(el.classList || [])].filter(c => c.length < 40 && !c.startsWith('__'));
            if (classes.length) {
                const s = '.' + classes.map(c => CSS.escape(c)).join('.');
                if (document.querySelectorAll(s).length <= 3) return s;
            }
            return null;
        }
    });

    // ═══ 2. Take multiple time-point snapshots ═══
    const timeSnapshots = [];

    for (let i = 0; i < snapshots; i++) {
        if (i > 0) await new Promise(r => setTimeout(r, intervalMs));

        if (spinner && chalk) {
            spinner.text = chalk.blue(`[Snapshot ${i + 1}/${snapshots}]`) + ` Capturing dynamic data...`;
        }

        const snap = await page.evaluate((regions) => {
            const data = { timestamp: Date.now(), values: {} };
            for (const region of regions) {
                const el = document.querySelector(region.selector);
                if (!el) continue;
                data.values[region.selector] = {
                    text: el.textContent?.trim()?.substring(0, 200),
                    html: el.innerHTML?.substring(0, 1000),
                    childCount: el.children.length,
                    visible: getComputedStyle(el).display !== 'none',
                };
            }
            return data;
        }, dynamicRegions);

        timeSnapshots.push(snap);
    }

    // ═══ 3. Analyze changes between snapshots ═══
    const changes = [];
    for (let i = 1; i < timeSnapshots.length; i++) {
        const prev = timeSnapshots[i - 1];
        const curr = timeSnapshots[i];
        for (const [sel, currVal] of Object.entries(curr.values)) {
            const prevVal = prev.values[sel];
            if (prevVal && prevVal.text !== currVal.text) {
                changes.push({
                    selector: sel,
                    from: prevVal.text?.substring(0, 100),
                    to: currVal.text?.substring(0, 100),
                    deltaMs: curr.timestamp - prev.timestamp,
                });
            }
        }
    }

    // ═══ 4. Capture infinite scroll data ═══
    let scrollData = null;
    const scrollRegions = dynamicRegions.filter(r => r.type === 'infinite-scroll');
    if (scrollRegions.length > 0) {
        const pages = [];
        for (let p = 0; p < 3; p++) {
            const content = await page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
                return { height: document.body.scrollHeight, items: document.querySelectorAll('article, .card, .item, .post, li').length };
            });
            pages.push(content);
            await new Promise(r => setTimeout(r, 2000));
        }
        scrollData = { pages, totalScrolls: 3 };
        // Scroll back to top
        await page.evaluate(() => window.scrollTo(0, 0));
        await new Promise(r => setTimeout(r, 500));
    }

    return {
        regions: dynamicRegions,
        snapshots: timeSnapshots,
        changes,
        scrollData,
        stats: {
            regionsDetected: dynamicRegions.length,
            snapshotsTaken: timeSnapshots.length,
            changesDetected: changes.length,
            hasInfiniteScroll: scrollData !== null,
        },
    };
}

/**
 * Generate mock data update script
 */
export function generateDynamicDataScript(dynamicData) {
    if (!dynamicData || dynamicData.stats.regionsDetected === 0) return '';

    let code = `/**
 * ═══ Dynamic Data Simulation (Design-DNA v9.0) ═══
 * Regions: ${dynamicData.stats.regionsDetected}
 * Changes captured: ${dynamicData.stats.changesDetected}
 */

`;

    // Timer-based updates for changing values
    if (dynamicData.changes.length > 0) {
        code += `// Simulated data updates\n`;
        code += `setInterval(() => {\n`;
        for (const change of dynamicData.changes.slice(0, 20)) {
            code += `    const el = document.querySelector('${change.selector}');\n`;
            code += `    if (el) {\n`;
            code += `        // Cycle between captured values\n`;
            code += `        el.textContent = el.textContent === ${JSON.stringify(change.from)} ? ${JSON.stringify(change.to)} : ${JSON.stringify(change.from)};\n`;
            code += `    }\n`;
        }
        code += `}, 5000);\n\n`;
    }

    // Counter animations
    const counters = dynamicData.regions.filter(r => r.type === 'counter' || r.type === 'number');
    if (counters.length > 0) {
        code += `// Counter animations\n`;
        code += `function animateCounters() {\n`;
        for (const counter of counters.slice(0, 10)) {
            code += `    const el = document.querySelector('${counter.selector}');\n`;
            code += `    if (el) {\n`;
            code += `        const target = parseInt(el.textContent.replace(/[^\\d]/g, '')) || 0;\n`;
            code += `        let current = 0;\n`;
            code += `        const step = Math.ceil(target / 60);\n`;
            code += `        const timer = setInterval(() => {\n`;
            code += `            current = Math.min(current + step, target);\n`;
            code += `            el.textContent = current.toLocaleString();\n`;
            code += `            if (current >= target) clearInterval(timer);\n`;
            code += `        }, 16);\n`;
            code += `    }\n`;
        }
        code += `}\n`;
        code += `if (typeof IntersectionObserver !== 'undefined') {\n`;
        code += `    const obs = new IntersectionObserver(entries => {\n`;
        code += `        if (entries.some(e => e.isIntersecting)) { animateCounters(); obs.disconnect(); }\n`;
        code += `    });\n`;
        code += `    document.querySelectorAll('.counter, .stat, .metric, [data-counter]').forEach(el => obs.observe(el));\n`;
        code += `} else { animateCounters(); }\n\n`;
    }

    // Infinite scroll simulation
    if (dynamicData.scrollData) {
        code += `// Infinite scroll simulation\n`;
        code += `let mockPage = 1;\n`;
        code += `window.addEventListener('scroll', () => {\n`;
        code += `    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 200) {\n`;
        code += `        if (mockPage < 5) {\n`;
        code += `            mockPage++;\n`;
        code += `            // Clone existing items\n`;
        code += `            const container = document.querySelector('.feed, .grid, main, [data-infinite-scroll]');\n`;
        code += `            if (container && container.children.length > 0) {\n`;
        code += `                const items = [...container.children].slice(0, 3);\n`;
        code += `                items.forEach(item => container.appendChild(item.cloneNode(true)));\n`;
        code += `            }\n`;
        code += `        }\n`;
        code += `    }\n`;
        code += `});\n`;
    }

    return code;
}

/**
 * Save dynamic data fixtures
 */
export async function saveDynamicFixtures(dynamicData, outputDir) {
    const dir = path.join(outputDir, 'mock-server', 'dynamic-fixtures');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'snapshots.json'), JSON.stringify(dynamicData.snapshots, null, 2));
    await fs.writeFile(path.join(dir, 'regions.json'), JSON.stringify(dynamicData.regions, null, 2));
    if (dynamicData.scrollData) {
        await fs.writeFile(path.join(dir, 'scroll-data.json'), JSON.stringify(dynamicData.scrollData, null, 2));
    }
    return dynamicData.stats;
}
