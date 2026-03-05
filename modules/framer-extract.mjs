/**
 * ═══════════════════════════════════════════════════════════════
 *  DESIGN-DNA — FRAMER DYNAMIC EXTRACTION
 *  Ported from clone-engine v3.0 ULTRA
 *
 *  Captures scroll animations, hover states, parallax,
 *  keyframe animations, CSS variables, page transitions
 *
 *  Core technique: DIFFERENTIAL EXTRACTION
 *  → Capture element styles at State A
 *  → Perform action (scroll, hover, etc.)
 *  → Capture element styles at State B
 *  → Diff A↔B = the animation/interaction data
 * ═══════════════════════════════════════════════════════════════
 */

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── Main Framer extraction entry point ──────────────────────
export async function extractFramerDynamics(page, config = {}) {
    console.log('   🎬 [Framer] Extracting Framer dynamic features...');

    const results = {
        scrollAnimations: [],
        hoverInteractions: [],
        parallaxElements: [],
        cssVariables: {},
        keyframeAnimations: {},
        pageTransitions: {},
        activeAnimations: [],
        framerConfig: {},
        cssAnimationElements: [],
        transform3DElements: [],
        transitionElements: [],
    };

    // 1. Extract CSS Variables (deep — Framer runtime)
    console.log('   🔄 [Framer] [1/9] CSS Variables (deep Framer scan)...');
    results.cssVariables = await extractCSSVariablesDeep(page);

    // 2. Extract Keyframe Animations (Web Animations API + stylesheets)
    console.log('   🔄 [Framer] [2/9] Keyframe Animations (Web Animations API)...');
    const { keyframes, activeAnims } = await extractKeyframeAnimations(page);
    results.keyframeAnimations = keyframes;
    results.activeAnimations = activeAnims;

    // 3. Extract Scroll Animations (differential)
    console.log('   🔄 [Framer] [3/9] Scroll Animations (differential capture)...');
    results.scrollAnimations = await extractScrollAnimations(page, config);

    // 4. Extract Parallax (scroll-speed ratio)
    console.log('   🔄 [Framer] [4/9] Parallax (transform delta per scroll step)...');
    results.parallaxElements = await extractParallax(page, config);

    // 5. Extract Hover/Click Interactions
    console.log('   🔄 [Framer] [5/9] Hover/Click Interactions...');
    results.hoverInteractions = await extractHoverInteractions(page, config);

    // 6. Extract Page Transition Config
    console.log('   🔄 [Framer] [6/9] Page Transitions + Framer Config...');
    results.pageTransitions = await extractPageTransitions(page);
    results.framerConfig = await extractFramerConfig(page);

    // 7. Extract CSS Animation Properties
    console.log('   🔄 [Framer] [7/9] CSS Animation Properties...');
    results.cssAnimationElements = await extractCSSAnimationProperties(page);

    // 8. Extract 3D Transforms
    console.log('   🔄 [Framer] [8/9] 3D Transforms...');
    results.transform3DElements = await extract3DTransforms(page);

    // 9. Extract Transition Properties
    console.log('   🔄 [Framer] [9/9] Transition Properties...');
    results.transitionElements = await extractTransitionProperties(page);

    // Summary
    console.log(`   ✅ [Framer] Dynamics extracted:`);
    console.log(`   ℹ️  CSS Variables: ${Object.keys(results.cssVariables).length}`);
    console.log(`   ℹ️  Keyframe Animations: ${Object.keys(results.keyframeAnimations).length}`);
    console.log(`   ℹ️  Active Animations: ${results.activeAnimations.length}`);
    console.log(`   ℹ️  Scroll Animations: ${results.scrollAnimations.length}`);
    console.log(`   ℹ️  Parallax Elements: ${results.parallaxElements.length}`);
    console.log(`   ℹ️  Hover Interactions: ${results.hoverInteractions.length}`);
    console.log(`   ℹ️  Page Transitions: ${Object.keys(results.pageTransitions).length}`);
    console.log(`   ℹ️  CSS Animation Elements: ${results.cssAnimationElements.length}`);
    console.log(`   ℹ️  3D Transform Elements: ${results.transform3DElements.length}`);
    console.log(`   ℹ️  Transition Elements: ${results.transitionElements.length}`);

    return results;
}


