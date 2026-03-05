/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  CSS Variable Extractor v8.0                                 ║
 * ║  Preserves :root variables + auto-detects repeated values    ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

/**
 * Extract all CSS custom properties from the page
 */
export async function extractCSSVariables(page) {
    return page.evaluate(() => {
        const results = {
            rootVariables: {},
            elementVariables: {},
            repeatedValues: {},
            suggestedNewVariables: [],
        };

        // ═══ 1. Extract :root CSS variables ═══
        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules || []) {
                    if (rule.selectorText === ':root' || rule.selectorText === ':host') {
                        for (let i = 0; i < rule.style.length; i++) {
                            const prop = rule.style[i];
                            if (prop.startsWith('--')) {
                                results.rootVariables[prop] = rule.style.getPropertyValue(prop).trim();
                            }
                        }
                    }
                }
            } catch (e) { /* CORS blocked stylesheet */ }
        }

        // ═══ 2. Extract computed CSS variables from :root ═══
        const rootCS = getComputedStyle(document.documentElement);
        const allProps = [];
        for (let i = 0; i < rootCS.length; i++) {
            const prop = rootCS[i];
            if (prop.startsWith('--')) {
                const val = rootCS.getPropertyValue(prop).trim();
                results.rootVariables[prop] = val;
                allProps.push({ prop, val });
            }
        }

        // ═══ 3. Scan for hardcoded repeated values ═══
        const valueCounts = {};
        const colorPattern = /^(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))$/;

        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules || []) {
                    if (!rule.style) continue;
                    for (let i = 0; i < rule.style.length; i++) {
                        const prop = rule.style[i];
                        const val = rule.style.getPropertyValue(prop).trim();

                        // Track colors and spacing values
                        if (colorPattern.test(val) ||
                            (/^\d+(\.\d+)?(px|rem|em|%)$/.test(val) && parseFloat(val) > 0)) {
                            if (!val.startsWith('var(')) {
                                valueCounts[val] = (valueCounts[val] || 0) + 1;
                            }
                        }
                    }
                }
            } catch (e) { /* CORS */ }
        }

        // Values used 3+ times → suggest as variable
        const existingValues = new Set(Object.values(results.rootVariables));
        for (const [val, count] of Object.entries(valueCounts)) {
            if (count >= 3 && !existingValues.has(val)) {
                const name = suggestVarName(val);
                results.suggestedNewVariables.push({ name, value: val, usageCount: count });
            }
        }

        results.repeatedValues = valueCounts;

        return results;

        function suggestVarName(val) {
            if (/^#|^rgb|^hsl/.test(val)) {
                const idx = Object.keys(results.suggestedNewVariables || {}).length;
                return `--color-extracted-${idx}`;
            }
            if (/px$/.test(val)) return `--space-${val.replace('px', '')}`;
            if (/rem$/.test(val)) return `--space-${val.replace('rem', '')}rem`;
            return `--val-${val.replace(/[^a-zA-Z0-9]/g, '-')}`;
        }
    });
}

/**
 * Generate design-tokens.css from extracted variables
 */
export function generateDesignTokensCSS(variables) {
    if (!variables?.rootVariables) return '';

    let css = '/* ═══ Design Tokens (extracted from original) ═══ */\n\n';
    css += ':root {\n';

    // Group by prefix
    const groups = {};
    for (const [prop, val] of Object.entries(variables.rootVariables)) {
        const prefix = prop.split('-').filter(Boolean).slice(0, 2).join('-') || 'misc';
        if (!groups[prefix]) groups[prefix] = [];
        groups[prefix].push({ prop, val });
    }

    for (const [group, vars] of Object.entries(groups)) {
        css += `  /* ${group} */\n`;
        for (const { prop, val } of vars) {
            css += `  ${prop}: ${val};\n`;
        }
        css += '\n';
    }

    // Add suggested new variables
    if (variables.suggestedNewVariables?.length > 0) {
        css += '  /* Auto-detected repeated values */\n';
        for (const { name, value } of variables.suggestedNewVariables) {
            css += `  ${name}: ${value};\n`;
        }
        css += '\n';
    }

    css += '}\n';
    return css;
}

/**
 * Replace hardcoded values in CSS with variable references
 */
export function replaceHardcodedWithVars(cssContent, variables) {
    if (!variables?.rootVariables || !cssContent) return cssContent;

    let result = cssContent;

    // Build value→variable lookup (reverse map), prefer shorter variable names
    const valueToVar = {};
    for (const [prop, val] of Object.entries(variables.rootVariables)) {
        const cleanVal = val.trim();
        if (cleanVal && cleanVal.length > 2 && !cleanVal.startsWith('var(')) {
            if (!valueToVar[cleanVal] || prop.length < valueToVar[cleanVal].length) {
                valueToVar[cleanVal] = prop;
            }
        }
    }

    // Replace hardcoded color values with var() references
    // Only replace values in property declarations (after : and before ; or })
    for (const [val, varName] of Object.entries(valueToVar)) {
        // Skip very short values that could cause false positives
        if (val.length < 4) continue;

        const escaped = val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(:\\s*)${escaped}(\\s*[;!}])`, 'g');
        result = result.replace(regex, `$1var(${varName})$2`);
    }

    return result;
}
