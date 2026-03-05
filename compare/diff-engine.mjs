/**
 * Diff Engine — Visual + CSS comparison between two pages
 */

import fs from 'fs/promises';
import path from 'path';

export async function runDiff(pageA, pageB, outputDir) {
    const result = {
        visual: {},
        layout: {},
        typography: {},
        colors: {},
    };

    const screenshotsDir = path.join(outputDir, 'screenshots');
    await fs.mkdir(screenshotsDir, { recursive: true });

    // ── 1. Visual comparison (full-page screenshots) ──
    const ssA = path.join(screenshotsDir, 'site-a.png');
    const ssB = path.join(screenshotsDir, 'site-b.png');

    await pageA.evaluate(() => window.scrollTo(0, 0));
    await pageB.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 500));

    await pageA.screenshot({ path: ssA, type: 'png', fullPage: true });
    await pageB.screenshot({ path: ssB, type: 'png', fullPage: true });

    result.visual.screenshotA = ssA;
    result.visual.screenshotB = ssB;

    // ── 2. Layout comparison ──
    const layoutA = await extractLayout(pageA);
    const layoutB = await extractLayout(pageB);

    result.layout.heightA = layoutA.totalHeight;
    result.layout.heightB = layoutB.totalHeight;
    result.layout.heightDiff = Math.abs(layoutA.totalHeight - layoutB.totalHeight);

    // Section-level comparison
    const sectionDiffs = [];
    const maxSections = Math.max(layoutA.sections.length, layoutB.sections.length);
    for (let i = 0; i < maxSections; i++) {
        const sA = layoutA.sections[i];
        const sB = layoutB.sections[i];

        if (sA && sB) {
            sectionDiffs.push({
                index: i,
                nameA: sA.name,
                nameB: sB.name,
                heightDiff: Math.abs(sA.height - sB.height),
                widthDiff: Math.abs(sA.width - sB.width),
                match: sA.height === sB.height && sA.width === sB.width,
            });
        } else {
            sectionDiffs.push({
                index: i,
                nameA: sA?.name || '(missing)',
                nameB: sB?.name || '(missing)',
                heightDiff: -1,
                match: false,
            });
        }
    }
    result.layout.sectionDiffs = sectionDiffs;

    // ── 3. Typography comparison ──
    const typA = await extractTypography(pageA);
    const typB = await extractTypography(pageB);

    result.typography = {
        fontsA: typA.fonts,
        fontsB: typB.fonts,
        fontsOnlyInA: typA.fonts.filter(f => !typB.fonts.includes(f)),
        fontsOnlyInB: typB.fonts.filter(f => !typA.fonts.includes(f)),
        sharedFonts: typA.fonts.filter(f => typB.fonts.includes(f)),
    };

    // ── 4. Color comparison ──
    const colA = await extractColors(pageA);
    const colB = await extractColors(pageB);

    result.colors = {
        backgroundsA: Object.keys(colA.backgrounds).slice(0, 10),
        backgroundsB: Object.keys(colB.backgrounds).slice(0, 10),
    };

    // ── Save diff report ──
    const reportPath = path.join(outputDir, 'diff-report.json');
    await fs.writeFile(reportPath, JSON.stringify(result, null, 2), 'utf-8');

    // Generate markdown diff
    const md = generateDiffMarkdown(result);
    const mdPath = path.join(outputDir, 'diff-report.md');
    await fs.writeFile(mdPath, md, 'utf-8');

    return result;
}

async function extractLayout(page) {
    return page.evaluate(() => {
        const sections = [];
        document.querySelectorAll('section, header, footer, main > div').forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.height < 50) return;
            sections.push({
                name: (el.id || el.className?.toString()?.substring(0, 40) || el.tagName).substring(0, 40),
                height: Math.round(rect.height),
                width: Math.round(rect.width),
            });
        });
        return {
            totalHeight: document.documentElement.scrollHeight,
            sections: sections.slice(0, 30),
        };
    });
}

async function extractTypography(page) {
    return page.evaluate(() => {
        const fonts = new Set();
        document.querySelectorAll('h1, h2, h3, h4, p, a, span, button').forEach(el => {
            const cs = getComputedStyle(el);
            fonts.add(cs.fontFamily.split(',')[0].replace(/['"]/g, '').trim());
        });
        return { fonts: [...fonts] };
    });
}

async function extractColors(page) {
    return page.evaluate(() => {
        const backgrounds = {};
        document.querySelectorAll('*').forEach(el => {
            const bg = getComputedStyle(el).backgroundColor;
            if (bg && bg !== 'rgba(0, 0, 0, 0)') {
                backgrounds[bg] = (backgrounds[bg] || 0) + 1;
            }
        });
        return { backgrounds };
    });
}

function generateDiffMarkdown(result) {
    const lines = [];
    lines.push(`# 🔍 Design DNA Diff Report\n`);

    // Layout
    lines.push(`## 📐 Layout Comparison\n`);
    lines.push(`| Metric | Site A | Site B | Diff |`);
    lines.push(`|:-------|:-------|:-------|:-----|`);
    lines.push(`| Total Height | ${result.layout.heightA}px | ${result.layout.heightB}px | ${result.layout.heightDiff}px |`);

    if (result.layout.sectionDiffs?.length) {
        lines.push(`\n### Section Comparison`);
        lines.push(`| # | Site A | Site B | Height Diff | Match |`);
        lines.push(`|:--|:-------|:-------|:------------|:------|`);
        result.layout.sectionDiffs.forEach(s => {
            lines.push(`| ${s.index} | ${s.nameA} | ${s.nameB} | ${s.heightDiff}px | ${s.match ? '✅' : '❌'} |`);
        });
    }

    // Typography
    lines.push(`\n## 📝 Typography\n`);
    lines.push(`**Shared:** ${result.typography.sharedFonts?.join(', ') || 'none'}`);
    if (result.typography.fontsOnlyInA?.length) {
        lines.push(`**Only in A:** ${result.typography.fontsOnlyInA.join(', ')}`);
    }
    if (result.typography.fontsOnlyInB?.length) {
        lines.push(`**Only in B:** ${result.typography.fontsOnlyInB.join(', ')}`);
    }

    // Colors
    lines.push(`\n## 🎨 Colors\n`);
    lines.push(`**Site A top colors:** ${result.colors.backgroundsA?.slice(0, 5).map(c => `\`${c}\``).join(', ')}`);
    lines.push(`**Site B top colors:** ${result.colors.backgroundsB?.slice(0, 5).map(c => `\`${c}\``).join(', ')}`);

    lines.push('\n---\n*Generated by design-dna v4.0*\n');
    return lines.join('\n');
}