// ═══════════════════════════════════════════════════════════════
//  1. CSS VARIABLES — Deep Framer Scan
// ═══════════════════════════════════════════════════════════════
async function extractCSSVariablesDeep(page) {
    return await page.evaluate(() => {
        const vars = {};

        // Method 1: All stylesheets (including Framer injected)
        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules) {
                    if (rule.style) {
                        for (let i = 0; i < rule.style.length; i++) {
                            const prop = rule.style[i];
                            if (prop.startsWith('--')) {
                                vars[prop] = rule.style.getPropertyValue(prop).trim();
                            }
                        }
                    }
                }
            } catch { /* CORS */ }
        }

        // Method 2: Computed styles on root-like elements
        const rootEls = [document.documentElement, document.body,
        ...document.querySelectorAll('[data-framer-hydrate-v2]'),
        ...document.querySelectorAll('[id="main"]'),
        ...document.querySelectorAll('[id="__framer-badge-container"]'),
        ];

        for (const el of rootEls) {
            const cs = window.getComputedStyle(el);
            for (let i = 0; i < cs.length; i++) {
                const prop = cs[i];
                if (prop.startsWith('--')) {
                    vars[prop] = cs.getPropertyValue(prop).trim();
                }
            }
        }

        // Method 3: Framer's inline <style> tags
        document.querySelectorAll('style').forEach(styleTag => {
            const text = styleTag.textContent || '';
            const regex = /(--[\w-]+)\s*:\s*([^;]+)/g;
            let m;
            while ((m = regex.exec(text)) !== null) {
                if (!vars[m[1]]) vars[m[1]] = m[2].trim();
            }
        });

        // Method 4: Framer's data attributes as pseudo-variables
        const framerVars = {};
        document.querySelectorAll('[data-framer-appear-id]').forEach(el => {
            framerVars[el.getAttribute('data-framer-appear-id')] = {
                name: el.getAttribute('data-framer-name') || '',
                component: el.getAttribute('data-framer-component-type') || '',
            };
        });

        return { ...vars, __framerAppearIds: framerVars };
    });
}


// ═══════════════════════════════════════════════════════════════
//  2. KEYFRAME ANIMATIONS — Web Animations API + CSS
// ═══════════════════════════════════════════════════════════════
async function extractKeyframeAnimations(page) {
    return await page.evaluate(() => {
        const keyframes = {};
        const activeAnims = [];

        // Method 1: CSSKeyframesRules from all stylesheets
        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules) {
                    if (rule.constructor.name === 'CSSKeyframesRule' || rule.type === 7) {
                        const frames = {};
                        for (const kf of rule.cssRules) {
                            const props = {};
                            for (let i = 0; i < kf.style.length; i++) {
                                const p = kf.style[i];
                                props[p] = kf.style.getPropertyValue(p);
                            }
                            frames[kf.keyText] = props;
                        }
                        keyframes[rule.name] = frames;
                    }
                }
            } catch { /* CORS */ }
        }

        // Method 2: Web Animations API — capture LIVE running animations
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
            try {
                const animations = el.getAnimations?.() || [];
                for (const anim of animations) {
                    const effect = anim.effect;
                    if (!effect) continue;

                    const kfData = {
                        element: {
                            tag: el.tagName.toLowerCase(),
                            id: el.id || null,
                            framerName: el.getAttribute('data-framer-name') || null,
                            className: (typeof el.className === 'string') ? el.className.substring(0, 100) : '',
                        },
                        name: anim.animationName || anim.id || 'unnamed',
                        playState: anim.playState,
                        duration: effect.getTiming?.()?.duration || 0,
                        delay: effect.getTiming?.()?.delay || 0,
                        iterations: effect.getTiming?.()?.iterations || 1,
                        direction: effect.getTiming?.()?.direction || 'normal',
                        easing: effect.getTiming?.()?.easing || 'linear',
                        fill: effect.getTiming?.()?.fill || 'none',
                        progress: anim.currentTime,
                    };

                    // Get computed keyframes
                    const computedKf = effect.getKeyframes?.() || [];
                    kfData.keyframes = computedKf.map(kf => {
                        const obj = {};
                        for (const [k, v] of Object.entries(kf)) {
                            if (k !== 'offset' && k !== 'computedOffset' && k !== 'easing' && k !== 'composite') {
                                obj[k] = v;
                            }
                        }
                        return { offset: kf.offset, easing: kf.easing, properties: obj };
                    });

                    activeAnims.push(kfData);

                    // Also store as named keyframe
                    if (kfData.name && kfData.name !== 'unnamed' && !keyframes[kfData.name]) {
                        const frames = {};
                        for (const kf of computedKf) {
                            const pct = (kf.offset * 100) + '%';
                            const props = {};
                            for (const [k, v] of Object.entries(kf)) {
                                if (k !== 'offset' && k !== 'computedOffset' && k !== 'easing' && k !== 'composite') {
                                    props[k] = v;
                                }
                            }
                            frames[pct] = props;
                        }
                        keyframes[kfData.name] = frames;
                    }
                }
            } catch { /* some elements may not support getAnimations */ }
        }

        return { keyframes, activeAnims };
    });
}


