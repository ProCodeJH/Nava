/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Clone Fidelity Scorer v8.0                                  ║
 * ║  Automated comparison: original vs clone → 0-100 score       ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Score clone fidelity by comparing DOM structure, CSS coverage, and visual similarity
 */
export async function scoreCloneFidelity(page, originalUrl, cloneDir) {
    const scores = {
        domStructure: 0,
        cssCoverage: 0,
        assetCompleteness: 0,
        animationCoverage: 0,
        overall: 0,
        details: {},
    };

    // ═══ 1. DOM Structure Score ═══
    // Capture original DOM metrics
    await page.goto(originalUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));

    const originalMetrics = await page.evaluate(() => {
        const tags = {};
        document.querySelectorAll('*').forEach(el => {
            const tag = el.tagName.toLowerCase();
            tags[tag] = (tags[tag] || 0) + 1;
        });
        return {
            totalElements: document.querySelectorAll('*').length,
            tagDistribution: tags,
            sections: document.querySelectorAll('section, [data-framer-name], main > div').length,
            images: document.querySelectorAll('img, [style*="background-image"]').length,
            links: document.querySelectorAll('a[href]').length,
            buttons: document.querySelectorAll('button, [role="button"], a.button').length,
            forms: document.querySelectorAll('form, input, select, textarea').length,
            headings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
            textContent: document.body?.innerText?.length || 0,
        };
    });

    // Load clone HTML and measure same metrics
    const cloneHTML = await fs.readFile(path.join(cloneDir, 'index.html'), 'utf-8').catch(() => '');
    if (cloneHTML) {
        await page.setContent(cloneHTML, { waitUntil: 'domcontentloaded' });
        const cloneMetrics = await page.evaluate(() => {
            const tags = {};
            document.querySelectorAll('*').forEach(el => {
                const tag = el.tagName.toLowerCase();
                tags[tag] = (tags[tag] || 0) + 1;
            });
            return {
                totalElements: document.querySelectorAll('*').length,
                tagDistribution: tags,
                sections: document.querySelectorAll('section, [data-framer-name], main > div').length,
                images: document.querySelectorAll('img, [style*="background-image"]').length,
                links: document.querySelectorAll('a[href]').length,
                buttons: document.querySelectorAll('button, [role="button"], a.button').length,
                forms: document.querySelectorAll('form, input, select, textarea').length,
                headings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
                textContent: document.body?.innerText?.length || 0,
            };
        });

        // Compare metrics
        const elementRatio = Math.min(cloneMetrics.totalElements, originalMetrics.totalElements) /
            Math.max(cloneMetrics.totalElements, originalMetrics.totalElements || 1);
        const textRatio = Math.min(cloneMetrics.textContent, originalMetrics.textContent) /
            Math.max(cloneMetrics.textContent, originalMetrics.textContent || 1);
        const sectionRatio = originalMetrics.sections > 0 ?
            Math.min(cloneMetrics.sections / originalMetrics.sections, 1) : 1;
        const imageRatio = originalMetrics.images > 0 ?
            Math.min(cloneMetrics.images / originalMetrics.images, 1) : 1;

        scores.domStructure = Math.round(
            (elementRatio * 30 + textRatio * 30 + sectionRatio * 20 + imageRatio * 20)
        );
        scores.details.dom = { original: originalMetrics, clone: cloneMetrics };
    }

    // ═══ 2. CSS Coverage Score ═══
    const cloneCSS = await fs.readFile(path.join(cloneDir, 'styles.css'), 'utf-8').catch(() => '');
    const originalCSS = await fs.readFile(path.join(cloneDir, 'original-styles.css'), 'utf-8').catch(() => '');

    if (cloneCSS && originalCSS) {
        const cloneRules = (cloneCSS.match(/\{[^}]+\}/g) || []).length;
        const originalRules = (originalCSS.match(/\{[^}]+\}/g) || []).length;
        scores.cssCoverage = Math.round(
            Math.min(cloneRules / Math.max(originalRules, 1), 1) * 100
        );
        scores.details.css = { cloneRules, originalRules };
    }

    // ═══ 3. Asset Completeness Score ═══
    const assetDir = path.join(cloneDir, '..', 'assets');
    let totalAssets = 0;
    for (const subdir of ['images', 'svg', 'fonts', 'lottie']) {
        try {
            const files = await fs.readdir(path.join(assetDir, subdir));
            totalAssets += files.length;
        } catch { }
    }
    // Assume original has at least the same images
    const expectedAssets = originalMetrics.images;
    scores.assetCompleteness = Math.round(
        Math.min(totalAssets / Math.max(expectedAssets, 1), 1) * 100
    );
    scores.details.assets = { downloaded: totalAssets, expected: expectedAssets };

    // ═══ 4. Animation Coverage Score ═══
    const animJS = await fs.readFile(path.join(cloneDir, 'animations.js'), 'utf-8').catch(() => '');
    if (animJS) {
        const features = [
            animJS.includes('gsap.registerPlugin'),
            animJS.includes('ScrollTrigger'),
            animJS.includes('gsap.from(') || animJS.includes('gsap.to('),
            animJS.includes('stagger') || animJS.includes('delay'),
            animJS.includes('mouseenter') || animJS.includes('mousemove'),
            animJS.includes('data-framer-appear-id'),
            animJS.includes('scrub'),
            animJS.includes('counter') || animJS.includes('textContent'),
        ];
        scores.animationCoverage = Math.round((features.filter(Boolean).length / features.length) * 100);
        scores.details.animation = {
            featuresDetected: features.filter(Boolean).length,
            totalFeatures: features.length,
            jsSize: animJS.length,
        };
    }

    // ═══ Overall Score ═══
    scores.overall = Math.round(
        scores.domStructure * 0.35 +
        scores.cssCoverage * 0.25 +
        scores.assetCompleteness * 0.20 +
        scores.animationCoverage * 0.20
    );

    scores.grade = scores.overall >= 90 ? 'A+' :
        scores.overall >= 80 ? 'A' :
            scores.overall >= 70 ? 'B' :
                scores.overall >= 60 ? 'C' :
                    scores.overall >= 50 ? 'D' : 'F';

    // Navigate back to original
    try {
        await page.goto(originalUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    } catch { }

    return scores;
}

/**
 * Format fidelity report for console output
 */
export function formatFidelityReport(scores) {
    const lines = [
        `═══ Clone Fidelity Score: ${scores.grade} (${scores.overall}/100) ═══`,
        `  DOM Structure:     ${bar(scores.domStructure)} ${scores.domStructure}/100`,
        `  CSS Coverage:      ${bar(scores.cssCoverage)} ${scores.cssCoverage}/100`,
        `  Asset Completeness:${bar(scores.assetCompleteness)} ${scores.assetCompleteness}/100`,
        `  Animation Coverage:${bar(scores.animationCoverage)} ${scores.animationCoverage}/100`,
    ];
    return lines.join('\n');
}

function bar(val, width = 20) {
    const filled = Math.round((val / 100) * width);
    return '█'.repeat(filled) + '░'.repeat(width - filled);
}
