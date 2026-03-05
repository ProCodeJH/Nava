/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  SPA Interaction Engine v9.0                                 ║
 * ║  Capture all UI interactions → reconstruct as vanilla JS     ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

/**
 * Injection script: runs BEFORE page load to capture all event listeners
 */
export function getInteractionCaptureScript() {
    return `
    (function() {
        if (window.__DNA_INTERACTION_CAPTURE__) return;
        window.__DNA_INTERACTION_CAPTURE__ = true;
        
        window.__dnaInteractions = {
            listeners: [],
            mutations: [],
            stateChanges: [],
            routeChanges: [],
            patterns: [],
        };
        
        // ═══ 1. Intercept addEventListener ═══
        const origAdd = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function(type, fn, opts) {
            if (['click','input','change','submit','keydown','keyup','focus','blur',
                 'mouseenter','mouseleave','touchstart','touchend','pointerdown','pointerup'].includes(type)) {
                try {
                    const el = this;
                    if (el && el.nodeType === 1) {
                        window.__dnaInteractions.listeners.push({
                            type,
                            selector: buildSelector(el),
                            tag: el.tagName?.toLowerCase(),
                            text: el.textContent?.substring(0, 50)?.trim(),
                            classes: [...(el.classList || [])].join(' '),
                            fnBody: fn.toString().substring(0, 500),
                            timestamp: Date.now(),
                        });
                    }
                } catch {}
            }
            return origAdd.call(this, type, fn, opts);
        };
        
        // ═══ 2. MutationObserver for DOM changes ═══
        const observer = new MutationObserver((muts) => {
            for (const mut of muts) {
                if (window.__dnaInteractions.mutations.length > 500) break;
                if (mut.type === 'attributes') {
                    window.__dnaInteractions.mutations.push({
                        type: 'attr',
                        selector: buildSelector(mut.target),
                        attr: mut.attributeName,
                        oldValue: mut.oldValue?.substring(0, 200),
                        newValue: mut.target.getAttribute(mut.attributeName)?.substring(0, 200),
                    });
                } else if (mut.type === 'childList') {
                    if (mut.addedNodes.length || mut.removedNodes.length) {
                        window.__dnaInteractions.mutations.push({
                            type: 'childList',
                            selector: buildSelector(mut.target),
                            added: mut.addedNodes.length,
                            removed: mut.removedNodes.length,
                        });
                    }
                }
            }
        });
        
        if (document.body) {
            observer.observe(document.body, { attributes: true, childList: true, subtree: true, attributeOldValue: true });
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                observer.observe(document.body, { attributes: true, childList: true, subtree: true, attributeOldValue: true });
            });
        }
        
        // ═══ 3. Intercept history for SPA routing ═══
        const origPush = history.pushState;
        const origReplace = history.replaceState;
        history.pushState = function(...args) {
            window.__dnaInteractions.routeChanges.push({ type: 'push', url: args[2], ts: Date.now() });
            return origPush.apply(this, args);
        };
        history.replaceState = function(...args) {
            window.__dnaInteractions.routeChanges.push({ type: 'replace', url: args[2], ts: Date.now() });
            return origReplace.apply(this, args);
        };
        window.addEventListener('popstate', () => {
            window.__dnaInteractions.routeChanges.push({ type: 'popstate', url: location.href, ts: Date.now() });
        });
        
        // ═══ 4. localStorage / sessionStorage tracking ═══
        const origSetItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function(key, val) {
            window.__dnaInteractions.stateChanges.push({
                storage: this === localStorage ? 'local' : 'session',
                key, value: String(val).substring(0, 200),
                ts: Date.now(),
            });
            return origSetItem.call(this, key, val);
        };
        
        function buildSelector(el) {
            if (!el || !el.tagName) return null;
            if (el.id) return '#' + CSS.escape(el.id);
            const classes = [...(el.classList || [])].filter(c => c.length < 40 && !c.startsWith('__'));
            if (classes.length) {
                const sel = '.' + classes.map(c => CSS.escape(c)).join('.');
                if (document.querySelectorAll(sel).length <= 3) return sel;
            }
            const tag = el.tagName.toLowerCase();
            if (['button','a','input','select','textarea','nav','header','footer','main'].includes(tag)) {
                const parent = el.parentElement;
                if (parent?.id) return '#' + CSS.escape(parent.id) + ' > ' + tag;
                return tag + ':nth-of-type(' + (Array.from(el.parentElement?.children || []).filter(c => c.tagName === el.tagName).indexOf(el) + 1) + ')';
            }
            return tag;
        }
    })();
    `;
}