// ═══════════════════════════════════════════════════════════════
//  3. SCROLL ANIMATIONS — Differential Capture
// ═══════════════════════════════════════════════════════════════
async function extractScrollAnimations(page, config = {}) {
    const scrollSteps = config.scrollSteps || 10;

    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    const stepSize = Math.floor(pageHeight / scrollSteps);

    const trackedSelector = config.scrollTrackSelector ||
        '[data-framer-name], [data-framer-appear-id], section, [class*="framer-"], [style*="transform"], [style*="opacity"]';

    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(500);

    const snapshots = [];

    for (let step = 0; step <= scrollSteps; step++) {
        const scrollY = Math.min(step * stepSize, pageHeight - 1);

        await page.evaluate((y) => window.scrollTo(0, y), scrollY);
        await sleep(300);

        const snapshot = await page.evaluate((selector) => {
            const els = document.querySelectorAll(selector);
            const data = [];
            for (const el of els) {
                const rect = el.getBoundingClientRect();
                if (rect.bottom < -500 || rect.top > window.innerHeight + 500) continue;

                const cs = window.getComputedStyle(el);
                data.push({
                    id: el.id || el.getAttribute('data-framer-name') || el.getAttribute('data-framer-appear-id') || null,
                    tag: el.tagName.toLowerCase(),
                    framerName: el.getAttribute('data-framer-name') || null,
                    rect: { x: Math.round(rect.left), y: Math.round(rect.top), w: Math.round(rect.width), h: Math.round(rect.height) },
                    transform: cs.transform,
                    opacity: cs.opacity,
                    filter: cs.filter,
                    clipPath: cs.clipPath,
                    scale: cs.scale || null,
                    translate: cs.translate || null,
                    rotate: cs.rotate || null,
                    backgroundColor: cs.backgroundColor,
                    color: cs.color,
                    borderRadius: cs.borderRadius,
                    boxShadow: cs.boxShadow,
                    width: cs.width,
                    height: cs.height,
                    top: cs.top,
                    left: cs.left,
                    willChange: cs.willChange,
                });
            }
            return data;
        }, trackedSelector);

        snapshots.push({ scrollY, elements: snapshot });
    }

    const scrollAnimations = computeScrollDiffs(snapshots);

    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(300);

    return scrollAnimations;
}

