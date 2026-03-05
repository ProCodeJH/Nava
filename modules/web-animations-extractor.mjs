/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Web Animations Extractor v1.0                                ║
 * ║  document.getAnimations() + scroll position diff              ║
 * ║  → Structured animation data + GSAP ScrollTrigger codegen     ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Browser-side: Extract all currently running Web Animations
 */
function getAnimationsScript() {
    return `
    (function extractAnimations() {
        const animations = document.getAnimations();
        return animations.map(anim => {
            const effect = anim.effect;
            const target = effect?.target;
            if (!target) return null;

            // Build a CSS selector for the target
            let selector = target.tagName.toLowerCase();
            if (target.id) selector = '#' + target.id;
            else if (target.className && typeof target.className === 'string') {
                selector = '.' + target.className.trim().split(/\\s+/).join('.');
            }

            let keyframes = [];
            let timing = {};
            try {
                keyframes = effect.getKeyframes();
                timing = effect.getTiming();
            } catch(e) {}

            return {
                selector,
                animationName: anim.animationName || anim.id || 'unnamed',
                playState: anim.playState,
                currentTime: anim.currentTime,
                keyframes: keyframes.map(kf => {
                    const clean = {};
                    for (const [k, v] of Object.entries(kf)) {
                        if (k !== 'composite' && k !== 'easing' && k !== 'offset' && v !== undefined) {
                            clean[k] = v;
                        }
                    }
                    clean.offset = kf.offset;
                    clean.easing = kf.easing;
                    return clean;
                }),
                timing: {
                    duration: timing.duration,
                    delay: timing.delay,
                    easing: timing.easing,
                    iterations: timing.iterations,
                    direction: timing.direction,
                    fill: timing.fill,
                },
            };
        }).filter(Boolean);
    })();
    `;
}

/**
 * Browser-side: Snapshot tracked elements' styles at current scroll position
 */
function getScrollSnapshotScript() {
    return `
    (function snapshotStyles() {
        // Track elements with animations or transforms
        const tracked = new Set();
        
        // Elements with existing animations
        document.getAnimations().forEach(a => {
            if (a.effect?.target) tracked.add(a.effect.target);
        });
        
        // Elements with transforms, transitions, or will-change
        document.querySelectorAll('*').forEach(el => {
            const s = getComputedStyle(el);
            if (s.transform !== 'none' || s.transition !== 'all 0s ease 0s' || 
                s.willChange !== 'auto' || s.opacity !== '1' ||
                s.position === 'sticky' || s.position === 'fixed') {
                tracked.add(el);
            }
        });
        
        const result = [];
        tracked.forEach(el => {
            const s = getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            
            let selector = el.tagName.toLowerCase();
            if (el.id) selector = '#' + el.id;
            else if (el.className && typeof el.className === 'string' && el.className.trim()) {
                selector = '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.');
            }
            
            result.push({
                selector,
                scrollY: window.scrollY,
                rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
                opacity: s.opacity,
                transform: s.transform,
                visibility: s.visibility,
                display: s.display,
                position: s.position,
            });
        });
        
        return result;
    })();
    `;
}

/**
 * Extract animations from a page via scroll recording
 * @param {import('puppeteer').Page} page
 * @param {Object} options
 */
export async function extractWebAnimations(page, options = {}) {
    const { scrollStep = 200, waitPerStep = 150 } = options;
    console.log('  🎬 Web Animations Extractor: Starting...');

    // 1. Get static Web Animations
    const staticAnims = await page.evaluate(getAnimationsScript());
    console.log(`  🎬 Found ${staticAnims.length} Web Animations`);

    // 2. Scroll recording: snapshot styles at each position
    const totalHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    const scrollFrames = [];

    for (let y = 0; y <= totalHeight; y += scrollStep) {
        await page.evaluate(scrollY => window.scrollTo(0, scrollY), y);
        await new Promise(r => setTimeout(r, waitPerStep));
        const snapshot = await page.evaluate(getScrollSnapshotScript());
        scrollFrames.push({ scrollY: y, elements: snapshot });
    }

    // Reset scroll
    await page.evaluate(() => window.scrollTo(0, 0));
    console.log(`  🎬 Recorded ${scrollFrames.length} scroll frames (0-${totalHeight}px)`);

    // 3. Analyze diffs between frames to find scroll-driven animations
    const scrollAnimations = analyzeScrollDiffs(scrollFrames);
    console.log(`  🎬 Found ${scrollAnimations.length} scroll-driven animations`);

    return {
        webAnimations: staticAnims,
        scrollAnimations,
        totalScrollHeight: totalHeight,
        frameCount: scrollFrames.length,
    };
}

/**
 * Analyze scroll frame diffs to find elements that change during scroll
 */
