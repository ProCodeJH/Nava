/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Vision Convergence Loop v2.0                                 ║
 * ║  Screenshot → pixelmatch diff → AI patch → repeat until ≤ ε  ║ 
 * ║  Pixel-accurate visual convergence for any clone              ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

import fs from 'fs/promises';
import path from 'path';

let _pixelmatch, _PNG;

async function loadPixelmatch() {
    if (!_pixelmatch) {
        try {
            _pixelmatch = (await import('pixelmatch')).default;
            _PNG = (await import('pngjs')).PNG;
        } catch {
            // fallback to byte comparison
        }
    }
    return { pixelmatch: _pixelmatch, PNG: _PNG };
}

/**
 * Capture screenshots at multiple scroll positions
 */
async function captureScrollshots(page, options = {}) {
    const { positions = 6, viewport = { width: 1440, height: 900 } } = options;

    await page.setViewport(viewport);
    const totalHeight = await page.evaluate(() => document.body.scrollHeight);
    const step = Math.floor(totalHeight / positions);
    const shots = [];

    for (let i = 0; i < positions; i++) {
        const scrollY = i * step;
        await page.evaluate(y => window.scrollTo(0, y), scrollY);
        await new Promise(r => setTimeout(r, 800));
        const buf = await page.screenshot({ type: 'png' });
        shots.push({ scrollY, buffer: buf });
    }

    await page.evaluate(() => window.scrollTo(0, 0));
    return shots;
}

/**
 * Pixel-accurate comparison using pixelmatch
 * Returns diff percentage and diff image buffer
 */
async function compareScreenshots(bufA, bufB) {
    const { pixelmatch, PNG } = await loadPixelmatch();

    if (!pixelmatch || !PNG) {
        // Fallback: byte-level comparison
        const minLen = Math.min(bufA.length, bufB.length);
        let diff = 0;
        for (let i = 0; i < Math.min(minLen, 50000); i++) {
            if (bufA[i] !== bufB[i]) diff++;
        }
        return { diffPercent: (diff / 50000) * 100, diffImage: null, totalPixels: 0, diffPixels: 0 };
    }

    const imgA = PNG.sync.read(bufA);
    const imgB = PNG.sync.read(bufB);

    // Resize to match if dimensions differ
    const width = Math.min(imgA.width, imgB.width);
    const height = Math.min(imgA.height, imgB.height);

    // Create cropped buffers if sizes differ
    const dataA = cropImageData(imgA, width, height);
    const dataB = cropImageData(imgB, width, height);

    const diffImg = new PNG({ width, height });
    const diffPixels = pixelmatch(dataA, dataB, diffImg.data, width, height, {
        threshold: 0.1,
        includeAA: false,
    });

    const totalPixels = width * height;
    const diffPercent = (diffPixels / totalPixels) * 100;

    return {
        diffPercent,
        diffImage: PNG.sync.write(diffImg),
        totalPixels,
        diffPixels,
        dimensions: { width, height },
    };
}

/**
 * Crop image data to target dimensions
 */
function cropImageData(img, targetW, targetH) {
    if (img.width === targetW && img.height === targetH) return img.data;
    const cropped = Buffer.alloc(targetW * targetH * 4);
    for (let y = 0; y < targetH; y++) {
        const srcOff = y * img.width * 4;
        const dstOff = y * targetW * 4;
        img.data.copy(cropped, dstOff, srcOff, srcOff + targetW * 4);
    }
    return cropped;
}

/**
 * Generate a CSS patch suggestion based on diff results
 * This is the AI-assisted part — in practice would call an LLM
 * For now, generates structured diff report for manual or AI processing
 */
function generateDiffReport(comparisons) {
    const report = {
        timestamp: new Date().toISOString(),
        totalPositions: comparisons.length,
        results: comparisons.map(c => ({
            scrollY: c.scrollY,
            diffPercent: c.diff.diffPercent.toFixed(2) + '%',
            status: c.diff.diffPercent < 2 ? '✅ MATCH' :
                c.diff.diffPercent < 10 ? '⚠️ CLOSE' : '❌ DIFFERENT',
        })),
        averageDiff: (comparisons.reduce((s, c) => s + c.diff.diffPercent, 0) / comparisons.length).toFixed(2) + '%',
        converged: comparisons.every(c => c.diff.diffPercent < 5),
    };
    return report;
}

/**
 * Run one iteration of the vision convergence loop
 * @param {import('puppeteer').Browser} browser
 * @param {string} originalUrl - URL of the original site
 * @param {string} cloneUrl - URL of the clone (e.g., localhost:3020)
 * @param {Object} options
 */
