/**
 * Phase 9: Accessibility — ARIA audit, contrast, tab order, reduced-motion
 */

export async function analyzeAccessibility(page, cdp) {
    const result = {
        issues: [],
        score: 100,
        ariaUsage: {},
        headingHierarchy: [],
        contrastIssues: [],
        tabOrder: [],
        reducedMotion: false,
        landmarks: [],
    };

    const audit = await page.evaluate(() => {
        const data = {
            issues: [],
            ariaUsage: {},
            headingHierarchy: [],
            landmarks: [],
            tabOrder: [],
            imgAltIssues: [],
            formLabelIssues: [],
            contrastWarnings: [],
        };

        // ── 1. Heading hierarchy ──
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        let prevLevel = 0;
        headings.forEach(h => {
            const level = parseInt(h.tagName[1]);
            const text = h.textContent?.trim()?.substring(0, 60) || '';
            data.headingHierarchy.push({ level, text, tag: h.tagName });

            if (level > prevLevel + 1 && prevLevel > 0) {
                data.issues.push({
                    type: 'heading-skip',
                    severity: 'warning',
                    message: `Heading level skipped: h${prevLevel} → h${level}`,
                    element: text.substring(0, 40),
                });
            }
            prevLevel = level;
        });

        // Multiple h1 check
        const h1Count = document.querySelectorAll('h1').length;
        if (h1Count > 1) {
            data.issues.push({
                type: 'multiple-h1',
                severity: 'warning',
                message: `${h1Count} h1 elements found (should be 1)`,
            });
        }
        if (h1Count === 0) {
            data.issues.push({
                type: 'missing-h1',
                severity: 'error',
                message: 'No h1 element found on page',
            });
        }

        // ── 2. Image alt text ──
        document.querySelectorAll('img').forEach(img => {
            const alt = img.getAttribute('alt');
            const src = img.src?.substring(0, 80) || '';
            if (alt === null) {
                data.issues.push({
                    type: 'img-no-alt',
                    severity: 'error',
                    message: `Image missing alt attribute`,
                    element: src,
                });
            } else if (alt === '') {
                // Empty alt is OK for decorative images, but flag it
                data.imgAltIssues.push({ src, alt: '(empty — decorative)' });
            }
        });

        // ── 3. Form labels ──
        document.querySelectorAll('input, select, textarea').forEach(input => {
            const id = input.id;
            const ariaLabel = input.getAttribute('aria-label');
            const ariaLabelledBy = input.getAttribute('aria-labelledby');
            const hasLabel = id && document.querySelector(`label[for="${id}"]`);

            if (!hasLabel && !ariaLabel && !ariaLabelledBy) {
                data.issues.push({
                    type: 'form-no-label',
                    severity: 'error',
                    message: `Form control without label`,
                    element: `${input.tagName} type=${input.type || 'text'} id=${id || '(none)'}`,
                });
            }
        });

        // ── 4. ARIA usage ──
        document.querySelectorAll('[role]').forEach(el => {
            const role = el.getAttribute('role');
            data.ariaUsage[role] = (data.ariaUsage[role] || 0) + 1;
        });

        document.querySelectorAll('[aria-label]').forEach(el => {
            const tag = el.tagName;
            data.ariaUsage[`aria-label (${tag})`] = (data.ariaUsage[`aria-label (${tag})`] || 0) + 1;
        });

        // ── 5. Landmarks ──
        const landmarkMap = {
            banner: 'header', navigation: 'nav', main: 'main', contentinfo: 'footer',
        };
        const landmarkRoles = ['banner', 'navigation', 'main', 'contentinfo', 'complementary', 'search'];
        landmarkRoles.forEach(role => {
            const htmlTag = landmarkMap[role];
            const selector = htmlTag ? `[role="${role}"], ${htmlTag}` : `[role="${role}"]`;
            try {
                const els = document.querySelectorAll(selector);
                if (els.length > 0) {
                    data.landmarks.push({ role, count: els.length });
                }
            } catch (e) { /* invalid selector */ }
        });

        // ── 6. Button/link accessibility ──
        document.querySelectorAll('button, a').forEach(el => {
            const text = el.textContent?.trim();
            const ariaLabel = el.getAttribute('aria-label');
            if (!text && !ariaLabel) {
                const name = el.tagName + (el.className?.toString()?.substring(0, 30) || '');
                data.issues.push({
                    type: 'empty-interactive',
                    severity: 'warning',
                    message: `Interactive element with no text or aria-label`,
                    element: name,
                });
            }
        });

        // ── 7. Color contrast estimation ──
        document.querySelectorAll('h1, h2, h3, p, a, span, button, label').forEach(el => {
            const cs = getComputedStyle(el);
            const text = el.textContent?.trim();
            if (!text || text.length > 100) return;

            const color = cs.color;
            const bg = cs.backgroundColor;

            // Very rough luminance check (not WCAG compliant, just a warning)
            const parseRGB = (str) => {
                const match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : null;
            };

            const textRGB = parseRGB(color);
            const bgRGB = parseRGB(bg);

            if (textRGB && bgRGB && bg !== 'rgba(0, 0, 0, 0)') {
                const diff = Math.abs(textRGB[0] - bgRGB[0]) + Math.abs(textRGB[1] - bgRGB[1]) + Math.abs(textRGB[2] - bgRGB[2]);
                if (diff < 100) {
                    data.contrastWarnings.push({
                        text: text.substring(0, 30),
                        textColor: color,
                        bgColor: bg,
                        diffScore: diff,
                    });
                }
            }
        });

        // ── 8. Tab order ──
        const tabbable = document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]');
        let idx = 0;
        tabbable.forEach(el => {
            if (idx >= 20) return;
            const tabindex = el.getAttribute('tabindex');
            data.tabOrder.push({
                order: idx++,
                tag: el.tagName,
                text: (el.textContent?.trim()?.substring(0, 30) || el.getAttribute('aria-label') || ''),
                tabindex: tabindex !== null ? parseInt(tabindex) : 'auto',
            });
        });

        return data;
    });

    Object.assign(result, audit);

    // ── prefers-reduced-motion check ──
    const hasReducedMotion = await page.evaluate(() => {
        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules || []) {
                    if (rule.type === CSSRule.MEDIA_RULE) {
                        const media = rule.conditionText || rule.media?.mediaText || '';
                        if (media.includes('prefers-reduced-motion')) return true;
                    }
                }
            } catch (e) { }
        }
        return false;
    });
    result.reducedMotion = hasReducedMotion;
    if (!hasReducedMotion) {
        result.issues.push({
            type: 'no-reduced-motion',
            severity: 'warning',
            message: 'No prefers-reduced-motion media query found',
        });
    }

    // ── Calculate score ──
    const errors = result.issues.filter(i => i.severity === 'error').length;
    const warnings = result.issues.filter(i => i.severity === 'warning').length;
    result.score = Math.max(0, 100 - (errors * 10) - (warnings * 3));

    return result;
}
