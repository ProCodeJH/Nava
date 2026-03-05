/**
 * Phase 1: Design Tokens — Colors, Typography, CSS Variables, Spacing
 */

export async function analyzeDesignTokens(page) {
    return page.evaluate(() => {
        const result = {
            colors: { backgrounds: {}, texts: {}, borders: {}, gradients: [] },
            typography: { fonts: [], fontSizes: {}, lineHeights: {}, letterSpacings: {}, fontWeights: {} },
            variables: {},
            spacing: { paddings: {}, margins: {}, gaps: {} },
        };

        // ── CSS Custom Properties ──
        const rootStyles = getComputedStyle(document.documentElement);
        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules || []) {
                    if (rule.selectorText === ':root' || rule.selectorText === ':root, :host') {
                        for (let i = 0; i < rule.style.length; i++) {
                            const prop = rule.style[i];
                            if (prop.startsWith('--')) {
                                result.variables[prop] = rule.style.getPropertyValue(prop).trim();
                            }
                        }
                    }
                }
            } catch (e) { /* cross-origin */ }
        }

        // ── Analyze all visible elements ──
        const allElements = document.querySelectorAll('*');
        const seen = { bg: new Set(), text: new Set(), border: new Set(), font: new Set() };

        allElements.forEach(el => {
            const cs = getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) return;

            // Colors
            const bg = cs.backgroundColor;
            if (bg && bg !== 'rgba(0, 0, 0, 0)' && !seen.bg.has(bg)) {
                seen.bg.add(bg);
                result.colors.backgrounds[bg] = (result.colors.backgrounds[bg] || 0) + 1;
            }

            const color = cs.color;
            if (color && !seen.text.has(color + el.tagName)) {
                seen.text.add(color + el.tagName);
                result.colors.texts[color] = (result.colors.texts[color] || 0) + 1;
            }

            const borderColor = cs.borderColor;
            if (borderColor && borderColor !== 'rgb(0, 0, 0)' && borderColor !== cs.color) {
                result.colors.borders[borderColor] = (result.colors.borders[borderColor] || 0) + 1;
            }

            // Gradients
            const bgImage = cs.backgroundImage;
            if (bgImage && bgImage !== 'none' && bgImage.includes('gradient')) {
                result.colors.gradients.push({
                    element: el.tagName + '.' + (el.className?.toString()?.substring(0, 60) || ''),
                    gradient: bgImage.substring(0, 300),
                });
            }

            // Typography
            const fontFamily = cs.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
            if (fontFamily && !seen.font.has(fontFamily)) {
                seen.font.add(fontFamily);
                result.typography.fonts.push(fontFamily);
            }

            const fontSize = cs.fontSize;
            result.typography.fontSizes[fontSize] = (result.typography.fontSizes[fontSize] || 0) + 1;

            const lineHeight = cs.lineHeight;
            if (lineHeight !== 'normal') {
                result.typography.lineHeights[lineHeight] = (result.typography.lineHeights[lineHeight] || 0) + 1;
            }

            const letterSpacing = cs.letterSpacing;
            if (letterSpacing !== 'normal' && letterSpacing !== '0px') {
                result.typography.letterSpacings[letterSpacing] = (result.typography.letterSpacings[letterSpacing] || 0) + 1;
            }

            const fontWeight = cs.fontWeight;
            result.typography.fontWeights[fontWeight] = (result.typography.fontWeights[fontWeight] || 0) + 1;

            // Spacing
            const padding = cs.padding;
            if (padding !== '0px') {
                result.spacing.paddings[padding] = (result.spacing.paddings[padding] || 0) + 1;
            }

            const gap = cs.gap;
            if (gap && gap !== 'normal' && gap !== '0px') {
                result.spacing.gaps[gap] = (result.spacing.gaps[gap] || 0) + 1;
            }
        });

        // Sort by frequency
        const sortByFreq = obj => Object.fromEntries(
            Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, 50)
        );

        result.colors.backgrounds = sortByFreq(result.colors.backgrounds);
        result.colors.texts = sortByFreq(result.colors.texts);
        result.typography.fontSizes = sortByFreq(result.typography.fontSizes);
        result.typography.fontWeights = sortByFreq(result.typography.fontWeights);

        return result;
    });
}
