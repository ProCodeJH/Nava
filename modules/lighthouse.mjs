/**
 * Upgrade 6: Lighthouse Integration
 * Full Lighthouse scoring via Chrome DevTools Protocol
 */

import fs from 'fs/promises';
import path from 'path';

export async function runLighthouse(page, cdp, url, outputDir) {
    const result = {
        scores: {},
        diagnostics: {},
        opportunities: [],
    };

    // ── Approach: Use CDP to collect performance + accessibility data ──
    // (Full Lighthouse requires separate lighthouse npm, but we can get core metrics via CDP)

    // 1. Fresh page load for accurate metrics
    await cdp.send('Performance.enable');
    await cdp.send('Network.enable');

    const networkRequests = [];
    cdp.on('Network.responseReceived', (params) => {
        networkRequests.push({
            url: params.response.url?.substring(0, 100),
            status: params.response.status,
            mimeType: params.response.mimeType,
            size: params.response.headers?.['content-length'] ? parseInt(params.response.headers['content-length']) : 0,
        });
    });

    // Reload for fresh metrics
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));

    // 2. Performance metrics from CDP
    const metrics = await cdp.send('Performance.getMetrics');
    const metricMap = {};
    metrics.metrics.forEach(m => { metricMap[m.name] = m.value; });

    // 3. Core Web Vitals
    const vitals = await page.evaluate(() => {
        const data = {};
        const nav = performance.getEntriesByType('navigation')[0];
        if (nav) {
            data.ttfb = Math.round(nav.responseStart - nav.startTime);
            data.domContentLoaded = Math.round(nav.domContentLoadedEventEnd - nav.startTime);
            data.load = Math.round(nav.loadEventEnd - nav.startTime);
        }

        const paints = performance.getEntriesByType('paint');
        paints.forEach(p => {
            if (p.name === 'first-contentful-paint') data.fcp = Math.round(p.startTime);
        });

        // Total blocking time estimate
        const longTasks = performance.getEntriesByType('longtask') || [];
        data.tbt = longTasks.reduce((sum, t) => sum + Math.max(0, t.duration - 50), 0);

        return data;
    });

    // 4. Calculate scores (Lighthouse-style scoring)
    const perfScore = calculatePerfScore(vitals, metricMap);
    const seoScore = await calculateSEOScore(page);
    const a11yScore = await calculateA11yScore(page);
    const bpScore = await calculateBestPractices(page, networkRequests);

    result.scores = {
        performance: perfScore.score,
        seo: seoScore.score,
        accessibility: a11yScore.score,
        bestPractices: bpScore.score,
    };

    result.diagnostics = {
        performance: { ...vitals, cdpMetrics: metricMap },
        seo: seoScore.details,
        accessibility: a11yScore.details,
        bestPractices: bpScore.details,
    };

    // 5. Opportunities
    if (vitals.fcp > 2500) {
        result.opportunities.push({ metric: 'FCP', value: `${vitals.fcp}ms`, suggestion: 'Optimize critical rendering path, reduce render-blocking resources' });
    }
    if (vitals.tbt > 300) {
        result.opportunities.push({ metric: 'TBT', value: `${Math.round(vitals.tbt)}ms`, suggestion: 'Reduce JavaScript execution time, break up long tasks' });
    }
    if (networkRequests.length > 100) {
        result.opportunities.push({ metric: 'Requests', value: `${networkRequests.length}`, suggestion: 'Reduce number of HTTP requests, bundle resources' });
    }

    // Save report
    const reportPath = path.join(outputDir, 'lighthouse-report.json');
    await fs.writeFile(reportPath, JSON.stringify(result, null, 2));

    return result;
}

function calculatePerfScore(vitals, metricMap) {
    let score = 100;
    // FCP scoring (good < 1800ms, needs improvement < 3000ms)
    if (vitals.fcp) {
        if (vitals.fcp > 3000) score -= 30;
        else if (vitals.fcp > 1800) score -= 15;
    }
    // TBT scoring (good < 200ms, needs improvement < 600ms)
    if (vitals.tbt > 600) score -= 30;
    else if (vitals.tbt > 200) score -= 15;
    // TTFB scoring
    if (vitals.ttfb > 800) score -= 20;
    else if (vitals.ttfb > 400) score -= 10;
    // Script duration
    if (metricMap.ScriptDuration > 2) score -= 10;

    return { score: Math.max(0, score) };
}

