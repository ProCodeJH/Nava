/**
 * Phase 2: Layout & Spatial — Grid/Flex containers, section bounds, z-index stacks
 */

export async function analyzeLayout(page) {
    return page.evaluate(() => {
        const result = {
            sections: [],
            grids: [],
            flexboxes: [],
            stacks: [],       // z-index layers
            sticky: [],
            snap: [],
            parallax: [],
        };

        const allElements = document.querySelectorAll('*');

        allElements.forEach(el => {
            const cs = getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) return;

            const tag = el.tagName.toLowerCase();
            const name = el.getAttribute('data-framer-name') || el.id || el.className?.toString()?.substring(0, 60) || tag;

            // Sections — top-level semantic or large containers
            if (['section', 'main', 'header', 'footer', 'article', 'aside', 'nav'].includes(tag) ||
                (rect.width > 800 && rect.height > 300 && el.children.length > 1)) {
                const isDirectChild = el.parentElement === document.body ||
                    el.parentElement?.tagName === 'MAIN' ||
                    el.parentElement?.parentElement === document.body;
                if (isDirectChild || tag === 'section') {
                    result.sections.push({
                        tag,
                        name: name.substring(0, 80),
                        bounds: {
                            x: Math.round(rect.x),
                            y: Math.round(rect.y + window.scrollY),
                            width: Math.round(rect.width),
                            height: Math.round(rect.height),
                        },
                        padding: cs.padding,
                        backgroundColor: cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? cs.backgroundColor : null,
                        children: el.children.length,
                    });
                }
            }

            // Grid containers
            if (cs.display === 'grid' || cs.display === 'inline-grid') {
                result.grids.push({
                    name: name.substring(0, 80),
                    templateColumns: cs.gridTemplateColumns,
                    templateRows: cs.gridTemplateRows !== 'none' ? cs.gridTemplateRows : null,
                    gap: cs.gap,
                    bounds: {
                        width: Math.round(rect.width),
                        height: Math.round(rect.height),
                    },
                });
            }

            // Flexbox containers
            if (cs.display === 'flex' || cs.display === 'inline-flex') {
                result.flexboxes.push({
                    name: name.substring(0, 80),
                    direction: cs.flexDirection,
                    wrap: cs.flexWrap,
                    justifyContent: cs.justifyContent,
                    alignItems: cs.alignItems,
                    gap: cs.gap !== 'normal' ? cs.gap : null,
                    bounds: {
                        width: Math.round(rect.width),
                        height: Math.round(rect.height),
                    },
                });
            }

            // z-index stacking
            const zIndex = parseInt(cs.zIndex);
            if (!isNaN(zIndex) && zIndex !== 0) {
                result.stacks.push({
                    name: name.substring(0, 60),
                    zIndex,
                    position: cs.position,
                });
            }

            // Sticky elements
            if (cs.position === 'sticky') {
                result.sticky.push({
                    name: name.substring(0, 60),
                    top: cs.top,
                    bounds: { y: Math.round(rect.y + window.scrollY), height: Math.round(rect.height) },
                });
            }

            // Scroll snap
            if (cs.scrollSnapType && cs.scrollSnapType !== 'none') {
                result.snap.push({
                    name: name.substring(0, 60),
                    type: cs.scrollSnapType,
                    align: cs.scrollSnapAlign,
                });
            }

            // Parallax indicators
            const scrollSpeed = el.getAttribute('data-scroll-speed') || el.getAttribute('data-speed');
            if (scrollSpeed) {
                result.parallax.push({
                    name: name.substring(0, 60),
                    speed: scrollSpeed,
                });
            }
        });

        // Sort stacks by z-index descending
        result.stacks.sort((a, b) => b.zIndex - a.zIndex);
        // Limit flexboxes (there can be thousands)
        result.flexboxes = result.flexboxes.slice(0, 100);

        return result;
    });
}
