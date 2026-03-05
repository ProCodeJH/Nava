/**
 * v7.0 Auto-Clone: DOM Capture & Section Code Generator
 * 
 * Captures the full DOM structure and generates clean, semantic HTML+CSS:
 *  - Full page DOM serialization with computed styles
 *  - Section-by-section extraction
 *  - Asset URL rewriting (original → local paths)
 *  - Clean HTML output (removes scripts, data attributes, tracking)
 *  - Inline styles → CSS classes conversion
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Capture the full DOM and generate cloned HTML/CSS
 */
export async function captureAndGenerateCode(page, baseUrl, outputDir, dnaData, assetMap, animationData) {
    const cloneDir = path.join(outputDir, 'clone');
    await fs.mkdir(cloneDir, { recursive: true });

    // ═══ 1. Capture complete DOM structure with computed styles ═══
    const domData = await page.evaluate((base) => {
        // Get all stylesheets as text
        const stylesheets = [];
        for (const sheet of document.styleSheets) {
            try {
                const rules = [];
                for (const rule of sheet.cssRules) {
                    rules.push(rule.cssText);
                }
                stylesheets.push({
                    href: sheet.href,
                    rules: rules,
                });
            } catch {
                // CORS blocked — store just the href
                if (sheet.href) stylesheets.push({ href: sheet.href, rules: [] });
            }
        }

        // Get meta tags
        const metaTags = [];
        document.querySelectorAll('meta').forEach(m => {
            const attrs = {};
            for (const a of m.attributes) attrs[a.name] = a.value;
            metaTags.push(attrs);
        });

        // Get link tags (stylesheets, fonts, icons)
        const linkTags = [];
        document.querySelectorAll('link').forEach(l => {
            const attrs = {};
            for (const a of l.attributes) attrs[a.name] = a.value;
            linkTags.push(attrs);
        });

        // Title
        const title = document.title;

        // Get body HTML (cleaned)
        const bodyClone = document.body.cloneNode(true);

        // Remove unwanted elements
        bodyClone.querySelectorAll('script, noscript, iframe[src*="analytics"], iframe[src*="tag"], [data-gtm], [data-ga]').forEach(el => el.remove());

        // Clean attributes on all elements
        const cleanAttrs = (el) => {
            const removeAttrs = ['data-gtm-click', 'data-ga', 'data-gtm', 'data-analytics', 'data-track',
                'onclick', 'onload', 'onerror', 'onmouseover', 'data-reactid', 'data-react-checksum'];
            removeAttrs.forEach(attr => el.removeAttribute(attr));
        };
        bodyClone.querySelectorAll('*').forEach(cleanAttrs);

        // Serialize sections
        const sections = [];
        const topLevelChildren = bodyClone.children;
        for (let i = 0; i < topLevelChildren.length; i++) {
            const child = topLevelChildren[i];
            const tag = child.tagName.toLowerCase();
            if (tag === 'style' || tag === 'link') continue;

            sections.push({
                index: i,
                tag: tag,
                id: child.id || null,
                className: child.className || '',
                html: child.outerHTML,
            });
        }

        // Full body HTML
        const fullBodyHTML = bodyClone.innerHTML;

        return {
            title,
            metaTags,
            linkTags,
            stylesheets,
            sections,
            fullBodyHTML,
            lang: document.documentElement.lang || 'en',
            dir: document.documentElement.dir || 'ltr',
        };
    }, baseUrl);

    // ═══ 2. Generate CSS from DNA tokens + captured stylesheets ═══
    const cssContent = generateCSS(dnaData, domData);

    // ═══ 3. Rewrite asset URLs ═══
    let processedHTML = domData.fullBodyHTML;
    if (assetMap && assetMap.images) {
        for (const img of assetMap.images) {
            if (img.original && img.local) {
                processedHTML = processedHTML.split(img.original).join(img.local);
            }
        }
    }

    // ═══ 4. Build animation script tags ═══
    const cdnScripts = (animationData?.cdnLinks || [])
        .map(url => `    <script src="${url}"></script>`)
        .join('\n');

    const animScriptTag = animationData?.script
        ? '    <script src="animations.js" defer></script>'
        : '';

    // ═══ 5. Build complete HTML page ═══
    const googleFontLinks = (assetMap?.fonts || [])
        .filter(f => f.type === 'google-fonts-link')
        .map(f => `    <link rel="stylesheet" href="${f.url}">`)
        .join('\n');

    const metaHTML = domData.metaTags
        .filter(m => m.charset || m.name === 'viewport' || m.name === 'description' || m.property?.startsWith('og:'))
        .map(m => {
            const attrs = Object.entries(m).map(([k, v]) => `${k}="${escapeAttr(v)}"`).join(' ');
            return `    <meta ${attrs}>`;
        }).join('\n');

    const fullPage = `<!DOCTYPE html>
<html lang="${domData.lang}" dir="${domData.dir}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHTML(domData.title)}</title>
${metaHTML}
${googleFontLinks}
    <link rel="stylesheet" href="styles.css">
</head>
<body>
${processedHTML}
${cdnScripts}
${animScriptTag}
</body>
</html>`;

    // ═══ 5. Generate per-section files ═══
    const sectionFiles = [];
    for (const section of domData.sections) {
        let sectionHTML = section.html;
        // Rewrite asset URLs in section
        if (assetMap?.images) {
            for (const img of assetMap.images) {
                if (img.original && img.local) {
                    sectionHTML = sectionHTML.split(img.original).join(img.local);
                }
            }
        }
        const filename = `section-${section.index}-${section.tag}${section.id ? '-' + section.id : ''}.html`;
        await fs.writeFile(path.join(cloneDir, filename), sectionHTML, 'utf8');
        sectionFiles.push(filename);
    }

    // ═══ 7. Write output files ═══
    await fs.writeFile(path.join(cloneDir, 'index.html'), fullPage, 'utf8');
    await fs.writeFile(path.join(cloneDir, 'styles.css'), cssContent, 'utf8');

    // Write animation script
    if (animationData?.script) {
        await fs.writeFile(path.join(cloneDir, 'animations.js'), animationData.script, 'utf8');
    }

    // ═══ 7. Copy captured stylesheets ═══
    const externalCSS = [];
    for (const sheet of domData.stylesheets) {
        if (sheet.rules.length > 0) {
            externalCSS.push(sheet.rules.join('\n'));
        }
    }
    if (externalCSS.length > 0) {
        await fs.writeFile(path.join(cloneDir, 'original-styles.css'), externalCSS.join('\n\n'), 'utf8');
    }

    return {
        files: {
            html: 'clone/index.html',
            css: 'clone/styles.css',
            animations: animationData?.script ? 'clone/animations.js' : null,
            originalCSS: externalCSS.length > 0 ? 'clone/original-styles.css' : null,
            sections: sectionFiles.map(f => 'clone/' + f),
        },
        stats: {
            sections: domData.sections.length,
            stylesheetRules: domData.stylesheets.reduce((sum, s) => sum + s.rules.length, 0),
            metaTags: domData.metaTags.length,
            totalSize: fullPage.length + cssContent.length,
        },
    };
}

