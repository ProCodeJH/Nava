/**
 * Upgrade 7: Scroll Timeline — Element state recording per scroll position
 */

export async function captureScrollTimeline(page) {
    const totalHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const viewportHeight = 1080;
    const step = Math.max(200, Math.round(totalHeight / 50)); // ~50 checkpoints

    const timeline = [];

    // Select key elements to track
    const trackingSelectors = await page.evaluate(() => {
        const selectors = [];
        // Track elements with transforms, opacity changes, or animations
        document.querySelectorAll('[data-framer-name], [data-aos], [data-scroll], section, header, .reveal, [class*="animate"]').forEach(el => {
            const id = el.id || el.getAttribute('data-framer-name') || el.className?.toString()?.split(' ')[0];
            if (id) {
                const selector = el.id ? `#${el.id}` :
                    el.getAttribute('data-framer-name') ? `[data-framer-name="${el.getAttribute('data-framer-name')}"]` :
                        null;
                if (selector) selectors.push(selector);
            }
        });
        return [...new Set(selectors)].slice(0, 30);
    });

    // Scroll through page and record states
    for (let y = 0; y <= totalHeight; y += step) {
        await page.evaluate((sy) => window.scrollTo({ top: sy, behavior: 'instant' }), y);
        await new Promise(r => setTimeout(r, 100));

        const states = await page.evaluate((selectors) => {
            const scrollY = window.scrollY;
            const viewportH = window.innerHeight;
            const entries = [];

            selectors.forEach(sel => {
                try {
                    const el = document.querySelector(sel);
                    if (!el) return;

                    const rect = el.getBoundingClientRect();
                    const cs = getComputedStyle(el);

                    // Only track if visible or near-visible
                    if (rect.bottom < -200 || rect.top > viewportH + 200) return;

                    entries.push({
                        selector: sel.substring(0, 60),
                        inViewport: rect.top < viewportH && rect.bottom > 0,
                        viewportY: Math.round(rect.top),
                        opacity: parseFloat(cs.opacity),
                        transform: cs.transform !== 'none' ? cs.transform : null,
                        clipPath: cs.clipPath !== 'none' ? cs.clipPath : null,
                        filter: cs.filter !== 'none' ? cs.filter : null,
                        scale: cs.scale !== 'none' && cs.scale !== '1' ? cs.scale : null,
                        translate: cs.translate !== 'none' ? cs.translate : null,
                        width: Math.round(rect.width),
                        height: Math.round(rect.height),
                    });
                } catch (e) { }
            });

            return { scrollY, entries };
        }, trackingSelectors);

        if (states.entries.length > 0) {
            timeline.push({
                scrollPosition: y,
                scrollPercent: Math.round((y / totalHeight) * 100),
                elements: states.entries,
            });
        }
    }

    // Reset scroll
    await page.evaluate(() => window.scrollTo(0, 0));

    // Analyze animation curves for each element
    const animationCurves = analyzeTimeline(timeline);

    return {
        totalHeight,
        checkpoints: timeline.length,
        trackedElements: trackingSelectors.length,
        timeline,
        animationCurves,
    };
}

function analyzeTimeline(timeline) {
    const curves = {};

    timeline.forEach(checkpoint => {
        checkpoint.elements.forEach(el => {
            if (!curves[el.selector]) {
                curves[el.selector] = {
                    opacityKeyframes: [],
                    transformKeyframes: [],
                    visibilityEntryPoint: null,
                };
            }

            const curve = curves[el.selector];

            // Track opacity changes
            if (el.opacity !== undefined) {
                const last = curve.opacityKeyframes[curve.opacityKeyframes.length - 1];
                if (!last || last.value !== el.opacity) {
                    curve.opacityKeyframes.push({
                        scrollPercent: checkpoint.scrollPercent,
                        value: el.opacity,
                    });
                }
            }

            // Track transform changes
            if (el.transform) {
                const last = curve.transformKeyframes[curve.transformKeyframes.length - 1];
                if (!last || last.value !== el.transform) {
                    curve.transformKeyframes.push({
                        scrollPercent: checkpoint.scrollPercent,
                        value: el.transform,
                    });
                }
            }

            // Track visibility entry
            if (el.inViewport && !curve.visibilityEntryPoint) {
                curve.visibilityEntryPoint = checkpoint.scrollPercent;
            }
        });
    });

    // Filter out elements with no animation
    return Object.fromEntries(
        Object.entries(curves)
            .filter(([, c]) => c.opacityKeyframes.length > 1 || c.transformKeyframes.length > 1)
    );
}
