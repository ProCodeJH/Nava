/**
 * ═══════════════════════════════════════════════════════════════
 *  DESIGN-DNA — SELF-HEALING CLONE LOOP
 *
 *  Automated comparison → diagnosis → patching → revalidation
 *  loop that drives clone fidelity toward 95%+ match.
 *
 *  Pipeline: CAPTURE → COMPARE → DIAGNOSE → PATCH → LOOP
 * ═══════════════════════════════════════════════════════════════
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

import { pixelCompare } from './pixel-compare.mjs';
import { scoreCloneFidelity, formatFidelityReport } from './fidelity-scorer.mjs';

// ─── Main Entry ──────────────────────────────────────────────
export async function selfHealingClone(originalUrl, projectDir, options = {}) {
    const maxIterations = options.maxIterations || 5;
    const targetScore = options.targetScore || 95;
    const cloneDir = path.join(projectDir, 'clone');
    const healingDir = path.join(projectDir, 'healing-reports');

    await fs.mkdir(healingDir, { recursive: true });

    console.log('📍 [Healing] Self-Healing Clone Loop starting...');
    console.log(`ℹ️  Original: ${originalUrl}`);
    console.log(`ℹ️  Clone: ${cloneDir}`);
    console.log(`ℹ️  Target: ${targetScore}% | Max iterations: ${maxIterations}`);

    // Verify clone exists
    if (!fsSync.existsSync(path.join(cloneDir, 'index.html'))) {
        console.log('❌ [Healing] clone/index.html not found');
        return null;
    }

    // Launch browser
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
        defaultViewport: { width: 1920, height: 1080 },
    });

    const iterations = [];
    let lastPatchCSS = null; // For rollback

    try {
        for (let i = 0; i < maxIterations; i++) {
            console.log(`\n🔄 [Healing] Iteration ${i + 1}/${maxIterations}`);
            const iterDir = path.join(healingDir, `iteration-${i + 1}`);
            await fs.mkdir(iterDir, { recursive: true });

            const page = await browser.newPage();

            // 1. CAPTURE
            console.log('   📸 Capturing screenshots...');
            const captures = await captureComparison(page, originalUrl, cloneDir, iterDir);

            // 2. COMPARE
            console.log('   🔍 Comparing pixel-by-pixel...');
            let pixelResult = null;
            if (captures.originalFull && captures.cloneFull) {
                pixelResult = await pixelCompare(
                    captures.originalFull, captures.cloneFull,
                    captures.bands, iterDir
                );
            }

            console.log('   🔍 Scoring fidelity...');
            const fidelityResult = await scoreCloneFidelity(page, originalUrl, cloneDir);

            const score = {
                iteration: i + 1,
                pixel: pixelResult?.overall?.matchPercent ?? 0,
                fidelity: fidelityResult.overall,
                grade: fidelityResult.grade,
                bands: pixelResult?.bands?.map(b => ({
                    name: b.name,
                    matchPercent: b.matchPercent,
                    grade: b.grade,
                })) || [],
                details: fidelityResult.details,
            };
            iterations.push(score);

            console.log(`   📊 Pixel: ${score.pixel}% | Fidelity: ${score.fidelity}/100 (${score.grade})`);
            console.log(formatFidelityReport(fidelityResult));

            // Check for regression (rollback if worse)
            if (i > 0) {
                const prevScore = iterations[i - 1];
                if (score.pixel < prevScore.pixel - 1 && lastPatchCSS !== null) {
                    console.log('   ⚠️  Score regressed! Rolling back last patch...');
                    const patchPath = path.join(cloneDir, 'healing-patches.css');
                    await fs.writeFile(patchPath, lastPatchCSS);
                    score.rolledBack = true;
                }
            }

            // Target reached?
            if (score.pixel >= targetScore && score.fidelity >= targetScore) {
                console.log(`   ✅ Target ${targetScore}% reached!`);
                await page.close();
                break;
            }

            // 3. DIAGNOSE
            console.log('   🧠 Diagnosing gaps...');
            const diagnosis = await diagnoseGaps(
                page, pixelResult, fidelityResult, originalUrl, cloneDir
            );
            console.log(`   🧠 Found ${diagnosis.length} gap areas with ${diagnosis.reduce((s, g) => s + (g.issues?.length || 0), 0)} issues`);

            // Save diagnosis
            await fs.writeFile(
                path.join(iterDir, 'diagnosis.json'),
                JSON.stringify(diagnosis, null, 2)
            );

            // 4. PATCH
            console.log('   🔧 Applying patches...');
            // Save current patch for potential rollback
            const patchPath = path.join(cloneDir, 'healing-patches.css');
            try {
                lastPatchCSS = await fs.readFile(patchPath, 'utf-8');
            } catch { lastPatchCSS = ''; }

            const patchResult = await applyPatches(diagnosis, cloneDir);
            console.log(`   🔧 Applied ${patchResult.patchCount} patches`);

            // Save patch log
            await fs.writeFile(
                path.join(iterDir, 'patches.json'),
                JSON.stringify(patchResult, null, 2)
            );

            await page.close();
        }
    } finally {
        await browser.close();
    }

    // 6. REPORT
    const finalScore = iterations[iterations.length - 1];
    const report = {
        originalUrl,
        projectDir,
        targetScore,
        maxIterations,
        totalIterations: iterations.length,
        iterations,
        finalScore,
        improvement: iterations.length > 1
            ? {
                pixelDelta: finalScore.pixel - iterations[0].pixel,
                fidelityDelta: finalScore.fidelity - iterations[0].fidelity,
            }
            : null,
    };

    await fs.writeFile(
        path.join(healingDir, 'healing-report.json'),
        JSON.stringify(report, null, 2)
    );

    console.log('\n✅ [Healing] Self-Healing complete!');
    console.log(`ℹ️  ${iterations.length} iterations`);
    console.log(`ℹ️  Final: Pixel ${finalScore.pixel}% | Fidelity ${finalScore.fidelity}/100 (${finalScore.grade})`);
    if (report.improvement) {
        console.log(`ℹ️  Improvement: Pixel +${report.improvement.pixelDelta.toFixed(1)}% | Fidelity +${report.improvement.fidelityDelta}`);
    }

    return report;
}


// ═══════════════════════════════════════════════════════════════
//  1. CAPTURE — Screenshot original & clone
// ═══════════════════════════════════════════════════════════════
async function captureComparison(page, originalUrl, cloneDir, outputDir) {
    const origDir = path.join(outputDir, 'original');
    const cloneCapDir = path.join(outputDir, 'clone');
    await fs.mkdir(origDir, { recursive: true });
    await fs.mkdir(cloneCapDir, { recursive: true });

    let originalFull = null;
    let cloneFull = null;
    let bands = [];

    // ── Capture original ──
    try {
        await page.goto(originalUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 3000)); // Wait for animations

        originalFull = path.join(origDir, 'full-page.png');
        await page.screenshot({ path: originalFull, type: 'png', fullPage: true });

        // Extract section bands from original
        bands = await page.evaluate(() => {
            const results = [];
            const els = document.querySelectorAll('section, header, footer, main > div, [class*="section"]');
            let count = 0;
            els.forEach(el => {
                const rect = el.getBoundingClientRect();
                if (rect.height < 100 || rect.width < 300) return;
                if (count >= 20) return;
                const name = el.id || el.getAttribute('data-framer-name') ||
                    el.className?.toString()?.split(' ')[0]?.substring(0, 30) || el.tagName;
                results.push({
                    name: name.replace(/[^a-zA-Z0-9_-]/g, '_'),
                    y: Math.round(rect.y + window.scrollY),
                    height: Math.round(rect.height),
                });
                count++;
            });
            return results;
        });
    } catch (e) {
        console.log(`   ⚠️  Original capture failed: ${e.message?.substring(0, 60)}`);
    }

    // ── Capture clone ──
    try {
        const cloneHTML = await fs.readFile(path.join(cloneDir, 'index.html'), 'utf-8');

        // Inject healing patches if they exist
        let html = cloneHTML;
        const patchPath = path.join(cloneDir, 'healing-patches.css');
        try {
            const patchCSS = await fs.readFile(patchPath, 'utf-8');
            if (patchCSS.trim()) {
                html = html.replace('</head>', `<style>${patchCSS}</style></head>`);
            }
        } catch { /* no patches yet */ }

        await page.setContent(html, { waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 2000));

        cloneFull = path.join(cloneCapDir, 'full-page.png');
        await page.screenshot({ path: cloneFull, type: 'png', fullPage: true });
    } catch (e) {
        console.log(`   ⚠️  Clone capture failed: ${e.message?.substring(0, 60)}`);
    }

    return { originalFull, cloneFull, bands };
}