/**
 * Extract captured interaction data from the page
 */
export async function extractInteractionData(page) {
    return page.evaluate(() => {
        const data = window.__dnaInteractions || { listeners: [], mutations: [], stateChanges: [], routeChanges: [], patterns: [] };

        // ═══ Pattern Detection ═══
        const patterns = [];
        const listenersBySelector = {};

        for (const l of data.listeners) {
            if (!l.selector) continue;
            if (!listenersBySelector[l.selector]) listenersBySelector[l.selector] = [];
            listenersBySelector[l.selector].push(l);
        }

        // Detect toggle patterns (click → class toggle)
        const attrMuts = data.mutations.filter(m => m.type === 'attr' && m.attr === 'class');
        for (const mut of attrMuts) {
            const hasClick = data.listeners.some(l => l.type === 'click' &&
                (l.selector === mut.selector || mut.selector?.includes(l.selector?.replace('#', ''))));
            if (hasClick) {
                patterns.push({
                    type: 'toggle',
                    trigger: mut.selector,
                    attr: 'class',
                    from: mut.oldValue?.substring(0, 100),
                    to: mut.newValue?.substring(0, 100),
                });
            }
        }

        // Detect modal patterns (click → display/visibility change)
        for (const mut of attrMuts) {
            if (mut.newValue?.includes('visible') || mut.newValue?.includes('open') || mut.newValue?.includes('active') ||
                mut.newValue?.includes('show') || mut.newValue?.includes('expanded')) {
                patterns.push({ type: 'modal', target: mut.selector, className: mut.newValue?.substring(0, 80) });
            }
        }

        // Detect tab patterns (multiple siblings with active class)
        const tabGroups = {};
        for (const mut of attrMuts) {
            const parent = mut.selector?.split(' > ')[0];
            if (parent) {
                if (!tabGroups[parent]) tabGroups[parent] = [];
                tabGroups[parent].push(mut);
            }
        }
        for (const [parent, muts] of Object.entries(tabGroups)) {
            if (muts.length >= 2) patterns.push({ type: 'tabs', container: parent, count: muts.length });
        }

        // Detect form validation
        const formInputs = data.listeners.filter(l => ['input', 'change', 'blur', 'submit'].includes(l.type) &&
            ['input', 'select', 'textarea', 'form'].includes(l.tag));
        if (formInputs.length > 0) {
            patterns.push({ type: 'form', inputs: formInputs.length });
        }

        // Detect accordion patterns
        const childListMuts = data.mutations.filter(m => m.type === 'childList');
        for (const mut of childListMuts) {
            const hasClick = data.listeners.some(l => l.type === 'click' && l.selector === mut.selector);
            if (hasClick && (mut.added > 0 || mut.removed > 0)) {
                patterns.push({ type: 'accordion', target: mut.selector, added: mut.added, removed: mut.removed });
            }
        }

        // Detect dropdown menus
        for (const l of data.listeners) {
            if ((l.type === 'mouseenter' || l.type === 'click') &&
                (l.fnBody?.includes('dropdown') || l.fnBody?.includes('menu') || l.fnBody?.includes('submenu') ||
                    l.classes?.includes('dropdown') || l.classes?.includes('menu'))) {
                patterns.push({ type: 'dropdown', trigger: l.selector, event: l.type });
            }
        }

        data.patterns = patterns;

        // Capture stored states
        data.storageSnapshot = {};
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                data.storageSnapshot[key] = localStorage.getItem(key)?.substring(0, 500);
            }
        } catch { }

        return {
            listeners: data.listeners.slice(0, 200),
            mutations: data.mutations.slice(0, 200),
            stateChanges: data.stateChanges.slice(0, 100),
            routeChanges: data.routeChanges,
            patterns,
            storageSnapshot: data.storageSnapshot,
            stats: {
                totalListeners: data.listeners.length,
                totalMutations: data.mutations.length,
                totalStateChanges: data.stateChanges.length,
                totalRoutes: data.routeChanges.length,
                patternsDetected: patterns.length,
            },
        };
    });
}

