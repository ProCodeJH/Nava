/**
 * Phase 8: Performance — Core Web Vitals, rendering timeline, will-change audit
 */

export async function analyzePerformance(page, cdp, url) {
    const result = {
        lcp: null,
        fcp: null,
        cls: null,
        tbt: null,
        tti: null,
        domContentLoaded: null,
        fullLoad: null,
        willChangeAudit: [],
        jsExecutionTime: null,
        resourceTimeline: [],
    };

    // ── Core Web Vitals via PerformanceObserver ──
    const vitals = await page.evaluate(() => {
        const data = {};

        // Navigation timing
        const nav = performance.getEntriesByType('navigation')[0];
        if (nav) {
            data.domContentLoaded = Math.round(nav.domContentLoadedEventEnd - nav.startTime);
            data.fullLoad = Math.round(nav.loadEventEnd - nav.startTime);
            data.ttfb = Math.round(nav.responseStart - nav.startTime);
        }

        // Paint timing
        const paintEntries = performance.getEntriesByType('paint');
        for (const entry of paintEntries) {
            if (entry.name === 'first-contentful-paint') data.fcp = Math.round(entry.startTime);
            if (entry.name === 'first-paint') data.fp = Math.round(entry.startTime);
        }

        // LCP — get the last largest-contentful-paint entry
        if (window.PerformanceObserver) {
            try {
                const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
                if (lcpEntries && lcpEntries.length > 0) {
                    data.lcp = Math.round(lcpEntries[lcpEntries.length - 1].startTime);
                }
            } catch (e) { }
        }

        // Resource count & sizes
        const resources = performance.getEntriesByType('resource');
        data.totalResources = resources.length;
        data.totalTransferKB = Math.round(resources.reduce((s, r) => s + (r.transferSize || 0), 0) / 1024);

        return data;
    });

    Object.assign(result, vitals);

    // ── CLS via CDP ──
    try {
        await cdp.send('Performance.enable');
        const metrics = await cdp.send('Performance.getMetrics');
        for (const m of metrics.metrics) {
            if (m.name === 'LayoutCount') result.layoutCount = m.value;
            if (m.name === 'RecalcStyleCount') result.recalcStyleCount = m.value;
            if (m.name === 'LayoutDuration') result.layoutDuration = Math.round(m.value * 1000);
            if (m.name === 'ScriptDuration') result.jsExecutionTime = Math.round(m.value * 1000);
            if (m.name === 'TaskDuration') result.totalTaskDuration = Math.round(m.value * 1000);
        }
    } catch (e) { }

    // ── CLS calculation ──
    const cls = await page.evaluate(() => {
        return new Promise((resolve) => {
            let clsValue = 0;
            let sessionValue = 0;
            let sessionEntries = [];

            const observer = new PerformanceObserver(list => {
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                        sessionValue += entry.value;
                        sessionEntries.push(entry);
                    }
                }
            });

            try {
                observer.observe({ type: 'layout-shift', buffered: true });
            } catch (e) { }

            // Give it a moment to collect shifts
            setTimeout(() => {
                observer.disconnect();
                resolve(Math.round(sessionValue * 10000) / 10000);
            }, 100);
        });
    });
    result.cls = cls;

    // ── will-change audit ──
    const willChangeAudit = await page.evaluate(() => {
        const issues = [];
        document.querySelectorAll('*').forEach(el => {
            const cs = getComputedStyle(el);
            if (cs.willChange && cs.willChange !== 'auto') {
                const name = el.id || el.className?.toString()?.substring(0, 40) || el.tagName;
                issues.push({
                    element: name.substring(0, 60),
                    willChange: cs.willChange,
                    // Check if it's promoting unnecessarily
                    hasTransform: cs.transform !== 'none',
                    hasAnimation: cs.animationName !== 'none',
                });
            }
        });
        return issues.slice(0, 50);
    });
    result.willChangeAudit = willChangeAudit;

    // ── Resource timeline (top 20 slowest) ──
    const resourceTimeline = await page.evaluate(() => {
        return performance.getEntriesByType('resource')
            .map(r => ({
                name: r.name.split('/').pop()?.substring(0, 60) || r.name.substring(0, 60),
                type: r.initiatorType,
                sizeKB: Math.round((r.transferSize || 0) / 1024),
                durationMs: Math.round(r.duration),
            }))
            .sort((a, b) => b.durationMs - a.durationMs)
            .slice(0, 20);
    });
    result.resourceTimeline = resourceTimeline;

    return result;
}