function computeScrollDiffs(snapshots) {
    if (snapshots.length < 2) return [];

    const animatedElements = new Map();

    for (let i = 1; i < snapshots.length; i++) {
        const prev = snapshots[i - 1];
        const curr = snapshots[i];

        for (const currEl of curr.elements) {
            const key = currEl.id || currEl.framerName || `${currEl.tag}-${currEl.rect.x}-${currEl.rect.w}`;
            if (!key) continue;

            const prevEl = prev.elements.find(e =>
                (e.id && e.id === currEl.id) ||
                (e.framerName && e.framerName === currEl.framerName) ||
                (e.tag === currEl.tag && Math.abs(e.rect.x - currEl.rect.x) < 50 && Math.abs(e.rect.w - currEl.rect.w) < 20)
            );

            if (!prevEl) continue;

            const changes = {};
            const propsToCheck = ['transform', 'opacity', 'filter', 'clipPath', 'scale', 'translate',
                'rotate', 'backgroundColor', 'color', 'borderRadius', 'boxShadow', 'width', 'height'];

            for (const prop of propsToCheck) {
                if (prevEl[prop] !== currEl[prop] && currEl[prop] && currEl[prop] !== 'none') {
                    changes[prop] = { from: prevEl[prop], to: currEl[prop] };
                }
            }

            const dy = currEl.rect.y - prevEl.rect.y;
            const expectedDy = -(curr.scrollY - prev.scrollY);
            if (Math.abs(dy - expectedDy) > 5) {
                changes._positionDelta = { dy, expected: expectedDy, diff: dy - expectedDy };
            }

            if (Object.keys(changes).length > 0) {
                if (!animatedElements.has(key)) {
                    animatedElements.set(key, {
                        id: currEl.id,
                        tag: currEl.tag,
                        framerName: currEl.framerName,
                        changes: [],
                    });
                }
                animatedElements.get(key).changes.push({
                    scrollFrom: prev.scrollY,
                    scrollTo: curr.scrollY,
                    ...changes,
                });
            }
        }
    }

    return Array.from(animatedElements.values()).map(el => {
        const types = new Set();
        for (const change of el.changes) {
            if (change.opacity) types.add('fade');
            if (change.transform) types.add('transform');
            if (change._positionDelta) types.add('parallax');
            if (change.scale) types.add('scale');
            if (change.clipPath) types.add('reveal');
            if (change.filter) types.add('filter');
            if (change.backgroundColor || change.color) types.add('colorShift');
            if (change.borderRadius) types.add('morph');
        }

        return {
            ...el,
            animationTypes: [...types],
            scrollRange: {
                start: el.changes[0]?.scrollFrom || 0,
                end: el.changes[el.changes.length - 1]?.scrollTo || 0,
            },
        };
    });
}


// ═══════════════════════════════════════════════════════════════
//  4. PARALLAX — Transform Delta Per Scroll Step
// ═══════════════════════════════════════════════════════════════
async function extractParallax(page, config = {}) {
    const steps = 5;
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    const stepSize = Math.floor(pageHeight / (steps + 2));

    const positions = [];

    for (let step = 0; step <= steps; step++) {
        const scrollY = step * stepSize;
        await page.evaluate((y) => window.scrollTo(0, y), scrollY);
        await sleep(400);

        const data = await page.evaluate(() => {
            const results = [];
            const els = document.querySelectorAll('[style*="transform"], [data-framer-name], [class*="framer-"]');
            for (const el of els) {
                const cs = window.getComputedStyle(el);
                const t = cs.transform;
                if (!t || t === 'none') continue;

                const rect = el.getBoundingClientRect();
                results.push({
                    id: el.id || el.getAttribute('data-framer-name') || null,
                    tag: el.tagName.toLowerCase(),
                    framerName: el.getAttribute('data-framer-name') || null,
                    transform: t,
                    rect: { y: rect.top + window.scrollY },
                    viewportY: rect.top,
                });
            }
            return results;
        });

        positions.push({ scrollY, elements: data });
    }

    const parallaxMap = new Map();

    for (let i = 1; i < positions.length; i++) {
        const prev = positions[i - 1];
        const curr = positions[i];
        const scrollDelta = curr.scrollY - prev.scrollY;

        for (const currEl of curr.elements) {
            const key = currEl.id || currEl.framerName;
            if (!key) continue;

            const prevEl = prev.elements.find(e =>
                (e.id && e.id === currEl.id) || (e.framerName && e.framerName === currEl.framerName)
            );
            if (!prevEl) continue;

            const currTY = parseTranslateY(currEl.transform);
            const prevTY = parseTranslateY(prevEl.transform);

            if (currTY !== null && prevTY !== null) {
                const transformDelta = currTY - prevTY;
                const ratio = transformDelta / scrollDelta;

                if (Math.abs(ratio) > 0.01 && Math.abs(ratio) !== 1) {
                    if (!parallaxMap.has(key)) {
                        parallaxMap.set(key, {
                            id: currEl.id,
                            framerName: currEl.framerName,
                            tag: currEl.tag,
                            ratios: [],
                        });
                    }
                    parallaxMap.get(key).ratios.push(ratio);
                }
            }
        }
    }

    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(300);

    return Array.from(parallaxMap.values()).map(el => ({
        ...el,
        speed: average(el.ratios),
        direction: average(el.ratios) > 0 ? 'same' : 'opposite',
    }));
}

