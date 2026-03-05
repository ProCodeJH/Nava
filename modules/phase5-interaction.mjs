/**
 * Phase 5: Interaction — Hover states, cursor types, blend modes, magnetic patterns
 */

export async function analyzeInteraction(page) {
    return page.evaluate(() => {
        const result = {
            hovers: [],
            blendModes: [],
            cursors: [],
            focusStates: [],
            customCursors: [],
        };

        const allElements = document.querySelectorAll('*');

        allElements.forEach(el => {
            const cs = getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) return;

            const name = el.getAttribute('data-framer-name') || el.id || el.className?.toString()?.substring(0, 60) || el.tagName;

            // ── Mix-blend-mode ──
            if (cs.mixBlendMode && cs.mixBlendMode !== 'normal') {
                result.blendModes.push({
                    name: name.substring(0, 60),
                    mode: cs.mixBlendMode,
                    tag: el.tagName,
                });
            }

            // ── Cursor types ──
            const cursor = cs.cursor;
            if (cursor && cursor !== 'auto' && cursor !== 'default') {
                result.cursors.push({
                    name: name.substring(0, 60),
                    cursor,
                    tag: el.tagName,
                });
            }

            // ── Custom cursor elements (div/span with mix-blend-mode following mouse) ──
            if (cs.position === 'fixed' && cs.pointerEvents === 'none' && cs.mixBlendMode === 'difference') {
                result.customCursors.push({
                    name: name.substring(0, 60),
                    size: { width: Math.round(rect.width), height: Math.round(rect.height) },
                    borderRadius: cs.borderRadius,
                    background: cs.backgroundColor,
                    mixBlendMode: cs.mixBlendMode,
                });
            }
        });

        // ── Hover CSS rules extraction ──
        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules || []) {
                    if (rule.selectorText && rule.selectorText.includes(':hover')) {
                        const styles = {};
                        const s = rule.style;

                        // Capture transform changes on hover
                        if (s.transform) styles.transform = s.transform;
                        if (s.opacity) styles.opacity = s.opacity;
                        if (s.backgroundColor) styles.backgroundColor = s.backgroundColor;
                        if (s.color) styles.color = s.color;
                        if (s.boxShadow) styles.boxShadow = s.boxShadow;
                        if (s.borderColor) styles.borderColor = s.borderColor;
                        if (s.scale) styles.scale = s.scale;
                        if (s.filter) styles.filter = s.filter;

                        if (Object.keys(styles).length > 0) {
                            result.hovers.push({
                                selector: rule.selectorText.substring(0, 150),
                                styles,
                            });
                        }
                    }

                    // ── Focus-visible rules (accessibility) ──
                    if (rule.selectorText &&
                        (rule.selectorText.includes(':focus-visible') || rule.selectorText.includes(':focus'))) {
                        const styles = {};
                        const s = rule.style;
                        if (s.outline) styles.outline = s.outline;
                        if (s.boxShadow) styles.boxShadow = s.boxShadow;
                        if (s.borderColor) styles.borderColor = s.borderColor;

                        if (Object.keys(styles).length > 0) {
                            result.focusStates.push({
                                selector: rule.selectorText.substring(0, 150),
                                styles,
                            });
                        }
                    }
                }
            } catch (e) { /* cross-origin */ }
        }

        // Deduplicate cursors by cursor type
        const cursorMap = {};
        result.cursors.forEach(c => {
            if (!cursorMap[c.cursor]) cursorMap[c.cursor] = { cursor: c.cursor, count: 0, examples: [] };
            cursorMap[c.cursor].count++;
            if (cursorMap[c.cursor].examples.length < 3) cursorMap[c.cursor].examples.push(c.name);
        });
        result.cursors = Object.values(cursorMap);

        return result;
    });
}