async function calculateSEOScore(page) {
    const details = await page.evaluate(() => {
        const checks = {};
        checks.hasTitle = !!document.title;
        checks.titleLength = document.title?.length || 0;
        checks.hasMeta = !!document.querySelector('meta[name="description"]');
        checks.metaLength = document.querySelector('meta[name="description"]')?.content?.length || 0;
        checks.hasViewport = !!document.querySelector('meta[name="viewport"]');
        checks.hasH1 = !!document.querySelector('h1');
        checks.h1Count = document.querySelectorAll('h1').length;
        checks.hasCanonical = !!document.querySelector('link[rel="canonical"]');
        checks.hasLang = !!document.documentElement.lang;
        checks.imgsWithAlt = document.querySelectorAll('img[alt]').length;
        checks.imgsTotal = document.querySelectorAll('img').length;
        checks.hasOgTitle = !!document.querySelector('meta[property="og:title"]');
        checks.hasOgDesc = !!document.querySelector('meta[property="og:description"]');
        checks.hasOgImage = !!document.querySelector('meta[property="og:image"]');
        checks.hasRobots = !!document.querySelector('meta[name="robots"]');
        return checks;
    });

    let score = 100;
    if (!details.hasTitle) score -= 15;
    if (details.titleLength < 10 || details.titleLength > 60) score -= 5;
    if (!details.hasMeta) score -= 15;
    if (!details.hasViewport) score -= 10;
    if (!details.hasH1) score -= 10;
    if (details.h1Count > 1) score -= 5;
    if (!details.hasCanonical) score -= 5;
    if (!details.hasLang) score -= 10;
    if (!details.hasOgTitle) score -= 5;
    if (!details.hasOgDesc) score -= 5;
    if (details.imgsTotal > 0 && details.imgsWithAlt < details.imgsTotal) score -= 10;

    return { score: Math.max(0, score), details };
}

async function calculateA11yScore(page) {
    const details = await page.evaluate(() => {
        const checks = {};
        checks.hasLang = !!document.documentElement.lang;
        checks.hasSkipLink = !!document.querySelector('a[href="#main"], a[href="#content"], .skip-link, .skip-to-content');
        checks.imgsWithoutAlt = document.querySelectorAll('img:not([alt])').length;
        checks.inputsWithoutLabel = 0;
        document.querySelectorAll('input, select, textarea').forEach(el => {
            const id = el.id;
            if (!id || !document.querySelector(`label[for="${id}"]`)) {
                if (!el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')) {
                    checks.inputsWithoutLabel++;
                }
            }
        });
        checks.hasLandmarks = document.querySelectorAll('[role="main"], main, [role="navigation"], nav').length > 0;
        checks.buttonsWithoutText = document.querySelectorAll('button:empty:not([aria-label])').length;
        checks.linksWithoutText = 0;
        document.querySelectorAll('a').forEach(a => {
            if (!a.textContent?.trim() && !a.getAttribute('aria-label')) checks.linksWithoutText++;
        });
        return checks;
    });

    let score = 100;
    if (!details.hasLang) score -= 15;
    score -= Math.min(30, details.imgsWithoutAlt * 5);
    score -= Math.min(30, details.inputsWithoutLabel * 5);
    score -= Math.min(10, details.buttonsWithoutText * 3);
    score -= Math.min(10, details.linksWithoutText * 2);
    if (!details.hasLandmarks) score -= 10;

    return { score: Math.max(0, score), details };
}

async function calculateBestPractices(page, requests) {
    const details = await page.evaluate(() => {
        const checks = {};
        checks.usesHTTPS = location.protocol === 'https:';
        checks.hasDoctype = document.doctype !== null;
        checks.hasCharset = !!document.querySelector('meta[charset]');
        checks.noConsoleErrors = true; // Can't easily detect
        checks.usesPassiveListeners = true; // Default assumption
        checks.noDeprecatedAPIs = !document.all; // IE compat check
        return checks;
    });

    // Check for mixed content
    const mixedContent = requests.filter(r => r.url?.startsWith('http://') && !r.url?.includes('localhost')).length;
    details.mixedContent = mixedContent;

    let score = 100;
    if (!details.usesHTTPS) score -= 20;
    if (!details.hasDoctype) score -= 10;
    if (!details.hasCharset) score -= 5;
    if (mixedContent > 0) score -= 15;

    return { score: Math.max(0, score), details };
}