function parseTranslateY(transform) {
    if (!transform || transform === 'none') return null;
    const match = transform.match(/matrix\(([^)]+)\)/);
    if (match) {
        const vals = match[1].split(',').map(v => parseFloat(v.trim()));
        return vals.length >= 6 ? vals[5] : null;
    }
    const m3d = transform.match(/matrix3d\(([^)]+)\)/);
    if (m3d) {
        const vals = m3d[1].split(',').map(v => parseFloat(v.trim()));
        return vals.length >= 14 ? vals[13] : null;
    }
    return null;
}

function average(arr) {
    return arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
}


// ═══════════════════════════════════════════════════════════════
//  5. HOVER/CLICK INTERACTIONS
// ═══════════════════════════════════════════════════════════════
async function extractHoverInteractions(page, config = {}) {
    const maxElements = config.maxHoverElements || 50;

    const interactiveEls = await page.evaluate((max) => {
        const selectors = 'a, button, [role="button"], [data-framer-name], [class*="hover"], [class*="interactive"], [class*="cta"], [class*="btn"], input[type="submit"], nav a, .framer-text a';
        const els = document.querySelectorAll(selectors);
        const results = [];

        for (const el of els) {
            if (results.length >= max) break;
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;
            if (rect.top > document.documentElement.scrollHeight) continue;

            const cs = window.getComputedStyle(el);
            results.push({
                index: results.length,
                id: el.id || null,
                tag: el.tagName.toLowerCase(),
                framerName: el.getAttribute('data-framer-name') || null,
                text: el.textContent?.trim()?.substring(0, 50) || '',
                rect: { x: Math.round(rect.left + window.scrollX), y: Math.round(rect.top + window.scrollY), w: Math.round(rect.width), h: Math.round(rect.height) },
                cursor: cs.cursor,
                beforeState: {
                    transform: cs.transform,
                    opacity: cs.opacity,
                    backgroundColor: cs.backgroundColor,
                    color: cs.color,
                    boxShadow: cs.boxShadow,
                    borderColor: cs.borderColor,
                    borderRadius: cs.borderRadius,
                    scale: cs.scale || null,
                    filter: cs.filter,
                    textDecoration: cs.textDecoration,
                    width: cs.width,
                    height: cs.height,
                    transition: cs.transition,
                    transitionProperty: cs.transitionProperty,
                    transitionDuration: cs.transitionDuration,
                    transitionTimingFunction: cs.transitionTimingFunction,
                },
            });
        }
        return results;
    }, maxElements);

    if (interactiveEls.length === 0) return [];

    const interactions = [];
    await page.evaluate(() => window.scrollTo(0, 0));

    for (const el of interactiveEls) {
        try {
            if (el.rect.y > 800) {
                await page.evaluate((y) => window.scrollTo(0, Math.max(0, y - 300)), el.rect.y);
                await sleep(200);
            }

            const viewportRect = await page.evaluate((elData) => {
                const selector = elData.id ? `#${CSS.escape(elData.id)}` :
                    elData.framerName ? `[data-framer-name="${elData.framerName}"]` :
                        null;
                if (!selector) return null;
                const el = document.querySelector(selector);
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
            }, el);

            if (!viewportRect) continue;

            await page.mouse.move(viewportRect.x, viewportRect.y);
            await sleep(500);

            const afterState = await page.evaluate((elData) => {
                const selector = elData.id ? `#${CSS.escape(elData.id)}` :
                    elData.framerName ? `[data-framer-name="${elData.framerName}"]` :
                        null;
                if (!selector) return null;
                const el = document.querySelector(selector);
                if (!el) return null;

                const cs = window.getComputedStyle(el);
                return {
                    transform: cs.transform,
                    opacity: cs.opacity,
                    backgroundColor: cs.backgroundColor,
                    color: cs.color,
                    boxShadow: cs.boxShadow,
                    borderColor: cs.borderColor,
                    borderRadius: cs.borderRadius,
                    scale: cs.scale || null,
                    filter: cs.filter,
                    textDecoration: cs.textDecoration,
                    width: cs.width,
                    height: cs.height,
                };
            }, el);

            if (!afterState) continue;

            await page.mouse.move(0, 0);
            await sleep(200);

            const hoverChanges = {};
            const before = el.beforeState;
            const propsToCheck = ['transform', 'opacity', 'backgroundColor', 'color', 'boxShadow',
                'borderColor', 'borderRadius', 'scale', 'filter', 'textDecoration', 'width', 'height'];

            for (const prop of propsToCheck) {
                if (before[prop] !== afterState[prop]) {
                    hoverChanges[prop] = { from: before[prop], to: afterState[prop] };
                }
            }

            if (Object.keys(hoverChanges).length > 0) {
                interactions.push({
                    id: el.id,
                    tag: el.tag,
                    framerName: el.framerName,
                    text: el.text,
                    cursor: el.cursor,
                    transition: {
                        property: before.transitionProperty,
                        duration: before.transitionDuration,
                        timing: before.transitionTimingFunction,
                    },
                    hoverChanges,
                });
            }
        } catch { /* element may have moved/disappeared */ }
    }

    await page.evaluate(() => window.scrollTo(0, 0));
    return interactions;
}


