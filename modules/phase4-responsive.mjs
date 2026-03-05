/**
 * Phase 4: Responsive — Multi-viewport analysis
 */

const VIEWPORTS = [
    { name: 'desktop', width: 1920, height: 1080 },
    { name: 'laptop', width: 1440, height: 900 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 375, height: 812 },
];

export async function analyzeResponsive(page, url) {
    const result = {
        breakpoints: [],
        viewportDiffs: [],
    };

    // ── Extract @media breakpoints from CSS ──
    const mediaBreakpoints = await page.evaluate(() => {
        const bps = new Set();
        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules || []) {
                    if (rule.type === CSSRule.MEDIA_RULE) {
                        const media = rule.conditionText || rule.media?.mediaText || '';
                        const matches = media.match(/(\d+)px/g);
                        if (matches) {
                            matches.forEach(m => bps.add(parseInt(m)));
                        }
                    }
                }
            } catch (e) { /* cross-origin */ }
        }
        return [...bps].sort((a, b) => a - b);
    });

    result.breakpoints = mediaBreakpoints;

    // ── Analyze layout at each viewport ──
    for (const vp of VIEWPORTS) {
        await page.setViewport({ width: vp.width, height: vp.height });
        // Reload to get correct responsive state
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 2000));

        const vpData = await page.evaluate((vpName) => {
            const data = {
                viewport: vpName,
                totalHeight: document.documentElement.scrollHeight,
                visibleSections: [],
                hiddenElements: [],
                fontChanges: [],
                layoutChanges: [],
            };

            // Check key elements at this viewport
            const sections = document.querySelectorAll('section, header, footer, main, nav, [class*="section"]');
            sections.forEach(el => {
                const cs = getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                const name = el.id || el.className?.toString()?.substring(0, 40) || el.tagName;

                if (cs.display === 'none' || cs.visibility === 'hidden' || rect.height === 0) {
                    data.hiddenElements.push(name);
                } else {
                    data.visibleSections.push({
                        name: name.substring(0, 60),
                        width: Math.round(rect.width),
                        height: Math.round(rect.height),
                        padding: cs.padding,
                        flexDirection: cs.flexDirection,
                        gridTemplate: cs.gridTemplateColumns !== 'none' ? cs.gridTemplateColumns : null,
                    });
                }
            });

            // Check typography changes for key text elements
            document.querySelectorAll('h1, h2, h3, p, a, button').forEach(el => {
                const cs = getComputedStyle(el);
                const text = el.textContent?.trim()?.substring(0, 30);
                if (!text) return;

                data.fontChanges.push({
                    text,
                    tag: el.tagName,
                    fontSize: cs.fontSize,
                    lineHeight: cs.lineHeight,
                    padding: cs.padding,
                });
            });

            // Limit results
            data.fontChanges = data.fontChanges.slice(0, 30);

            return data;
        }, vp.name);

        result.viewportDiffs.push({
            viewport: vp,
            ...vpData,
        });
    }

    // Reset to desktop
    await page.setViewport({ width: 1920, height: 1080 });

    return result;
}
