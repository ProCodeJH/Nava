/**
 * v5.0 Module: CSS Advanced Features Analyzer
 *
 * Detects and extracts:
 *  - CSS Scroll-driven Animations (animation-timeline: scroll())
 *  - View Transitions API (::view-transition-*)
 *  - Container Queries (@container)
 *  - CSS Nesting
 *  - Cascade Layers (@layer)
 *  - Subgrid
 *  - @property (Houdini registered custom properties)
 *  - @supports conditions
 *  - Modern color functions (oklch, lch, color-mix, color())
 *  - Logical properties (inline, block)
 *  - :has() pseudo-class usage
 */

export async function analyzeCSSAdvanced(page) {
    return page.evaluate(() => {
        const result = {
            scrollDrivenAnimations: [],
            viewTransitions: [],
            containerQueries: [],
            cascadeLayers: [],
            subgrid: [],
            registeredProperties: [],
            supportsConditions: [],
            modernColors: [],
            logicalProperties: [],
            hasSelector: [],
            cssNesting: [],
            anchorPositioning: [],
            popoverAPI: [],
            summary: {},
        };

        // ═══ Walk all stylesheets ═══
        for (const sheet of document.styleSheets) {
            try {
                walkRules(sheet.cssRules, sheet.href);
            } catch (e) { /* cross-origin */ }
        }

        function walkRules(rules, sheetHref) {
            if (!rules) return;
            for (const rule of rules) {
                try {
                    // @container queries
                    if (rule.constructor.name === 'CSSContainerRule' || rule.cssText?.startsWith('@container')) {
                        result.containerQueries.push({
                            name: rule.containerName || rule.conditionText?.substring(0, 80) || '',
                            condition: rule.conditionText?.substring(0, 100) || '',
                            ruleCount: rule.cssRules?.length || 0,
                            sheet: sheetHref?.split('/').pop()?.substring(0, 40) || 'inline',
                        });
                    }

                    // @layer
                    if (rule.constructor.name === 'CSSLayerBlockRule' || rule.cssText?.startsWith('@layer')) {
                        result.cascadeLayers.push({
                            name: rule.name || '',
                            ruleCount: rule.cssRules?.length || 0,
                            sheet: sheetHref?.split('/').pop()?.substring(0, 40) || 'inline',
                        });
                    }

                    // @property (Houdini)
                    if (rule.constructor.name === 'CSSPropertyRule' || rule.cssText?.startsWith('@property')) {
                        result.registeredProperties.push({
                            name: rule.name || rule.cssText?.match(/@property\s+(--[\w-]+)/)?.[1] || '',
                            syntax: rule.syntax || '',
                            initialValue: rule.initialValue || '',
                            inherits: rule.inherits,
                        });
                    }

                    // @supports
                    if (rule.constructor.name === 'CSSSupportsRule' || rule.cssText?.startsWith('@supports')) {
                        result.supportsConditions.push({
                            condition: rule.conditionText?.substring(0, 150) || '',
                            ruleCount: rule.cssRules?.length || 0,
                        });
                    }

                    // Style rules
                    if (rule.style) {
                        const cssText = rule.cssText || '';

                        // Scroll-driven animations
                        if (rule.style.animationTimeline ||
                            cssText.includes('animation-timeline') ||
                            cssText.includes('scroll(') ||
                            cssText.includes('view(')) {
                            result.scrollDrivenAnimations.push({
                                selector: rule.selectorText?.substring(0, 100),
                                animationTimeline: rule.style.animationTimeline || '',
                                animationRange: rule.style.animationRange || '',
                                scrollTimeline: cssText.match(/animation-timeline:\s*([^;]+)/)?.[1]?.trim() || '',
                            });
                        }

                        // View Transitions
                        if (cssText.includes('view-transition-name') ||
                            rule.selectorText?.includes('::view-transition')) {
                            result.viewTransitions.push({
                                selector: rule.selectorText?.substring(0, 100),
                                viewTransitionName: rule.style.viewTransitionName || '',
                                properties: cssText.substring(0, 200),
                            });
                        }

                        // Subgrid
                        if (cssText.includes('subgrid')) {
                            result.subgrid.push({
                                selector: rule.selectorText?.substring(0, 100),
                                gridTemplateColumns: rule.style.gridTemplateColumns?.includes('subgrid') ? rule.style.gridTemplateColumns : null,
                                gridTemplateRows: rule.style.gridTemplateRows?.includes('subgrid') ? rule.style.gridTemplateRows : null,
                            });
                        }

                        // Modern color functions
                        const colorProps = ['color', 'backgroundColor', 'borderColor', 'outlineColor', 'fill', 'stroke'];
                        for (const prop of colorProps) {
                            const val = rule.style[prop];
                            if (val && (val.includes('oklch') || val.includes('lch(') || val.includes('color-mix') ||
                                val.includes('color(') || val.includes('oklab') || val.includes('lab('))) {
                                result.modernColors.push({
                                    selector: rule.selectorText?.substring(0, 60),
                                    property: prop,
                                    value: val.substring(0, 100),
                                    functionType: val.match(/(oklch|lch|color-mix|oklab|lab|color)\(/)?.[1] || 'unknown',
                                });
                            }
                        }

                        // :has() selector
                        if (rule.selectorText?.includes(':has(')) {
                            result.hasSelector.push({
                                selector: rule.selectorText?.substring(0, 150),
                            });
                        }

                        // Logical properties
                        const logicalProps = ['marginInline', 'marginBlock', 'paddingInline', 'paddingBlock',
                            'insetInline', 'insetBlock', 'borderInline', 'borderBlock', 'inlineSize', 'blockSize'];
                        for (const lp of logicalProps) {
                            if (rule.style[lp]) {
                                result.logicalProperties.push({
                                    selector: rule.selectorText?.substring(0, 80),
                                    property: lp,
                                    value: rule.style[lp],
                                });
                                break; // One per rule
                            }
                        }

                        // CSS Nesting (hard to detect from parsed rules, check for & in selector)
                        if (rule.selectorText?.includes('&')) {
                            result.cssNesting.push({
                                selector: rule.selectorText?.substring(0, 100),
                            });
                        }
                    }

                    // Walk nested rules
                    if (rule.cssRules) walkRules(rule.cssRules, sheetHref);
                } catch (e) { }
            }
        }

        // ═══ Detect Popover API usage ═══
        document.querySelectorAll('[popover]').forEach(el => {
            result.popoverAPI.push({
                tag: el.tagName,
                id: el.id || null,
                popoverType: el.getAttribute('popover'),
                trigger: (() => {
                    const trigger = document.querySelector(`[popovertarget="${el.id}"]`);
                    return trigger ? trigger.textContent?.trim()?.substring(0, 30) : null;
                })(),
            });
        });

        // ═══ Detect Anchor Positioning ═══
        document.querySelectorAll('[style*="anchor-name"], [anchor]').forEach(el => {
            result.anchorPositioning.push({
                tag: el.tagName,
                anchorName: el.style.anchorName || el.getAttribute('anchor') || null,
            });
        });

        // ═══ Check container-type usage in DOM ═══
        document.querySelectorAll('*').forEach(el => {
            const cs = getComputedStyle(el);
            if (cs.containerType && cs.containerType !== 'normal') {
                result.containerQueries.push({
                    element: el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + el.className.toString().split(' ')[0] : ''),
                    containerType: cs.containerType,
                    containerName: cs.containerName || null,
                    isDOMDetected: true,
                });
            }
        });

        // ═══ Summary ═══
        result.summary = {
            scrollDrivenAnimations: result.scrollDrivenAnimations.length,
            viewTransitions: result.viewTransitions.length,
            containerQueries: result.containerQueries.length,
            cascadeLayers: result.cascadeLayers.length,
            subgrid: result.subgrid.length,
            registeredProperties: result.registeredProperties.length,
            supportsConditions: result.supportsConditions.length,
            modernColors: result.modernColors.length,
            logicalProperties: result.logicalProperties.length,
            hasSelector: result.hasSelector.length,
            cssNesting: result.cssNesting.length,
            popoverAPI: result.popoverAPI.length,
            anchorPositioning: result.anchorPositioning.length,
        };

        // Deduplicate
        result.modernColors = result.modernColors.slice(0, 30);
        result.logicalProperties = result.logicalProperties.slice(0, 20);
        result.containerQueries = result.containerQueries.slice(0, 20);

        return result;
    });
}