// ═══════════════════════════════════════════════════════════════
//  6. PAGE TRANSITIONS + FRAMER CONFIG
// ═══════════════════════════════════════════════════════════════
async function extractPageTransitions(page) {
    return await page.evaluate(() => {
        const transitions = {};

        const presenceEls = document.querySelectorAll('[data-framer-appear-id]');
        const presenceIds = [];
        presenceEls.forEach(el => {
            presenceIds.push({
                id: el.getAttribute('data-framer-appear-id'),
                name: el.getAttribute('data-framer-name') || '',
                tag: el.tagName.toLowerCase(),
            });
        });
        transitions.animatePresence = presenceIds;

        const layoutEls = document.querySelectorAll('[data-framer-portal-id], [data-framer-page-optimized]');
        transitions.layoutIds = Array.from(layoutEls).map(el => ({
            portalId: el.getAttribute('data-framer-portal-id'),
            optimized: el.getAttribute('data-framer-page-optimized'),
        }));

        const navLinks = document.querySelectorAll('a[data-framer-page-link-current], a[href^="/"]');
        transitions.routes = Array.from(navLinks).map(a => ({
            href: a.getAttribute('href'),
            current: a.hasAttribute('data-framer-page-link-current'),
            text: a.textContent?.trim()?.substring(0, 50),
        }));

        const scripts = document.querySelectorAll('script');
        let motionConfig = null;
        for (const script of scripts) {
            const text = script.textContent || '';
            if (text.includes('transition') && text.includes('framer')) {
                const transMatch = text.match(/transition\s*:\s*\{([^}]+)\}/);
                if (transMatch) {
                    motionConfig = transMatch[1].trim();
                }
            }
        }
        if (motionConfig) transitions.motionConfig = motionConfig;

        return transitions;
    });
}

async function extractFramerConfig(page) {
    return await page.evaluate(() => {
        const config = {};

        // Extract the highest-value config data
        if (typeof window !== 'undefined' && window.__framer_importMap) {
            // Can be massive, so we clone it safely to avoid serialization issues
            try {
                config.importMap = JSON.parse(JSON.stringify(window.__framer_importMap));
            } catch (e) { /* ignore circular ref errors */ }
        }

        const framerMeta = document.querySelector('meta[name="generator"]');
        if (framerMeta) config.generator = framerMeta.content;

        config.hasHydration = !!document.querySelector('[data-framer-hydrate-v2]');

        const componentTypes = new Set();
        document.querySelectorAll('[data-framer-component-type]').forEach(el => {
            componentTypes.add(el.getAttribute('data-framer-component-type'));
        });
        config.componentTypes = [...componentTypes];

        const cursors = new Set();
        document.querySelectorAll('[data-framer-cursor]').forEach(el => {
            cursors.add(el.getAttribute('data-framer-cursor'));
        });
        config.customCursors = [...cursors];

        const framerAttrs = new Set();
        document.querySelectorAll('*').forEach(el => {
            for (const attr of el.attributes) {
                if (attr.name.startsWith('data-framer')) {
                    framerAttrs.add(attr.name);
                }
            }
        });
        config.allFramerAttributes = [...framerAttrs];

        const richText = document.querySelectorAll('[data-framer-component-type="RichTextContainer"]');
        config.richTextBlocks = richText.length;

        const scrollEls = document.querySelectorAll('[data-framer-appear-id]');
        config.scrollTriggerElements = scrollEls.length;

        return config;
    });
}

