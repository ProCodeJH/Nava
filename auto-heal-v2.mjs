/**
 * Auto-Healing Iteration 2: 더 정밀한 패치
 * - 뷰포트 외곽 overflow 수정
 * - 원본의 주요 요소 정확한 transform 추출
 * - 카드 3D perspective 수정
 */

import puppeteer from 'puppeteer';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import fs from 'fs';

const OUT = 'C:/Users/louis/.gemini/antigravity/brain/c8c604e9-df36-47b2-9524-85e90f403b18';
const FD_HTML = 'c:/Users/louis/.gemini/antigravity/scratch/design-dna/test-v12-live/freeze-dried/index.html';

// ═══════ Step 1: 원본에서 더 정밀한 스타일 추출 ═══════
async function extractPreciseStyles(url, label) {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 4000));

    const data = await page.evaluate(() => {
        const results = [];

        // Grab ALL visible elements with exact transforms
        const all = document.querySelectorAll('*');
        for (const el of all) {
            const rect = el.getBoundingClientRect();
            if (rect.width < 2 || rect.height < 2) continue;
            if (rect.bottom < 0 || rect.top > 1000) continue;

            const cs = window.getComputedStyle(el);
            const tag = el.tagName.toLowerCase();
            const cls = Array.from(el.classList || []).join(' ').substring(0, 200);

            // Focus on transform-related and layout-critical props
            results.push({
                tag, cls,
                rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
                styles: {
                    transform: cs.transform,
                    transformOrigin: cs.transformOrigin,
                    perspective: cs.perspective,
                    perspectiveOrigin: cs.perspectiveOrigin,
                    width: cs.width,
                    height: cs.height,
                    maxWidth: cs.maxWidth,
                    minWidth: cs.minWidth,
                    left: cs.left,
                    top: cs.top,
                    right: cs.right,
                    bottom: cs.bottom,
                    position: cs.position,
                    display: cs.display,
                    overflow: cs.overflow,
                    overflowX: cs.overflowX,
                    overflowY: cs.overflowY,
                    opacity: cs.opacity,
                    visibility: cs.visibility,
                    backgroundColor: cs.backgroundColor,
                    backgroundImage: cs.backgroundImage,
                    borderRadius: cs.borderRadius,
                    boxShadow: cs.boxShadow,
                    padding: cs.padding,
                    margin: cs.margin,
                    zIndex: cs.zIndex,
                }
            });
        }

        return results;
    });

    await browser.close();
    console.log(`[${label}] ${data.length} elements extracted`);
    return data;
}

// ═══════ Step 2: 차이 분석 + 패치 생성 (위치 기반 매칭) ═══════
function matchAndPatch(origEls, cloneEls) {
    const patches = [];
    const criticalProps = [
        'transform', 'transformOrigin', 'perspective', 'perspectiveOrigin',
        'width', 'height', 'maxWidth', 'left', 'top', 'right', 'bottom',
        'overflow', 'overflowX', 'overflowY', 'opacity', 'display',
        'backgroundColor', 'borderRadius', 'padding', 'margin', 'zIndex',
    ];

    for (const orig of origEls) {
        // Position-based matching with same tag
        let best = null, bestScore = Infinity;
        for (const clone of cloneEls) {
            if (clone.tag !== orig.tag) continue;
            // Prefer exact class match
            const classMatch = orig.cls && clone.cls && orig.cls === clone.cls;

            const dx = Math.abs(orig.rect.x - clone.rect.x);
            const dy = Math.abs(orig.rect.y - clone.rect.y);
            const dw = Math.abs(orig.rect.w - clone.rect.w);
            const dh = Math.abs(orig.rect.h - clone.rect.h);

            let score = dx + dy + dw * 0.3 + dh * 0.3;
            if (classMatch) score *= 0.01; // Strongly prefer class match

            if (score < bestScore && score < 300) {
                bestScore = score;
                best = clone;
            }
        }

        if (!best) continue;

        const diffs = {};
        let diffCount = 0;
        for (const prop of criticalProps) {
            const ov = orig.styles[prop];
            const cv = best.styles[prop];
            if (ov && cv && ov !== cv && ov !== 'none' && ov !== 'auto' && ov !== 'normal') {
                diffs[prop] = ov;
                diffCount++;
            }
        }

        if (diffCount > 0 && orig.cls) {
            const firstClass = orig.cls.split(' ')[0];
            if (firstClass && !firstClass.includes(' ')) {
                patches.push({ selector: '.' + firstClass, diffs, rect: orig.rect });
            }
        }
    }

    return patches;
}

