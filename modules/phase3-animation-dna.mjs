/**
 * Phase 3: Animation DNA — Keyframes, Transitions, Scroll Animations, Framer/GSAP extraction
 */

export async function analyzeAnimationDNA(page, cdp) {
    // Enable CDP Animation Domain
    await cdp.send('Animation.enable');

    const cdpAnimations = [];
    cdp.on('Animation.animationStarted', (evt) => {
        cdpAnimations.push({
            id: evt.animation.id,
            name: evt.animation.name || '',
            type: evt.animation.type,
            duration: evt.animation.source?.duration,
            delay: evt.animation.source?.delay,
            easing: evt.animation.source?.easing,
            keyframesRule: evt.animation.source?.keyframesRule,
        });
    });

    // Trigger scroll to activate scroll-triggered animations
    const totalHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const scrollStep = 200;
    for (let y = 0; y <= totalHeight; y += scrollStep) {
        await page.evaluate((sy) => window.scrollTo(0, sy), y);
        await new Promise(r => setTimeout(r, 50));
    }
    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 500));

    // Extract all animation data from the page
    const pageData = await page.evaluate(() => {
        const result = {
            keyframes: [],
            transitions: [],
            animationProperties: [],
            activeAnimations: [],
            easings: new Set(),
            framerComponents: [],
            gsapTriggers: [],
            mutationTargets: [],
        };

        // ── CSS @keyframes ──
        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules || []) {
                    if (rule.type === CSSRule.KEYFRAMES_RULE) {
                        const frames = [];
                        for (const kf of rule.cssRules || []) {
                            frames.push({ offset: kf.keyText, styles: kf.style.cssText });
                        }
                        result.keyframes.push({ name: rule.name, frames });
                    }
                    if (rule.style) {
                        // Transitions
                        if (rule.style.transition && rule.style.transition !== 'none' && rule.style.transition !== '') {
                            result.transitions.push({
                                selector: rule.selectorText?.substring(0, 200),
                                transition: rule.style.transition,
                            });
                            // Extract easing
                            const easingMatch = rule.style.transitionTimingFunction;
                            if (easingMatch) result.easings.add(easingMatch);
                        }
                        // Animation properties
                        if (rule.style.animation && rule.style.animation !== 'none' && rule.style.animation !== '') {
                            result.animationProperties.push({
                                selector: rule.selectorText?.substring(0, 200),
                                animation: rule.style.animation,
                                name: rule.style.animationName,
                                duration: rule.style.animationDuration,
                                timing: rule.style.animationTimingFunction,
                                delay: rule.style.animationDelay,
                                iterations: rule.style.animationIterationCount,
                                fill: rule.style.animationFillMode,
                            });
                            if (rule.style.animationTimingFunction) {
                                result.easings.add(rule.style.animationTimingFunction);
                            }
                        }
                    }
                }
            } catch (e) { /* cross-origin */ }
        }

        // ── Active Web Animations API ──
        document.getAnimations().forEach(anim => {
            try {
                const timing = anim.effect?.getTiming?.() || {};
                result.activeAnimations.push({
                    name: anim.animationName || anim.id || '',
                    playState: anim.playState,
                    currentTime: anim.currentTime,
                    duration: timing.duration,
                    delay: timing.delay,
                    easing: timing.easing,
                    iterations: timing.iterations,
                    fill: timing.fill,
                    direction: timing.direction,
                    target: (() => {
                        const t = anim.effect?.target;
                        return t ? (t.getAttribute?.('data-framer-name') || t.tagName + '.' + (t.className?.toString()?.substring(0, 40) || '')) : null;
                    })(),
                    keyframes: (() => {
                        try { return anim.effect?.getKeyframes?.()?.slice(0, 10) || []; }
                        catch (e) { return []; }
                    })(),
                });
            } catch (e) { }
        });

        // ── Framer Motion ──
        document.querySelectorAll('[data-framer-name]').forEach(el => {
            const cs = getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            result.framerComponents.push({
                name: el.getAttribute('data-framer-name'),
                rect: { x: Math.round(rect.x), y: Math.round(rect.y + window.scrollY), w: Math.round(rect.width), h: Math.round(rect.height) },
                transform: cs.transform !== 'none' ? cs.transform : null,
                opacity: cs.opacity,
                willChange: cs.willChange !== 'auto' ? cs.willChange : null,
                perspective: cs.perspective !== 'none' ? cs.perspective : null,
            });
        });

        // ── GSAP ScrollTrigger ──
        if (window.gsap && window.ScrollTrigger) {
            try {
                window.ScrollTrigger.getAll().forEach(st => {
                    result.gsapTriggers.push({
                        trigger: st.trigger?.tagName + '.' + (st.trigger?.className?.toString()?.substring(0, 50) || ''),
                        start: st.start,
                        end: st.end,
                        pin: !!st.pin,
                        scrub: st.vars?.scrub,
                    });
                });
            } catch (e) { }
        }

        // ── Find all transform/opacity animated elements ──
        document.querySelectorAll('[style*="transform"], [style*="opacity"], [style*="clip"]').forEach(el => {
            const cs = getComputedStyle(el);
            if (cs.transform === 'none' && cs.opacity === '1') return;
            const name = el.getAttribute('data-framer-name') || el.id || el.tagName;
            result.mutationTargets.push({
                name: name.substring(0, 60),
                transform: cs.transform !== 'none' ? cs.transform : null,
                opacity: parseFloat(cs.opacity),
                clipPath: cs.clipPath !== 'none' ? cs.clipPath : null,
            });
        });

        result.easings = [...result.easings];
        return result;
    });

    return {
        keyframes: pageData.keyframes,
        transitions: pageData.transitions,
        animationProperties: pageData.animationProperties,
        activeAnimations: pageData.activeAnimations,
        easings: pageData.easings,
        framerComponents: pageData.framerComponents,
        gsapTriggers: pageData.gsapTriggers,
        mutationTargets: pageData.mutationTargets,
        cdpAnimations: cdpAnimations.slice(0, 100),
    };
}