/**
 * Simulate user interactions to discover hidden UI states
 */
export async function simulateAndCapture(page) {
    const interactions = [];

    // Click all buttons and interactive elements
    const clickTargets = await page.evaluate(() => {
        const targets = [];
        const selectors = ['button', 'a[href="#"]', '[role="button"]', '[role="tab"]',
            '.accordion-header', '.tabs .tab', '.dropdown-toggle',
            '[data-toggle]', '[data-bs-toggle]', '.hamburger', '.menu-toggle',
            '[aria-expanded]', '[aria-haspopup]'];
        for (const sel of selectors) {
            document.querySelectorAll(sel).forEach((el, i) => {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight) {
                    targets.push({
                        selector: sel + (i > 0 ? `:nth-of-type(${i + 1})` : ''),
                        text: el.textContent?.trim()?.substring(0, 30),
                        x: rect.x + rect.width / 2,
                        y: rect.y + rect.height / 2,
                    });
                }
            });
        }
        return targets.slice(0, 30);
    });

    // Take before snapshot
    const beforeHTML = await page.evaluate(() => document.body.innerHTML.length);

    for (const target of clickTargets) {
        try {
            // Snapshot before click
            const before = await page.evaluate((sel) => {
                const el = document.querySelector(sel);
                return el ? { classes: el.className, display: getComputedStyle(el).display } : null;
            }, target.selector);

            await page.mouse.click(target.x, target.y);
            await new Promise(r => setTimeout(r, 500));

            // Snapshot after click
            const after = await page.evaluate((sel) => {
                const el = document.querySelector(sel);
                return el ? {
                    classes: el.className,
                    display: getComputedStyle(el).display,
                    bodyLen: document.body.innerHTML.length,
                } : null;
            }, target.selector);

            if (before && after && (before.classes !== after.classes || before.display !== after.display)) {
                interactions.push({
                    type: 'click',
                    target: target.selector,
                    text: target.text,
                    beforeClass: before.classes?.substring(0, 100),
                    afterClass: after.classes?.substring(0, 100),
                    domChanged: after.bodyLen !== beforeHTML,
                });
            }

            // Click again to revert (toggle)
            await page.mouse.click(target.x, target.y);
            await new Promise(r => setTimeout(r, 300));
        } catch { }
    }

    return interactions;
}

/**
 * Generate interaction reconstruction JS code
 */