// ═══════════════════════════════════════════════════════════════
//  3. DIAGNOSE — Find what's different
// ═══════════════════════════════════════════════════════════════
async function diagnoseGaps(page, pixelResult, fidelityResult, originalUrl, cloneDir) {
    const gaps = [];

    // ── Band-level pixel diagnosis ──
    if (pixelResult?.bands) {
        for (const band of pixelResult.bands) {
            if (band.matchPercent === undefined || band.matchPercent >= 92) continue;
            gaps.push({
                section: band.name,
                score: band.matchPercent,
                y: band.y,
                height: band.height,
                source: 'pixel',
                issues: [],
            });
        }
    }

    // ── Style-level diagnosis ──
    // Compare computed styles between original and clone at low-scoring regions
    try {
        // Load original page
        await page.goto(originalUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 3000));

        const originalStyles = await page.evaluate(() => {
            const results = [];
            const elements = document.querySelectorAll('section, header, footer, main > div, [class*="section"], h1, h2, h3, p, a, button, img, nav');
            elements.forEach(el => {
                const rect = el.getBoundingClientRect();
                if (rect.height < 10) return;

                const cs = getComputedStyle(el);
                const selector = buildUniqueSelector(el);

                results.push({
                    selector,
                    tag: el.tagName.toLowerCase(),
                    y: Math.round(rect.y + window.scrollY),
                    height: Math.round(rect.height),
                    styles: {
                        backgroundColor: cs.backgroundColor,
                        color: cs.color,
                        fontSize: cs.fontSize,
                        fontFamily: cs.fontFamily.split(',')[0].trim().replace(/['"]/g, ''),
                        padding: cs.padding,
                        margin: cs.margin,
                        gap: cs.gap,
                        display: cs.display,
                        flexDirection: cs.flexDirection,
                        borderRadius: cs.borderRadius,
                        lineHeight: cs.lineHeight,
                        letterSpacing: cs.letterSpacing,
                        textAlign: cs.textAlign,
                    },
                });
            });

            function buildUniqueSelector(el) {
                if (el.id) return `#${el.id}`;
                const classes = [...el.classList].filter(c => c.length > 2).slice(0, 2);
                const tag = el.tagName.toLowerCase();
                if (classes.length > 0) return `${tag}.${classes.join('.')}`;
                return tag;
            }

            return results;
        });

        // Load clone page
        const cloneHTML = await fs.readFile(path.join(cloneDir, 'index.html'), 'utf-8');
        let html = cloneHTML;
        try {
            const patchCSS = await fs.readFile(path.join(cloneDir, 'healing-patches.css'), 'utf-8');
            if (patchCSS.trim()) html = html.replace('</head>', `<style>${patchCSS}</style></head>`);
        } catch { }
        await page.setContent(html, { waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 2000));

        const cloneStyles = await page.evaluate(() => {
            const results = [];
            const elements = document.querySelectorAll('section, header, footer, main > div, [class*="section"], h1, h2, h3, p, a, button, img, nav');
            elements.forEach(el => {
                const rect = el.getBoundingClientRect();
                if (rect.height < 10) return;

                const cs = getComputedStyle(el);
                const selector = buildUniqueSelector(el);

                results.push({
                    selector,
                    tag: el.tagName.toLowerCase(),
                    y: Math.round(rect.y + window.scrollY),
                    styles: {
                        backgroundColor: cs.backgroundColor,
                        color: cs.color,
                        fontSize: cs.fontSize,
                        fontFamily: cs.fontFamily.split(',')[0].trim().replace(/['"]/g, ''),
                        padding: cs.padding,
                        margin: cs.margin,
                        gap: cs.gap,
                        display: cs.display,
                        flexDirection: cs.flexDirection,
                        borderRadius: cs.borderRadius,
                        lineHeight: cs.lineHeight,
                        letterSpacing: cs.letterSpacing,
                        textAlign: cs.textAlign,
                    },
                });
            });

            function buildUniqueSelector(el) {
                if (el.id) return `#${el.id}`;
                const classes = [...el.classList].filter(c => c.length > 2).slice(0, 2);
                const tag = el.tagName.toLowerCase();
                if (classes.length > 0) return `${tag}.${classes.join('.')}`;
                return tag;
            }

            return results;
        });

        // Diff the styles
        const issues = diffStyleSets(originalStyles, cloneStyles);

        // Distribute issues to the correct gap band or create new gap
        for (const issue of issues) {
            let matched = false;
            for (const gap of gaps) {
                if (gap.y && issue.y >= gap.y && issue.y < gap.y + (gap.height || 1000)) {
                    gap.issues.push(issue);
                    matched = true;
                    break;
                }
            }
            if (!matched && issue.priority >= 5) {
                gaps.push({
                    section: `style-gap-y${issue.y}`,
                    score: 80,
                    y: issue.y,
                    source: 'style',
                    issues: [issue],
                });
            }
        }
    } catch (e) {
        console.log(`   ⚠️  Style diagnosis failed: ${e.message?.substring(0, 80)}`);
    }

    // ── DOM-level diagnosis from fidelity ──
    if (fidelityResult?.details?.dom) {
        const { original, clone } = fidelityResult.details.dom;
        if (original && clone) {
            if (original.images > clone.images) {
                gaps.push({
                    section: 'assets',
                    source: 'fidelity',
                    issues: [{
                        type: 'ASSET_MISSING',
                        count: original.images - clone.images,
                        priority: 6,
                    }],
                });
            }
            if (original.headings > clone.headings) {
                gaps.push({
                    section: 'dom-headings',
                    source: 'fidelity',
                    issues: [{
                        type: 'MISSING_ELEMENT',
                        elementType: 'headings',
                        expected: original.headings,
                        actual: clone.headings,
                        priority: 5,
                    }],
                });
            }
        }
    }

    // Sort by score (lowest first = most work needed)
    return gaps.sort((a, b) => (a.score || 100) - (b.score || 100));
}


// ═══════════════════════════════════════════════════════════════
//  STYLE DIFF ENGINE
// ═══════════════════════════════════════════════════════════════
function diffStyleSets(originalStyles, cloneStyles) {
    const issues = [];

    // Build lookup by selector
    const cloneMap = new Map();
    for (const cs of cloneStyles) {
        cloneMap.set(cs.selector, cs);
    }

    for (const orig of originalStyles) {
        const clone = cloneMap.get(orig.selector);
        if (!clone) continue; // Element not in clone, skip

        const os = orig.styles;
        const cs = clone.styles;

        // Color mismatches
        if (os.backgroundColor && os.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
            os.backgroundColor !== cs.backgroundColor) {
            issues.push({
                type: 'COLOR_MISMATCH',
                selector: orig.selector,
                property: 'background-color',
                expected: os.backgroundColor,
                actual: cs.backgroundColor,
                y: orig.y,
                priority: colorPriority(os.backgroundColor),
            });
        }

        if (os.color !== cs.color) {
            issues.push({
                type: 'COLOR_MISMATCH',
                selector: orig.selector,
                property: 'color',
                expected: os.color,
                actual: cs.color,
                y: orig.y,
                priority: 6,
            });
        }

        // Font mismatches
        if (os.fontFamily !== cs.fontFamily && orig.tag.match(/^(h[1-6]|p|a|span|button|li)$/)) {
            issues.push({
                type: 'FONT_MISMATCH',
                selector: orig.selector,
                property: 'font-family',
                expected: os.fontFamily,
                actual: cs.fontFamily,
                expectedSize: os.fontSize,
                y: orig.y,
                priority: 7,
            });
        }

        if (os.fontSize !== cs.fontSize && orig.tag.match(/^(h[1-6]|p|a|span|button)$/)) {
            issues.push({
                type: 'FONT_MISMATCH',
                selector: orig.selector,
                property: 'font-size',
                expected: os.fontSize,
                actual: cs.fontSize,
                y: orig.y,
                priority: 6,
            });
        }

        // Spacing mismatches
        if (os.padding !== cs.padding && significantDiff(os.padding, cs.padding)) {
            issues.push({
                type: 'SPACING_OFF',
                selector: orig.selector,
                property: 'padding',
                expected: os.padding,
                actual: cs.padding,
                y: orig.y,
                priority: 5,
            });
        }

        if (os.margin !== cs.margin && significantDiff(os.margin, cs.margin)) {
            issues.push({
                type: 'SPACING_OFF',
                selector: orig.selector,
                property: 'margin',
                expected: os.margin,
                actual: cs.margin,
                y: orig.y,
                priority: 4,
            });
        }

        if (os.gap !== cs.gap && os.gap !== 'normal' && significantDiff(os.gap, cs.gap)) {
            issues.push({
                type: 'SPACING_OFF',
                selector: orig.selector,
                property: 'gap',
                expected: os.gap,
                actual: cs.gap,
                y: orig.y,
                priority: 5,
            });
        }

        // Layout mismatches
        if (os.display !== cs.display) {
            issues.push({
                type: 'LAYOUT_SHIFT',
                selector: orig.selector,
                property: 'display',
                expected: os.display,
                actual: cs.display,
                y: orig.y,
                priority: 8,
            });
        }

        if (os.flexDirection !== cs.flexDirection && os.display === 'flex') {
            issues.push({
                type: 'LAYOUT_SHIFT',
                selector: orig.selector,
                property: 'flex-direction',
                expected: os.flexDirection,
                actual: cs.flexDirection,
                y: orig.y,
                priority: 8,
            });
        }

        // Border radius
        if (os.borderRadius !== cs.borderRadius && significantDiff(os.borderRadius, cs.borderRadius)) {
            issues.push({
                type: 'SPACING_OFF',
                selector: orig.selector,
                property: 'border-radius',
                expected: os.borderRadius,
                actual: cs.borderRadius,
                y: orig.y,
                priority: 3,
            });
        }
    }

    // Sort by priority (highest first)
    return issues.sort((a, b) => b.priority - a.priority);
}


// ═══════════════════════════════════════════════════════════════
//  4. PATCH — Apply CSS fixes
// ═══════════════════════════════════════════════════════════════
async function applyPatches(diagnosis, cloneDir) {
    let patchCount = 0;
    const patchCSS = [];
    const patchLog = [];

    for (const gap of diagnosis) {
        if (!gap.issues) continue;

        for (const issue of gap.issues) {
            // Skip low-priority issues to avoid noise
            if (issue.priority < 4) continue;

            switch (issue.type) {
                case 'COLOR_MISMATCH':
                    patchCSS.push(`${issue.selector} { ${issue.property}: ${issue.expected} !important; }`);
                    patchLog.push({ type: issue.type, selector: issue.selector, prop: issue.property, from: issue.actual, to: issue.expected });
                    patchCount++;
                    break;

                case 'SPACING_OFF':
                    patchCSS.push(`${issue.selector} { ${issue.property}: ${issue.expected} !important; }`);
                    patchLog.push({ type: issue.type, selector: issue.selector, prop: issue.property, from: issue.actual, to: issue.expected });
                    patchCount++;
                    break;

                case 'FONT_MISMATCH':
                    if (issue.property === 'font-family') {
                        patchCSS.push(`${issue.selector} { font-family: ${issue.expected} !important; }`);
                    } else {
                        patchCSS.push(`${issue.selector} { ${issue.property}: ${issue.expected} !important; }`);
                    }
                    patchLog.push({ type: issue.type, selector: issue.selector, prop: issue.property, from: issue.actual, to: issue.expected });
                    patchCount++;
                    break;

                case 'LAYOUT_SHIFT':
                    patchCSS.push(`${issue.selector} { ${issue.property}: ${issue.expected} !important; }`);
                    patchLog.push({ type: issue.type, selector: issue.selector, prop: issue.property, from: issue.actual, to: issue.expected });
                    patchCount++;
                    break;

                case 'ASSET_MISSING':
                    patchLog.push({ type: issue.type, count: issue.count, note: 'Asset re-download not automated yet' });
                    break;

                case 'MISSING_ELEMENT':
                    patchLog.push({ type: issue.type, elementType: issue.elementType, expected: issue.expected, actual: issue.actual });
                    break;
            }
        }
    }

    // Write CSS patch file (separate from original styles.css!)
    if (patchCSS.length > 0) {
        const patchPath = path.join(cloneDir, 'healing-patches.css');

        // Read existing patches and append
        let existing = '';
        try { existing = await fs.readFile(patchPath, 'utf-8'); } catch { }

        const newCSS =
            (existing ? existing + '\n' : '/* ═══ Self-Healing Patches (auto-generated) ═══ */\n\n') +
            `/* ── Iteration patch ── */\n` +
            patchCSS.join('\n') + '\n';

        await fs.writeFile(patchPath, newCSS);

        // Ensure index.html has the patch link
        await injectPatchLink(cloneDir);
    }

    return { patchCount, patches: patchLog };
}


// ═══════════════════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════════════════

async function injectPatchLink(cloneDir) {
    const htmlPath = path.join(cloneDir, 'index.html');
    try {
        let html = await fs.readFile(htmlPath, 'utf-8');
        const linkTag = '<link rel="stylesheet" href="healing-patches.css">';

        if (!html.includes('healing-patches.css')) {
            html = html.replace('</head>', `    ${linkTag}\n</head>`);
            await fs.writeFile(htmlPath, html);
        }
    } catch (e) {
        console.log(`   ⚠️  Could not inject patch link: ${e.message?.substring(0, 60)}`);
    }
}

function colorPriority(color) {
    // Transparent/white/black backgrounds are low priority
    if (!color || color === 'rgba(0, 0, 0, 0)' || color === 'transparent') return 2;
    if (color === 'rgb(255, 255, 255)' || color === 'rgb(0, 0, 0)') return 5;
    return 7; // Colored backgrounds are high priority
}

function significantDiff(a, b) {
    if (!a || !b) return false;
    // Extract numeric values and compare
    const numsA = a.match(/[\d.]+/g)?.map(Number) || [];
    const numsB = b.match(/[\d.]+/g)?.map(Number) || [];
    if (numsA.length !== numsB.length) return true;
    for (let i = 0; i < numsA.length; i++) {
        if (Math.abs(numsA[i] - numsB[i]) > 3) return true; // >3px difference
    }
    return false;
}