export async function runVisionIteration(browser, originalUrl, cloneUrl, options = {}) {
    const { positions = 6, viewport = { width: 1440, height: 900 } } = options;

    // Capture original
    const origPage = await browser.newPage();
    await origPage.goto(originalUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));
    const origShots = await captureScrollshots(origPage, { positions, viewport });
    await origPage.close();

    // Capture clone
    const clonePage = await browser.newPage();
    await clonePage.goto(cloneUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));
    const cloneShots = await captureScrollshots(clonePage, { positions, viewport });
    await clonePage.close();

    // Compare each position
    const comparisons = [];
    for (let i = 0; i < positions; i++) {
        const diff = await compareScreenshots(origShots[i].buffer, cloneShots[i].buffer);
        comparisons.push({
            scrollY: origShots[i].scrollY,
            diff,
        });
    }

    return {
        comparisons,
        report: generateDiffReport(comparisons),
        screenshots: { original: origShots, clone: cloneShots },
    };
}

/**
 * Full vision convergence loop
 * @param {import('puppeteer').Browser} browser
 * @param {string} originalUrl
 * @param {string} cloneUrl
 * @param {string} outputDir
 * @param {Object} options
 */
export async function runVisionLoop(browser, originalUrl, cloneUrl, outputDir, options = {}) {
    const {
        maxIterations = 5,
        convergenceThreshold = 5.0, // percent
        positions = 6,
    } = options;

    console.log('  👁  Vision Loop: Starting convergence...');
    console.log(`  👁  Original: ${originalUrl}`);
    console.log(`  👁  Clone: ${cloneUrl}`);
    console.log(`  👁  Max iterations: ${maxIterations}, threshold: ${convergenceThreshold}%`);

    const loopDir = path.join(outputDir, 'vision-loop');
    await fs.mkdir(loopDir, { recursive: true });

    const history = [];

    for (let iter = 1; iter <= maxIterations; iter++) {
        console.log(`\n  👁  === Iteration ${iter}/${maxIterations} ===`);

        const result = await runVisionIteration(browser, originalUrl, cloneUrl, { positions });
        const avgDiff = parseFloat(result.report.averageDiff);

        console.log(`  👁  Average diff: ${result.report.averageDiff}`);
        result.report.results.forEach(r => {
            console.log(`      scrollY=${r.scrollY}: ${r.diffPercent} ${r.status}`);
        });

        // Save iteration data
        const iterDir = path.join(loopDir, `iteration-${iter}`);
        await fs.mkdir(iterDir, { recursive: true });

        // Save screenshots + diff images
        for (let i = 0; i < positions; i++) {
            await fs.writeFile(
                path.join(iterDir, `original_${i}.png`),
                result.screenshots.original[i].buffer
            );
            await fs.writeFile(
                path.join(iterDir, `clone_${i}.png`),
                result.screenshots.clone[i].buffer
            );
            // Save pixel diff image (red = different)
            if (result.comparisons[i]?.diff?.diffImage) {
                await fs.writeFile(
                    path.join(iterDir, `diff_${i}.png`),
                    result.comparisons[i].diff.diffImage
                );
            }
        }

        // Save report
        await fs.writeFile(
            path.join(iterDir, 'report.json'),
            JSON.stringify(result.report, null, 2),
            'utf-8'
        );

        history.push({
            iteration: iter,
            averageDiff: avgDiff,
            converged: result.report.converged,
            positions: result.report.results,
        });

        // Check convergence
        if (result.report.converged || avgDiff <= convergenceThreshold) {
            console.log(`\n  👁  ✅ CONVERGED at iteration ${iter}! (avg diff: ${result.report.averageDiff})`);
            break;
        }

        // If not converged, generate a patch prompt for AI
        const patchPrompt = generatePatchPrompt(result, iter);
        await fs.writeFile(
            path.join(iterDir, 'patch-prompt.md'),
            patchPrompt,
            'utf-8'
        );
        console.log(`  👁  Patch prompt saved to ${iterDir}/patch-prompt.md`);

        if (iter < maxIterations) {
            console.log(`  👁  Apply patches and re-run, or continue for auto-retry...`);
        }
    }

    // Save full history
    await fs.writeFile(
        path.join(loopDir, 'convergence-history.json'),
        JSON.stringify(history, null, 2),
        'utf-8'
    );

    console.log(`\n  👁  Vision Loop complete. ${history.length} iterations.`);
    return history;
}

/**
 * Generate a patch prompt that can be fed to an AI for auto-fix
 */
function generatePatchPrompt(result, iteration) {
    const lines = [
        `# Vision Loop — Iteration ${iteration} Patch Request`,
        '',
        `## Diff Report`,
        `Average diff: ${result.report.averageDiff}`,
        '',
        `| Scroll Position | Diff | Status |`,
        `|---|---|---|`,
    ];

    for (const r of result.report.results) {
        lines.push(`| ${r.scrollY}px | ${r.diffPercent} | ${r.status} |`);
    }

    lines.push('');
    lines.push('## Instructions');
    lines.push('Compare the original_N.png and clone_N.png screenshots side-by-side.');
    lines.push('Identify the CSS differences and generate a patch CSS file that fixes the clone.');
    lines.push('Focus on: colors, font sizes, spacing, layout, backgrounds, borders, shadows.');
    lines.push('');
    lines.push('## Expected Output');
    lines.push('A CSS file (healing-patch.css) with fixes that reduce the diff percentage.');

    return lines.join('\n');
}