function generateCSS(patches) {
    const seen = new Set();
    const rules = [];

    for (const p of patches) {
        if (seen.has(p.selector)) continue;
        seen.add(p.selector);

        const props = [];
        for (const [prop, val] of Object.entries(p.diffs)) {
            const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
            props.push(`  ${cssProp}: ${val} !important;`);
        }

        if (props.length > 0) {
            rules.push(`${p.selector} {\n${props.join('\n')}\n}`);
        }
    }

    return `/* Auto-healing iteration 2 */\n${rules.join('\n\n')}`;
}

// ═══════ Step 3: pixelmatch ═══════
function measure(fileA, fileB, outDiff) {
    const imgA = PNG.sync.read(fs.readFileSync(fileA));
    const imgB = PNG.sync.read(fs.readFileSync(fileB));
    const w = Math.min(imgA.width, imgB.width), h = Math.min(imgA.height, imgB.height);
    function crop(img, tw, th) {
        if (img.width === tw && img.height === th) return img.data;
        const o = Buffer.alloc(tw * th * 4);
        for (let y = 0; y < th; y++) img.data.copy(o, y * tw * 4, y * img.width * 4, y * img.width * 4 + tw * 4);
        return o;
    }
    const diffImg = new PNG({ width: w, height: h });
    const nd = pixelmatch(crop(imgA, w, h), crop(imgB, w, h), diffImg.data, w, h, { threshold: 0.1 });
    fs.writeFileSync(outDiff, PNG.sync.write(diffImg));
    const pct = ((nd / (w * h)) * 100).toFixed(2);
    return { diff: pct, fidelity: (100 - parseFloat(pct)).toFixed(2) };
}

// ═══════ MAIN ═══════
console.log('═══ Auto-Healing Iteration 2 ═══\n');

console.log('Extracting original styles...');
const origEls = await extractPreciseStyles('https://teamevople.kr', 'ORIG');
console.log('Extracting freeze-dry styles...');
const cloneEls = await extractPreciseStyles('http://localhost:4040', 'FD');

console.log('\nMatching and generating patches...');
const patches = matchAndPatch(origEls, cloneEls);
console.log(`${patches.length} elements with differences`);

const css = generateCSS(patches);
const patchPath = 'c:/Users/louis/.gemini/antigravity/scratch/design-dna/test-v12-live/freeze-dried/healing-patch-v2.css';
fs.writeFileSync(patchPath, css, 'utf-8');
console.log(`healing-patch-v2.css: ${css.split('\n').length} lines`);

// Inject v2 patch
let html = fs.readFileSync(FD_HTML, 'utf-8');
if (!html.includes('healing-patch-v2.css')) {
    html = html.replace('</head>', '    <link rel="stylesheet" href="healing-patch-v2.css">\n</head>');
    fs.writeFileSync(FD_HTML, html, 'utf-8');
}

// Screenshot + measure
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const p1 = await browser.newPage();
await p1.setViewport({ width: 1440, height: 900 });
await p1.goto('https://teamevople.kr', { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise(r => setTimeout(r, 4000));
await p1.screenshot({ path: `${OUT}/iter2_orig.png` });

const p2 = await browser.newPage();
await p2.setViewport({ width: 1440, height: 900 });
await p2.goto('http://localhost:4040', { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 5000));
await p2.screenshot({ path: `${OUT}/iter2_fd.png` });
await browser.close();

const result = measure(`${OUT}/iter2_orig.png`, `${OUT}/iter2_fd.png`, `${OUT}/iter2_diff.png`);
console.log(`\n═══ ITERATION 2 RESULT ═══`);
console.log(`Diff: ${result.diff}%  Fidelity: ${result.fidelity}%`);