function analyzeScrollDiffs(frames) {
    if (frames.length < 2) return [];

    const elementChanges = new Map(); // selector → changes[]

    for (let i = 1; i < frames.length; i++) {
        const prev = frames[i - 1];
        const curr = frames[i];

        for (const currEl of curr.elements) {
            const prevEl = prev.elements.find(e => e.selector === currEl.selector);
            if (!prevEl) continue;

            const changes = {};
            let hasChange = false;

            if (prevEl.opacity !== currEl.opacity) {
                changes.opacity = { from: prevEl.opacity, to: currEl.opacity };
                hasChange = true;
            }
            if (prevEl.transform !== currEl.transform) {
                changes.transform = { from: prevEl.transform, to: currEl.transform };
                hasChange = true;
            }
            if (prevEl.visibility !== currEl.visibility) {
                changes.visibility = { from: prevEl.visibility, to: currEl.visibility };
                hasChange = true;
            }

            if (hasChange) {
                if (!elementChanges.has(currEl.selector)) {
                    elementChanges.set(currEl.selector, []);
                }
                elementChanges.get(currEl.selector).push({
                    scrollRange: [prev.scrollY, curr.scrollY],
                    changes,
                });
            }
        }
    }

    // Consolidate into scroll animation definitions
    const animations = [];
    for (const [selector, changes] of elementChanges) {
        if (changes.length < 2) continue; // Noise filter

        const startScroll = changes[0].scrollRange[0];
        const endScroll = changes[changes.length - 1].scrollRange[1];

        // Get overall property changes
        const propChanges = {};
        for (const c of changes) {
            for (const [prop, val] of Object.entries(c.changes)) {
                if (!propChanges[prop]) {
                    propChanges[prop] = { from: val.from, to: val.to };
                } else {
                    propChanges[prop].to = val.to;
                }
            }
        }

        animations.push({
            selector,
            scrollStart: startScroll,
            scrollEnd: endScroll,
            properties: propChanges,
            frameCount: changes.length,
        });
    }

    return animations;
}

/**
 * Generate GSAP ScrollTrigger code from extracted animation data
 */
export function generateGSAPCode(animData) {
    const lines = [
        '/* Auto-generated GSAP ScrollTrigger animations */',
        '/* Extracted via Web Animations API + scroll recording */',
        'gsap.registerPlugin(ScrollTrigger);',
        '',
    ];

    // Web Animations → GSAP
    for (const anim of animData.webAnimations) {
        if (anim.keyframes.length < 2) continue;
        const from = anim.keyframes[0];
        const to = anim.keyframes[anim.keyframes.length - 1];
        const dur = (anim.timing.duration || 1000) / 1000;

        const fromProps = {};
        const toProps = {};
        for (const key of Object.keys(from)) {
            if (['offset', 'easing', 'composite'].includes(key)) continue;
            fromProps[key] = from[key];
            toProps[key] = to[key];
        }

        lines.push(`gsap.fromTo('${anim.selector}', ${JSON.stringify(fromProps)}, {`);
        lines.push(`    ...${JSON.stringify(toProps)},`);
        lines.push(`    duration: ${dur}, ease: '${anim.timing.easing || 'power2.out'}'`);
        lines.push(`});`);
        lines.push('');
    }

    // Scroll animations → GSAP ScrollTrigger
    for (const anim of animData.scrollAnimations) {
        const toProps = {};
        for (const [prop, val] of Object.entries(anim.properties)) {
            toProps[prop] = val.to;
        }

        lines.push(`gsap.to('${anim.selector}', {`);
        lines.push(`    ...${JSON.stringify(toProps)},`);
        lines.push(`    ease: 'none',`);
        lines.push(`    scrollTrigger: {`);
        lines.push(`        trigger: '${anim.selector}',`);
        lines.push(`        start: '${anim.scrollStart}px top',`);
        lines.push(`        end: '${anim.scrollEnd}px top',`);
        lines.push(`        scrub: true`);
        lines.push(`    }`);
        lines.push(`});`);
        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Full pipeline: extract + save
 */
export async function extractAndSave(page, outputDir, options = {}) {
    const animData = await extractWebAnimations(page, options);

    const outDir = path.join(outputDir, 'animations-extracted');
    await fs.mkdir(outDir, { recursive: true });

    // Save raw data
    await fs.writeFile(
        path.join(outDir, 'animation-data.json'),
        JSON.stringify(animData, null, 2),
        'utf-8'
    );

    // Generate GSAP code
    const gsapCode = generateGSAPCode(animData);
    await fs.writeFile(path.join(outDir, 'animations.gsap.js'), gsapCode, 'utf-8');

    console.log(`  🎬 Saved to ${outDir}`);
    return animData;
}