/**
 * Generate comprehensive CSS from DNA data
 */
function generateCSS(dnaData, domData) {
    const lines = [];

    lines.push('/* ═══════════════════════════════════════════ */');
    lines.push('/*  Auto-generated by Design-DNA v7.0 Clone   */');
    lines.push('/* ═══════════════════════════════════════════ */');
    lines.push('');

    // ═══ CSS Variables ═══
    lines.push(':root {');

    // Colors from tokens
    const bgColors = dnaData.tokens?.colors?.backgrounds || {};
    const textColors = dnaData.tokens?.colors?.textColors || {};
    let colorIndex = 0;
    for (const [val, count] of Object.entries(bgColors)) {
        lines.push(`  --bg-${colorIndex}: ${val};`);
        colorIndex++;
    }
    colorIndex = 0;
    for (const [val, count] of Object.entries(textColors)) {
        lines.push(`  --text-${colorIndex}: ${val};`);
        colorIndex++;
    }

    // CSS Custom Properties from original
    const vars = dnaData.tokens?.variables || {};
    for (const [name, val] of Object.entries(vars)) {
        if (name.startsWith('--')) lines.push(`  ${name}: ${val};`);
    }

    // Typography
    const fonts = dnaData.tokens?.typography?.fonts || [];
    if (fonts.length > 0) {
        lines.push(`  --font-primary: '${fonts[0]}', sans-serif;`);
        if (fonts.length > 1) lines.push(`  --font-secondary: '${fonts[1]}', serif;`);
    }

    lines.push('}');
    lines.push('');

    // ═══ Reset ═══
    lines.push('*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }');
    lines.push('');

    // ═══ Base Styles ═══
    lines.push('html {');
    lines.push('  scroll-behavior: smooth;');
    lines.push('}');
    lines.push('');

    lines.push('body {');
    if (fonts.length > 0) lines.push(`  font-family: var(--font-primary);`);
    const bodyBg = Object.keys(bgColors)[0];
    if (bodyBg) lines.push(`  background-color: ${bodyBg};`);
    const bodyText = Object.keys(textColors)[0];
    if (bodyText) lines.push(`  color: ${bodyText};`);
    lines.push('  line-height: 1.6;');
    lines.push('  overflow-x: hidden;');
    lines.push('}');
    lines.push('');

    // ═══ Typography classes ═══
    const sizes = dnaData.tokens?.typography?.sizes || [];
    if (sizes.length > 0) {
        const sortedSizes = [...new Set(sizes.map(s => parseFloat(s)).filter(n => !isNaN(n)))].sort((a, b) => b - a);
        const sizeNames = ['hero', 'h1', 'h2', 'h3', 'h4', 'body', 'small', 'caption'];
        sortedSizes.slice(0, 8).forEach((size, i) => {
            const name = sizeNames[i] || `text-${i}`;
            lines.push(`.text-${name} { font-size: ${size}px; }`);
        });
        lines.push('');
    }

    // ═══ Animation Keyframes ═══
    const keyframes = dnaData.animation?.keyframes || [];
    keyframes.forEach(kf => {
        if (kf.cssText) {
            lines.push(kf.cssText);
            lines.push('');
        } else if (kf.name && kf.keyframes) {
            lines.push(`@keyframes ${kf.name} {`);
            if (Array.isArray(kf.keyframes)) {
                kf.keyframes.forEach(frame => {
                    lines.push(`  ${frame.offset || '0%'} { ${frame.properties || ''} }`);
                });
            }
            lines.push('}');
            lines.push('');
        }
    });

    // ═══ Transitions ═══
    const transitions = dnaData.animation?.transitions || [];
    if (transitions.length > 0) {
        lines.push('/* Transition utilities */');
        transitions.forEach((t, i) => {
            if (t.property && t.duration) {
                lines.push(`.transition-${i} { transition: ${t.property} ${t.duration} ${t.easing || 'ease'}; }`);
            }
        });
        lines.push('');
    }

    // ═══ Responsive Breakpoints ═══
    const breakpoints = dnaData.responsive?.breakpoints || [];
    breakpoints.forEach(bp => {
        if (bp.query) {
            lines.push(`/* Breakpoint: ${bp.width || 'custom'}px */`);
            lines.push(`${bp.query} {`);
            lines.push('  /* Responsive overrides */');
            lines.push('}');
            lines.push('');
        }
    });

    // ═══ Captured CSS Rules ═══
    if (domData.stylesheets) {
        lines.push('/* ═══ Original Styles (captured) ═══ */');
        for (const sheet of domData.stylesheets) {
            if (sheet.rules.length > 0) {
                lines.push(`/* From: ${sheet.href || 'inline'} */`);
                sheet.rules.forEach(rule => {
                    lines.push(rule);
                });
                lines.push('');
            }
        }
    }

    return lines.join('\n');
}

function escapeHTML(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/&/g, '&amp;');
}
