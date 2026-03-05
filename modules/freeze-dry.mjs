/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Freeze-Dry Snapshot v1.0                                     ║
 * ║  Inline computed styles → strip all JS/CSS → static HTML      ║
 * ║  Works on ANY website regardless of framework                  ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Important CSS properties to capture (skip defaults to reduce file size)
 */
const IMPORTANT_PROPS = [
    'display', 'position', 'top', 'right', 'bottom', 'left',
    'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'background', 'background-color', 'background-image', 'background-size', 'background-position', 'background-repeat',
    'color', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-align', 'text-decoration', 'text-transform',
    'border', 'border-radius', 'border-color', 'border-width', 'border-style',
    'box-shadow', 'opacity', 'overflow', 'overflow-x', 'overflow-y',
    'transform', 'transition', 'z-index',
    'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-self', 'flex', 'flex-grow', 'flex-shrink', 'gap',
    'grid-template-columns', 'grid-template-rows', 'grid-column', 'grid-row', 'grid-gap',
    'white-space', 'word-break', 'cursor', 'pointer-events', 'visibility',
    'clip-path', 'object-fit', 'object-position', 'filter', 'backdrop-filter',
    'mix-blend-mode', 'isolation',
];

/**
 * Browser-side script: inline computed styles for all elements
 */
function getFreezeDryScript() {
    return `
    (function freezeDry() {
        const PROPS = ${JSON.stringify(IMPORTANT_PROPS)};
        const DEFAULTS = {};
        
        // Get default values from a fresh element
        const probe = document.createElement('div');
        document.body.appendChild(probe);
        const probeStyle = getComputedStyle(probe);
        PROPS.forEach(p => { DEFAULTS[p] = probeStyle.getPropertyValue(p); });
        probe.remove();
        
        // Walk all elements
        const all = document.querySelectorAll('*');
        let inlined = 0;
        
        all.forEach(el => {
            // Skip <script>, <style>, <link> — will be removed later
            if (['SCRIPT', 'STYLE', 'LINK', 'NOSCRIPT'].includes(el.tagName)) return;
            
            const computed = getComputedStyle(el);
            const styles = [];
            
            PROPS.forEach(prop => {
                const val = computed.getPropertyValue(prop);
                // Only inline non-default values
                if (val && val !== DEFAULTS[prop] && val !== 'none' && val !== 'auto' && val !== 'normal' && val !== '0px' && val !== 'rgb(0, 0, 0)') {
                    styles.push(prop + ':' + val);
                }
            });
            
            if (styles.length > 0) {
                el.setAttribute('style', styles.join(';'));
                inlined++;
            }
        });
        
        // Remove ALL scripts
        document.querySelectorAll('script').forEach(s => s.remove());
        
        // Remove ALL stylesheets
        document.querySelectorAll('style').forEach(s => s.remove());
        document.querySelectorAll('link[rel="stylesheet"]').forEach(l => l.remove());
        
        // Remove event attributes
        all.forEach(el => {
            for (const attr of [...el.attributes]) {
                if (attr.name.startsWith('on') || attr.name.startsWith('data-framer') || attr.name === 'data-reactroot') {
                    el.removeAttribute(attr.name);
                }
            }
        });
        
        return { inlined, total: all.length };
    })();
    `;
}

/**
 * Run freeze-dry on a Puppeteer page
 * @param {import('puppeteer').Page} page - Puppeteer page (must already be navigated)
 * @param {Object} options
 * @returns {Object} { html, stats }
 */
export async function freezeDryPage(page, options = {}) {
    const { waitTime = 5000 } = options;

    // Wait for all animations/transitions to settle
    await new Promise(r => setTimeout(r, waitTime));

    // Scroll to bottom and back to trigger lazy-loaded content
    await page.evaluate(async () => {
        const h = document.body.scrollHeight;
        for (let y = 0; y < h; y += 500) {
            window.scrollTo(0, y);
            await new Promise(r => setTimeout(r, 100));
        }
        window.scrollTo(0, 0);
        await new Promise(r => setTimeout(r, 1000));
    });

    // Run the freeze-dry script
    const stats = await page.evaluate(getFreezeDryScript());

    // Get the frozen HTML
    const html = await page.evaluate(() => {
        // Add meta charset
        const head = document.querySelector('head');
        if (head && !head.querySelector('meta[charset]')) {
            const meta = document.createElement('meta');
            meta.setAttribute('charset', 'utf-8');
            head.prepend(meta);
        }
        return '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
    });

    return { html, stats };
}

/**
 * Freeze-dry a URL and save to output directory
 * @param {import('puppeteer').Page} page - Puppeteer page
 * @param {string} url - Target URL
 * @param {string} outputDir - Output directory
 * @param {Object} options
 */
export async function freezeDryAndSave(page, url, outputDir, options = {}) {
    console.log('  ❄  Freeze-Dry: Starting...');

    // Navigate if URL provided
    if (url) {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    }

    // Collect asset URLs before freeze-drying
    const assetUrls = await page.evaluate(() => {
        const urls = new Set();
        document.querySelectorAll('img[src]').forEach(el => urls.add(el.src));
        document.querySelectorAll('[style]').forEach(el => {
            const m = el.style.backgroundImage?.match(/url\(["']?(.+?)["']?\)/);
            if (m) urls.add(m[1]);
        });
        document.querySelectorAll('video source[src]').forEach(el => urls.add(el.src));
        document.querySelectorAll('link[rel="icon"][href]').forEach(el => urls.add(el.href));
        return [...urls].filter(u => u.startsWith('http'));
    });

    // Run freeze-dry
    const { html, stats } = await freezeDryPage(page, options);
    console.log(`  ❄  Freeze-Dry: Inlined ${stats.inlined}/${stats.total} elements`);

    // Save
    const freezeDir = path.join(outputDir, 'freeze-dried');
    await fs.mkdir(freezeDir, { recursive: true });

    // Download assets
    const assetsDir = path.join(freezeDir, 'assets');
    await fs.mkdir(assetsDir, { recursive: true });

    let localizedHtml = html;
    let downloadedCount = 0;

    for (const assetUrl of assetUrls) {
        try {
            const response = await page.goto(assetUrl, { timeout: 10000 });
            if (response && response.ok()) {
                const buffer = await response.buffer();
                const filename = `asset_${downloadedCount}${path.extname(new URL(assetUrl).pathname) || '.bin'}`;
                await fs.writeFile(path.join(assetsDir, filename), buffer);
                localizedHtml = localizedHtml.split(assetUrl).join(`assets/${filename}`);
                downloadedCount++;
            }
        } catch {
            // Skip failed assets
        }
    }

    // Navigate back to original URL for subsequent operations
    if (url) {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    }

    await fs.writeFile(path.join(freezeDir, 'index.html'), localizedHtml, 'utf-8');

    console.log(`  ❄  Freeze-Dry: Saved to ${freezeDir}`);
    console.log(`  ❄  Freeze-Dry: ${downloadedCount} assets downloaded`);

    return {
        outputPath: freezeDir,
        stats: { ...stats, assets: downloadedCount },
    };
}
