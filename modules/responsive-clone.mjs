/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Responsive Clone v8.0                                       ║
 * ║  Captures 3 viewports + generates @media queries             ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

const VIEWPORTS = [
    { name: 'mobile', width: 375, height: 812 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1920, height: 1080 },
];

const TRACKED_PROPS = [
    'display', 'flexDirection', 'gridTemplateColumns', 'gap',
    'width', 'maxWidth', 'minWidth', 'height', 'padding', 'margin',
    'fontSize', 'lineHeight', 'letterSpacing', 'textAlign',
    'position', 'top', 'right', 'bottom', 'left',
    'flexWrap', 'justifyContent', 'alignItems',
    'overflow', 'visibility', 'opacity',
    'borderRadius', 'boxShadow',
];

/**
 * Capture computed styles at multiple viewports and generate responsive CSS.
 */
export async function generateResponsiveClone(page, url) {
    const originalViewport = page.viewport();
    const viewportData = {};

    for (const vp of VIEWPORTS) {
        await page.setViewport({ width: vp.width, height: vp.height });
        await page.waitForTimeout(800);

        viewportData[vp.name] = await page.evaluate((trackedProps) => {
            const data = [];
            const elements = document.querySelectorAll('header, nav, main, section, footer, [class], [id]');

            elements.forEach((el, idx) => {
                const selector = buildUniqueSelector(el);
                if (!selector) return;

                const cs = getComputedStyle(el);
                const styles = {};
                trackedProps.forEach(prop => {
                    const val = cs[prop];
                    if (val && val !== 'auto' && val !== 'normal' && val !== 'none' && val !== '0px') {
                        styles[prop] = val;
                    }
                });

                const rect = el.getBoundingClientRect();
                data.push({
                    selector,
                    styles,
                    display: cs.display === 'none' ? 'hidden' : 'visible',
                    rect: { w: Math.round(rect.width), h: Math.round(rect.height) },
                });
            });

            return data;

            function buildUniqueSelector(el) {
                if (el.id) return `#${CSS.escape(el.id)}`;
                if (el.getAttribute('data-framer-name')) {
                    return `[data-framer-name="${el.getAttribute('data-framer-name')}"]`;
                }
                const classes = [...el.classList].filter(c => !c.startsWith('__') && c.length < 40);
                if (classes.length > 0) {
                    const sel = '.' + classes.map(c => CSS.escape(c)).join('.');
                    if (document.querySelectorAll(sel).length <= 3) return sel;
                }
                const tag = el.tagName.toLowerCase();
                if (['header', 'nav', 'main', 'footer', 'article', 'aside'].includes(tag)) return tag;
                return null;
            }
        }, TRACKED_PROPS);
    }

    // Restore original viewport
    if (originalViewport) {
        await page.setViewport(originalViewport);
    }

    // Generate @media queries by diffing viewport data
    const mediaQueries = generateMediaQueries(viewportData);

    return {
        viewports: Object.fromEntries(
            Object.entries(viewportData).map(([k, v]) => [k, v.length])
        ),
        mediaQueries,
        stats: {
            totalRules: mediaQueries.mobile.length + mediaQueries.tablet.length,
            mobileRules: mediaQueries.mobile.length,
            tabletRules: mediaQueries.tablet.length,
        },
    };
}

function generateMediaQueries(viewportData) {
    const desktop = indexBySelector(viewportData.desktop || []);
    const tablet = indexBySelector(viewportData.tablet || []);
    const mobile = indexBySelector(viewportData.mobile || []);

    const tabletRules = [];
    const mobileRules = [];

    // Tablet differences from desktop
    for (const [sel, tabletStyles] of Object.entries(tablet)) {
        const desktopStyles = desktop[sel];
        if (!desktopStyles) continue;
        const diffs = diffStyles(desktopStyles.styles, tabletStyles.styles);
        if (Object.keys(diffs).length > 0) {
            tabletRules.push({ selector: sel, styles: diffs });
        }
        if (desktopStyles.display !== tabletStyles.display) {
            if (tabletStyles.display === 'hidden') {
                tabletRules.push({ selector: sel, styles: { display: 'none' } });
            }
        }
    }

    // Mobile differences from tablet (or desktop if no tablet)
    for (const [sel, mobileStyles] of Object.entries(mobile)) {
        const base = tablet[sel] || desktop[sel];
        if (!base) continue;
        const diffs = diffStyles(base.styles, mobileStyles.styles);
        if (Object.keys(diffs).length > 0) {
            mobileRules.push({ selector: sel, styles: diffs });
        }
        if (base.display !== mobileStyles.display) {
            if (mobileStyles.display === 'hidden') {
                mobileRules.push({ selector: sel, styles: { display: 'none' } });
            }
        }
    }

    return { tablet: tabletRules, mobile: mobileRules };
}

function indexBySelector(data) {
    const map = {};
    data.forEach(d => { map[d.selector] = d; });
    return map;
}

function diffStyles(base, target) {
    const diffs = {};
    for (const [prop, val] of Object.entries(target)) {
        if (base[prop] !== val) {
            diffs[prop] = val;
        }
    }
    return diffs;
}

/**
 * Generate CSS string from responsive data
 */
export function buildResponsiveCSS(responsiveData) {
    if (!responsiveData?.mediaQueries) return '';

    let css = '\n/* ═══ Responsive Media Queries (auto-generated) ═══ */\n';

    const { tablet, mobile } = responsiveData.mediaQueries;

    if (tablet.length > 0) {
        css += '\n@media (max-width: 1024px) {\n';
        for (const rule of tablet) {
            css += `  ${rule.selector} {\n`;
            for (const [prop, val] of Object.entries(rule.styles)) {
                css += `    ${camelToKebab(prop)}: ${val};\n`;
            }
            css += '  }\n';
        }
        css += '}\n';
    }

    if (mobile.length > 0) {
        css += '\n@media (max-width: 480px) {\n';
        for (const rule of mobile) {
            css += `  ${rule.selector} {\n`;
            for (const [prop, val] of Object.entries(rule.styles)) {
                css += `    ${camelToKebab(prop)}: ${val};\n`;
            }
            css += '  }\n';
        }
        css += '}\n';
    }

    return css;
}

function camelToKebab(str) {
    return str.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
}