// ═══════════════════════════════════════════════════════════════
//  7. CSS ANIMATION PROPERTIES
// ═══════════════════════════════════════════════════════════════
async function extractCSSAnimationProperties(page) {
    return await page.evaluate(() => {
        const results = [];
        const allEls = document.querySelectorAll('*');
        for (const el of allEls) {
            try {
                const cs = window.getComputedStyle(el);
                const animName = cs.animationName;
                if (!animName || animName === 'none') continue;
                const names = animName.split(',').map(s => s.trim());
                const durations = (cs.animationDuration || '0s').split(',').map(s => s.trim());
                const delays = (cs.animationDelay || '0s').split(',').map(s => s.trim());
                const iterations = (cs.animationIterationCount || '1').split(',').map(s => s.trim());
                const directions = (cs.animationDirection || 'normal').split(',').map(s => s.trim());
                const timings = (cs.animationTimingFunction || 'ease').split(',').map(s => s.trim());
                const fillModes = (cs.animationFillMode || 'none').split(',').map(s => s.trim());
                const playStates = (cs.animationPlayState || 'running').split(',').map(s => s.trim());
                const rect = el.getBoundingClientRect();
                for (let i = 0; i < names.length; i++) {
                    if (names[i] === 'none') continue;
                    results.push({
                        element: {
                            tag: el.tagName.toLowerCase(),
                            id: el.id || null,
                            framerName: el.getAttribute('data-framer-name') || null,
                            className: (typeof el.className === 'string') ? el.className.substring(0, 100) : '',
                            rect: { x: Math.round(rect.left), y: Math.round(rect.top + window.scrollY), w: Math.round(rect.width), h: Math.round(rect.height) },
                        },
                        animationName: names[i],
                        duration: durations[i] || durations[0] || '0s',
                        delay: delays[i] || delays[0] || '0s',
                        iterationCount: iterations[i] || iterations[0] || '1',
                        direction: directions[i] || directions[0] || 'normal',
                        timingFunction: timings[i] || timings[0] || 'ease',
                        fillMode: fillModes[i] || fillModes[0] || 'none',
                        playState: playStates[i] || playStates[0] || 'running',
                        isInfinite: (iterations[i] || iterations[0]) === 'infinite',
                        isMarquee: false,
                    });
                }
            } catch { /* skip */ }
        }
        // Post-process: detect marquee patterns
        for (const anim of results) {
            if (!anim.isInfinite) continue;
            for (const sheet of document.styleSheets) {
                try {
                    for (const rule of sheet.cssRules) {
                        if ((rule.constructor.name === 'CSSKeyframesRule' || rule.type === 7) && rule.name === anim.animationName) {
                            let hasTranslateX = false;
                            for (const kf of rule.cssRules) {
                                const transform = kf.style.getPropertyValue('transform');
                                if (transform && (transform.includes('translateX') || transform.includes('translate3d'))) {
                                    hasTranslateX = true;
                                    break;
                                }
                            }
                            anim.isMarquee = hasTranslateX;
                        }
                    }
                } catch { /* CORS */ }
            }
        }
        return results;
    });
}