export function generateInteractionCode(interactionData) {
    if (!interactionData) return '';

    const { patterns, listeners, routeChanges, storageSnapshot } = interactionData;
    let code = `/**
 * ═══ SPA Interaction Engine (auto-generated by Design-DNA v9.0) ═══
 * Patterns detected: ${patterns?.length || 0}
 * Event listeners captured: ${listeners?.length || 0}
 */

document.addEventListener('DOMContentLoaded', function() {
`;

    // ═══ Toggle patterns ═══
    const toggles = patterns?.filter(p => p.type === 'toggle') || [];
    if (toggles.length > 0) {
        code += `\n    // ═══ Toggle Interactions ═══\n`;
        for (const t of toggles) {
            const oldClasses = t.from?.split(' ').filter(Boolean) || [];
            const newClasses = t.to?.split(' ').filter(Boolean) || [];
            const added = newClasses.filter(c => !oldClasses.includes(c));
            const removed = oldClasses.filter(c => !newClasses.includes(c));

            if (added.length > 0 || removed.length > 0) {
                code += `    document.querySelectorAll('${t.trigger}').forEach(el => {\n`;
                code += `        el.addEventListener('click', () => {\n`;
                for (const cls of added) {
                    code += `            el.classList.toggle('${cls}');\n`;
                }
                code += `        });\n`;
                code += `    });\n\n`;
            }
        }
    }

    // ═══ Modal patterns ═══
    const modals = patterns?.filter(p => p.type === 'modal') || [];
    if (modals.length > 0) {
        code += `\n    // ═══ Modal / Overlay Interactions ═══\n`;
        for (const m of modals) {
            code += `    (function() {\n`;
            code += `        const target = document.querySelector('${m.target}');\n`;
            code += `        if (!target) return;\n`;
            code += `        // Toggle visibility on trigger click\n`;
            code += `        document.querySelectorAll('[data-modal-trigger]').forEach(trigger => {\n`;
            code += `            trigger.addEventListener('click', () => {\n`;
            code += `                target.classList.toggle('active');\n`;
            code += `                target.classList.toggle('visible');\n`;
            code += `            });\n`;
            code += `        });\n`;
            code += `        // Close on backdrop click\n`;
            code += `        target.addEventListener('click', (e) => {\n`;
            code += `            if (e.target === target) {\n`;
            code += `                target.classList.remove('active', 'visible');\n`;
            code += `            }\n`;
            code += `        });\n`;
            code += `    })();\n\n`;
        }
    }

    // ═══ Tab patterns ═══
    const tabs = patterns?.filter(p => p.type === 'tabs') || [];
    if (tabs.length > 0) {
        code += `\n    // ═══ Tab Interactions ═══\n`;
        for (const t of tabs) {
            code += `    (function() {\n`;
            code += `        const container = document.querySelector('${t.container}');\n`;
            code += `        if (!container) return;\n`;
            code += `        const tabs = container.querySelectorAll('[role="tab"], .tab, [data-tab]');\n`;
            code += `        const panels = container.querySelectorAll('[role="tabpanel"], .tab-panel, .tab-content');\n`;
            code += `        tabs.forEach((tab, i) => {\n`;
            code += `            tab.addEventListener('click', () => {\n`;
            code += `                tabs.forEach(t => t.classList.remove('active', 'selected'));\n`;
            code += `                panels.forEach(p => { p.style.display = 'none'; p.classList.remove('active'); });\n`;
            code += `                tab.classList.add('active', 'selected');\n`;
            code += `                if (panels[i]) { panels[i].style.display = ''; panels[i].classList.add('active'); }\n`;
            code += `            });\n`;
            code += `        });\n`;
            code += `    })();\n\n`;
        }
    }

    // ═══ Accordion patterns ═══
    const accordions = patterns?.filter(p => p.type === 'accordion') || [];
    if (accordions.length > 0) {
        code += `\n    // ═══ Accordion / Collapse Interactions ═══\n`;
        code += `    document.querySelectorAll('.accordion-header, [data-toggle="collapse"], [data-bs-toggle="collapse"]').forEach(header => {\n`;
        code += `        header.addEventListener('click', () => {\n`;
        code += `            const content = header.nextElementSibling;\n`;
        code += `            if (!content) return;\n`;
        code += `            const isOpen = content.style.maxHeight && content.style.maxHeight !== '0px';\n`;
        code += `            content.style.maxHeight = isOpen ? '0px' : content.scrollHeight + 'px';\n`;
        code += `            content.style.overflow = 'hidden';\n`;
        code += `            content.style.transition = 'max-height 0.3s ease';\n`;
        code += `            header.classList.toggle('active');\n`;
        code += `        });\n`;
        code += `    });\n\n`;
    }

    // ═══ Dropdown patterns ═══
    const dropdowns = patterns?.filter(p => p.type === 'dropdown') || [];
    if (dropdowns.length > 0) {
        code += `\n    // ═══ Dropdown Menu Interactions ═══\n`;
        code += `    document.querySelectorAll('.dropdown, [data-dropdown]').forEach(dd => {\n`;
        code += `        const toggle = dd.querySelector('.dropdown-toggle, [data-dropdown-toggle]') || dd;\n`;
        code += `        const menu = dd.querySelector('.dropdown-menu, [data-dropdown-menu]');\n`;
        code += `        if (!menu) return;\n`;
        code += `        toggle.addEventListener('click', (e) => {\n`;
        code += `            e.stopPropagation();\n`;
        code += `            menu.classList.toggle('show');\n`;
        code += `            menu.style.display = menu.classList.contains('show') ? 'block' : 'none';\n`;
        code += `        });\n`;
        code += `        document.addEventListener('click', () => {\n`;
        code += `            menu.classList.remove('show');\n`;
        code += `            menu.style.display = 'none';\n`;
        code += `        });\n`;
        code += `    });\n\n`;
    }

    // ═══ Form validation ═══
    const forms = patterns?.filter(p => p.type === 'form') || [];
    if (forms.length > 0) {
        code += `\n    // ═══ Form Validation ═══\n`;
        code += `    document.querySelectorAll('form').forEach(form => {\n`;
        code += `        form.addEventListener('submit', (e) => {\n`;
        code += `            e.preventDefault();\n`;
        code += `            let valid = true;\n`;
        code += `            form.querySelectorAll('[required]').forEach(input => {\n`;
        code += `                if (!input.value.trim()) {\n`;
        code += `                    input.classList.add('error', 'invalid');\n`;
        code += `                    valid = false;\n`;
        code += `                } else {\n`;
        code += `                    input.classList.remove('error', 'invalid');\n`;
        code += `                    input.classList.add('valid');\n`;
        code += `                }\n`;
        code += `            });\n`;
        code += `            if (valid) {\n`;
        code += `                // Mock submit — show success\n`;
        code += `                const btn = form.querySelector('[type="submit"], button');\n`;
        code += `                if (btn) { btn.textContent = '✓ Submitted'; btn.style.background = '#10b981'; }\n`;
        code += `            }\n`;
        code += `        });\n`;
        code += `    });\n\n`;
    }

    // ═══ Mobile hamburger menu ═══
    code += `\n    // ═══ Mobile Navigation Toggle ═══\n`;
    code += `    const hamburger = document.querySelector('.hamburger, .menu-toggle, .mobile-menu-btn, [data-menu-toggle]');\n`;
    code += `    const mobileNav = document.querySelector('.mobile-nav, .mobile-menu, .nav-mobile, nav ul');\n`;
    code += `    if (hamburger && mobileNav) {\n`;
    code += `        hamburger.addEventListener('click', () => {\n`;
    code += `            mobileNav.classList.toggle('open');\n`;
    code += `            hamburger.classList.toggle('active');\n`;
    code += `            document.body.classList.toggle('menu-open');\n`;
    code += `        });\n`;
    code += `    }\n`;

    // ═══ SPA routing ═══
    if (routeChanges?.length > 0) {
        code += `\n    // ═══ SPA Route Navigation ═══\n`;
        code += `    document.querySelectorAll('a[href^="/"]').forEach(link => {\n`;
        code += `        link.addEventListener('click', (e) => {\n`;
        code += `            const href = link.getAttribute('href');\n`;
        code += `            if (href && !href.startsWith('http')) {\n`;
        code += `                e.preventDefault();\n`;
        code += `                const file = href.replace(/^\\//,'').replace(/\\/$/, '') || 'index';\n`;
        code += `                window.location.href = file.replace(/\\//g, '-') + '.html';\n`;
        code += `            }\n`;
        code += `        });\n`;
        code += `    });\n`;
    }

    // ═══ Smooth scroll ═══
    code += `\n    // ═══ Smooth Scroll for Anchor Links ═══\n`;
    code += `    document.querySelectorAll('a[href^="#"]').forEach(anchor => {\n`;
    code += `        anchor.addEventListener('click', (e) => {\n`;
    code += `            e.preventDefault();\n`;
    code += `            const target = document.querySelector(anchor.getAttribute('href'));\n`;
    code += `            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });\n`;
    code += `        });\n`;
    code += `    });\n`;

    // ═══ Restore storage state ═══
    if (storageSnapshot && Object.keys(storageSnapshot).length > 0) {
        code += `\n    // ═══ Restore Application State ═══\n`;
        for (const [key, value] of Object.entries(storageSnapshot)) {
            const escaped = JSON.stringify(value || '');
            code += `    try { localStorage.setItem(${JSON.stringify(key)}, ${escaped}); } catch {}\n`;
        }
    }

    code += `\n    console.log('[Design-DNA] SPA interactions initialized');\n`;
    code += '});\n';

    return code;
}
