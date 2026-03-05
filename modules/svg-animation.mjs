/**
 * v5.0 Module: SVG Animation Analyzer
 *
 * Extracts:
 *  - SMIL animations (<animate>, <animateTransform>, <animateMotion>)
 *  - CSS-driven SVG animations (keyframes on SVG elements)
 *  - SVG path morphing (d attribute changes)
 *  - SVG filters chain (<feGaussianBlur>, <feDisplacementMap>, etc.)
 *  - Inline SVG vs external SVG file mapping
 *  - SVG sprite/symbol usage patterns
 *  - SVG viewBox and coordinate systems
 */

export async function analyzeSVGAnimations(page) {
    return page.evaluate(() => {
        const result = {
            inlineSVGs: [],
            externalSVGs: [],
            smilAnimations: [],
            cssAnimatedSVGs: [],
            pathMorphTargets: [],
            filters: [],
            sprites: [],
            symbols: [],
            clipPaths: [],
            masks: [],
            gradients: [],
            totalSVGCount: 0,
        };

        // ═══ 1. Inline SVGs ═══
        document.querySelectorAll('svg').forEach(svg => {
            const rect = svg.getBoundingClientRect();
            if (rect.width < 1 && rect.height < 1) return;

            const svgData = {
                viewBox: svg.getAttribute('viewBox') || null,
                size: { width: Math.round(rect.width), height: Math.round(rect.height) },
                position: { x: Math.round(rect.x), y: Math.round(rect.y + window.scrollY) },
                elementCount: svg.querySelectorAll('*').length,
                paths: svg.querySelectorAll('path').length,
                circles: svg.querySelectorAll('circle').length,
                rects: svg.querySelectorAll('rect').length,
                lines: svg.querySelectorAll('line, polyline, polygon').length,
                texts: svg.querySelectorAll('text').length,
                groups: svg.querySelectorAll('g').length,
                uses: svg.querySelectorAll('use').length,
                hasAnimations: false,
                animations: [],
                id: svg.id || null,
                className: svg.getAttribute('class')?.substring(0, 60) || null,
                role: svg.getAttribute('role') || null,
                ariaLabel: svg.getAttribute('aria-label') || null,
            };

            // Check for SMIL animations inside this SVG
            const smilElements = svg.querySelectorAll('animate, animateTransform, animateMotion, set');
            smilElements.forEach(anim => {
                svgData.hasAnimations = true;
                const animData = {
                    type: anim.tagName.toLowerCase(),
                    attributeName: anim.getAttribute('attributeName') || null,
                    from: anim.getAttribute('from')?.substring(0, 100) || null,
                    to: anim.getAttribute('to')?.substring(0, 100) || null,
                    values: anim.getAttribute('values')?.substring(0, 200) || null,
                    dur: anim.getAttribute('dur') || null,
                    repeatCount: anim.getAttribute('repeatCount') || null,
                    begin: anim.getAttribute('begin')?.substring(0, 50) || null,
                    fill: anim.getAttribute('fill') || null,
                    keyTimes: anim.getAttribute('keyTimes')?.substring(0, 100) || null,
                    keySplines: anim.getAttribute('keySplines')?.substring(0, 200) || null,
                    calcMode: anim.getAttribute('calcMode') || null,
                    additive: anim.getAttribute('additive') || null,
                };

                // animateTransform specific
                if (anim.tagName === 'animateTransform') {
                    animData.transformType = anim.getAttribute('type') || null;
                }

                // animateMotion specific
                if (anim.tagName === 'animateMotion') {
                    animData.path = anim.getAttribute('path')?.substring(0, 200) || null;
                    animData.rotate = anim.getAttribute('rotate') || null;
                    const mpath = anim.querySelector('mpath');
                    if (mpath) animData.mpath = mpath.getAttribute('xlink:href') || mpath.getAttribute('href');
                }

                svgData.animations.push(animData);
                result.smilAnimations.push(animData);
            });

            // Check for CSS animations on SVG elements
            const cs = getComputedStyle(svg);
            if (cs.animation && cs.animation !== 'none') {
                svgData.cssAnimation = cs.animation;
                svgData.hasAnimations = true;
            }
            if (cs.transition && cs.transition !== 'none' && cs.transition !== 'all 0s ease 0s') {
                svgData.cssTransition = cs.transition;
            }

            // Check nested elements for CSS animations
            svg.querySelectorAll('path, circle, rect, g, line, ellipse').forEach(el => {
                const elCs = getComputedStyle(el);
                if (elCs.animation && elCs.animation !== 'none') {
                    result.cssAnimatedSVGs.push({
                        svgId: svg.id || null,
                        element: el.tagName,
                        id: el.id || null,
                        className: el.getAttribute('class')?.substring(0, 40) || null,
                        animation: elCs.animation,
                    });
                    svgData.hasAnimations = true;
                }
                if (elCs.transform !== 'none') {
                    result.cssAnimatedSVGs.push({
                        svgId: svg.id || null,
                        element: el.tagName,
                        transform: elCs.transform,
                    });
                }
            });

            // Check paths for morphing candidates
            svg.querySelectorAll('path').forEach(p => {
                const d = p.getAttribute('d');
                if (!d) return;
                const id = p.id || p.getAttribute('class');
                if (id) {
                    result.pathMorphTargets.push({
                        svgId: svg.id || null,
                        pathId: id?.substring(0, 40) || null,
                        dLength: d.length,
                        dPreview: d.substring(0, 100),
                        hasStrokeDasharray: getComputedStyle(p).strokeDasharray !== 'none',
                        strokeDashoffset: getComputedStyle(p).strokeDashoffset,
                    });
                }
            });

            result.inlineSVGs.push(svgData);
        });

        // ═══ 2. External SVGs (img[src=*.svg], object, embed, iframe) ═══
        document.querySelectorAll('img[src$=".svg"], img[src*=".svg?"], object[data$=".svg"], embed[src$=".svg"]').forEach(el => {
            const rect = el.getBoundingClientRect();
            result.externalSVGs.push({
                tag: el.tagName.toLowerCase(),
                src: el.src || el.getAttribute('data') || null,
                size: { width: Math.round(rect.width), height: Math.round(rect.height) },
                alt: el.alt || null,
            });
        });

        // ═══ 3. SVG Filters ═══
        document.querySelectorAll('svg filter, svg defs filter').forEach(filter => {
            const primitives = [];
            filter.querySelectorAll('*').forEach(child => {
                if (child.tagName.startsWith('fe')) {
                    const attrs = {};
                    Array.from(child.attributes).forEach(a => {
                        attrs[a.name] = a.value.substring(0, 50);
                    });
                    primitives.push({
                        type: child.tagName,
                        attributes: attrs,
                    });
                }
            });
            result.filters.push({
                id: filter.id || null,
                primitives,
            });
        });

        // ═══ 4. SVG Sprites & Symbols ═══
        document.querySelectorAll('svg symbol').forEach(symbol => {
            result.symbols.push({
                id: symbol.id || null,
                viewBox: symbol.getAttribute('viewBox') || null,
                childCount: symbol.children.length,
            });
        });

        // <use> references
        document.querySelectorAll('use').forEach(use => {
            const href = use.getAttribute('xlink:href') || use.getAttribute('href');
            if (href) {
                result.sprites.push({
                    href,
                    external: href.includes('.svg'),
                });
            }
        });

        // ═══ 5. SVG Clip Paths & Masks ═══
        document.querySelectorAll('clipPath').forEach(cp => {
            result.clipPaths.push({
                id: cp.id || null,
                childCount: cp.children.length,
                childTypes: Array.from(cp.children).map(c => c.tagName),
            });
        });

        document.querySelectorAll('mask').forEach(m => {
            result.masks.push({
                id: m.id || null,
                childCount: m.children.length,
            });
        });

        // ═══ 6. SVG Gradients ═══
        document.querySelectorAll('linearGradient, radialGradient').forEach(grad => {
            const stops = [];
            grad.querySArrays?.forEach?.(s => { }) // querySelectorAll fallback
            grad.querySelectorAll('stop').forEach(s => {
                stops.push({
                    offset: s.getAttribute('offset'),
                    color: s.getAttribute('stop-color') || getComputedStyle(s).stopColor,
                    opacity: s.getAttribute('stop-opacity'),
                });
            });
            result.gradients.push({
                type: grad.tagName,
                id: grad.id || null,
                stops,
            });
        });

        result.totalSVGCount = result.inlineSVGs.length + result.externalSVGs.length;

        return result;
    });
}