// ═══════════════════════════════════════════════════════════════
//  8. 3D TRANSFORMS
// ═══════════════════════════════════════════════════════════════
async function extract3DTransforms(page) {
    return await page.evaluate(() => {
        const results = [];
        const allEls = document.querySelectorAll('*');
        for (const el of allEls) {
            try {
                const cs = window.getComputedStyle(el);
                const transform = cs.transform;
                const perspective = cs.perspective;
                const transformStyle = cs.transformStyle;
                const backfaceVisibility = cs.backfaceVisibility;
                const transformOrigin = cs.transformOrigin;
                const is3D =
                    (perspective && perspective !== 'none') ||
                    (transformStyle === 'preserve-3d') ||
                    (backfaceVisibility === 'hidden') ||
                    (transform && transform.includes('matrix3d'));
                if (!is3D) continue;
                const rect = el.getBoundingClientRect();
                if (rect.width === 0 && rect.height === 0) continue;
                let rotateX = 0, rotateY = 0, rotateZ = 0;
                let translateZ = 0;
                if (transform && transform.includes('matrix3d')) {
                    const m3d = transform.match(/matrix3d\(([^)]+)\)/);
                    if (m3d) {
                        const v = m3d[1].split(',').map(s => parseFloat(s.trim()));
                        if (v.length >= 16) {
                            rotateX = Math.round(Math.atan2(v[6], v[10]) * (180 / Math.PI) * 100) / 100;
                            rotateY = Math.round(Math.atan2(-v[2], Math.sqrt(v[6] * v[6] + v[10] * v[10])) * (180 / Math.PI) * 100) / 100;
                            rotateZ = Math.round(Math.atan2(v[1], v[0]) * (180 / Math.PI) * 100) / 100;
                            translateZ = v[14] || 0;
                        }
                    }
                }
                let parentPerspective = null;
                let parent = el.parentElement;
                while (parent) {
                    const pcs = window.getComputedStyle(parent);
                    if (pcs.perspective && pcs.perspective !== 'none') {
                        parentPerspective = pcs.perspective;
                        break;
                    }
                    parent = parent.parentElement;
                }
                results.push({
                    element: {
                        tag: el.tagName.toLowerCase(),
                        id: el.id || null,
                        framerName: el.getAttribute('data-framer-name') || null,
                        className: (typeof el.className === 'string') ? el.className.substring(0, 100) : '',
                        rect: { x: Math.round(rect.left), y: Math.round(rect.top + window.scrollY), w: Math.round(rect.width), h: Math.round(rect.height) },
                    },
                    transform: transform !== 'none' ? transform : null,
                    perspective: perspective !== 'none' ? perspective : null,
                    parentPerspective,
                    transformStyle,
                    backfaceVisibility,
                    transformOrigin,
                    rotation: { x: rotateX, y: rotateY, z: rotateZ },
                    translateZ,
                    isTiltCard: !!(parentPerspective || (perspective && perspective !== 'none')) && (Math.abs(rotateX) > 0 || Math.abs(rotateY) > 0),
                    has3DMatrix: transform ? transform.includes('matrix3d') : false,
                    hasPreserve3D: transformStyle === 'preserve-3d',
                });
            } catch { /* skip */ }
        }
        return results;
    });
}


// ═══════════════════════════════════════════════════════════════
//  9. TRANSITION PROPERTIES
// ═══════════════════════════════════════════════════════════════
async function extractTransitionProperties(page) {
    return await page.evaluate(() => {
        const results = [];
        const allEls = document.querySelectorAll('*');
        for (const el of allEls) {
            try {
                const cs = window.getComputedStyle(el);
                const transProperty = cs.transitionProperty;
                const transDuration = cs.transitionDuration;
                const transTiming = cs.transitionTimingFunction;
                const transDelay = cs.transitionDelay;
                if (!transProperty || transProperty === 'none') continue;
                if (!transDuration || transDuration === '0s') continue;
                const properties = transProperty.split(',').map(s => s.trim());
                const durations = transDuration.split(',').map(s => s.trim());
                const timings = transTiming.split(',').map(s => s.trim());
                const delays = transDelay.split(',').map(s => s.trim());
                const validTransitions = [];
                for (let i = 0; i < properties.length; i++) {
                    const dur = durations[i] || durations[0] || '0s';
                    if (dur === '0s') continue;
                    validTransitions.push({
                        property: properties[i],
                        duration: dur,
                        timingFunction: timings[i] || timings[0] || 'ease',
                        delay: delays[i] || delays[0] || '0s',
                    });
                }
                if (validTransitions.length === 0) continue;
                const rect = el.getBoundingClientRect();
                const cursor = cs.cursor;
                results.push({
                    element: {
                        tag: el.tagName.toLowerCase(),
                        id: el.id || null,
                        framerName: el.getAttribute('data-framer-name') || null,
                        className: (typeof el.className === 'string') ? el.className.substring(0, 100) : '',
                        text: (el.textContent || '').trim().substring(0, 50),
                        rect: { x: Math.round(rect.left), y: Math.round(rect.top + window.scrollY), w: Math.round(rect.width), h: Math.round(rect.height) },
                    },
                    transitions: validTransitions,
                    cursor,
                    isInteractive: cursor === 'pointer' || el.tagName === 'A' || el.tagName === 'BUTTON' || el.getAttribute('role') === 'button',
                });
            } catch { /* skip */ }
        }
        return results;
    });
}
