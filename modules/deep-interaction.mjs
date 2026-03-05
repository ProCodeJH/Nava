/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Deep Interaction Simulator v10.0                            ║
 * ║  Exhaustive form fill, navigation, state exploration         ║
 * ║  Capture every possible UI state                             ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

/**
 * Discover and interact with ALL interactive elements on the page
 */
export async function deepInteractionScan(page, options = {}) {
    const maxInteractions = options.maxInteractions || 100;
    const capturedStates = [];
    const interactedElements = new Set();

    // 1. Discover all interactive elements
    const elements = await page.evaluate(() => {
        const interactive = [];
        const selectors = [
            'button', 'a[href]', 'input', 'select', 'textarea',
            '[role="button"]', '[role="tab"]', '[role="menuitem"]',
            '[role="checkbox"]', '[role="radio"]', '[role="switch"]',
            '[role="slider"]', '[role="combobox"]', '[role="listbox"]',
            '[onclick]', '[data-toggle]', '[data-bs-toggle]',
            '[tabindex]', '.clickable', '.btn', '.nav-link',
            'details > summary', '[aria-expanded]', '[aria-haspopup]',
        ];

        for (const sel of selectors) {
            document.querySelectorAll(sel).forEach(el => {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight * 3) {
                    const id = el.id || el.getAttribute('data-testid') || el.getAttribute('aria-label') ||
                        el.textContent?.trim().substring(0, 30) || `${el.tagName}_${rect.x}_${rect.y}`;
                    interactive.push({
                        id,
                        tag: el.tagName,
                        type: el.type || el.getAttribute('role') || 'element',
                        text: (el.textContent || '').trim().substring(0, 50),
                        rect: { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, w: rect.width, h: rect.height },
                        selector: generateSelector(el),
                        attributes: {
                            href: el.getAttribute('href'),
                            ariaExpanded: el.getAttribute('aria-expanded'),
                            ariaHaspopup: el.getAttribute('aria-haspopup'),
                            dataToggle: el.getAttribute('data-toggle') || el.getAttribute('data-bs-toggle'),
                            disabled: el.disabled,
                            inputType: el.type,
                        },
                    });
                }
            });
        }

        function generateSelector(el) {
            if (el.id) return '#' + el.id;
            // Try data-testid
            if (el.dataset.testid) return `[data-testid="${el.dataset.testid}"]`;
            // Build path
            const parts = [];
            let current = el;
            while (current && current !== document.body) {
                let part = current.tagName.toLowerCase();
                if (current.id) { parts.unshift('#' + current.id); break; }
                if (current.className && typeof current.className === 'string') {
                    const cls = current.className.split(' ').filter(c => c && !c.startsWith('svelte-')).slice(0, 2).join('.');
                    if (cls) part += '.' + cls;
                }
                const siblings = current.parentElement?.children;
                if (siblings?.length > 1) {
                    const index = Array.from(siblings).indexOf(current);
                    part += ':nth-child(' + (index + 1) + ')';
                }
                parts.unshift(part);
                current = current.parentElement;
            }
            return parts.join(' > ');
        }

        return interactive;
    });

    // 2. Categorize elements by interaction type
    const forms = elements.filter(e => ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.tag));
    const buttons = elements.filter(e => e.tag === 'BUTTON' || e.type === 'button');
    const links = elements.filter(e => e.tag === 'A' && e.attributes.href);
    const toggles = elements.filter(e => e.attributes.ariaExpanded !== null || e.attributes.dataToggle);
    const others = elements.filter(e => !forms.includes(e) && !buttons.includes(e) && !links.includes(e) && !toggles.includes(e));

    let interactionCount = 0;

    // 3. Fill all forms
    for (const form of forms) {
        if (interactionCount >= maxInteractions) break;
        try {
            await fillFormElement(page, form);
            interactionCount++;
            interactedElements.add(form.id);
        } catch { }
    }

    // 4. Click all toggles and capture state changes
    for (const toggle of toggles) {
        if (interactionCount >= maxInteractions) break;
        try {
            const beforeHTML = await page.evaluate(() => document.body.innerHTML.length);
            await page.click(toggle.selector).catch(() => { });
            await new Promise(r => setTimeout(r, 500));
            const afterHTML = await page.evaluate(() => document.body.innerHTML.length);

            if (Math.abs(afterHTML - beforeHTML) > 10) {
                // State changed — capture it
                capturedStates.push({
                    trigger: toggle.id,
                    selector: toggle.selector,
                    type: 'toggle',
                    domDelta: afterHTML - beforeHTML,
                    newElements: await captureNewElements(page),
                });
            }

            // Toggle back
            await page.click(toggle.selector).catch(() => { });
            await new Promise(r => setTimeout(r, 300));
            interactionCount++;
            interactedElements.add(toggle.id);
        } catch { }
    }

    // 5. Click buttons and capture modals/dropdowns
    for (const btn of buttons) {
        if (interactionCount >= maxInteractions) break;
        if (btn.attributes.disabled) continue;
        try {
            const beforeModals = await page.evaluate(() =>
                document.querySelectorAll('[role="dialog"], .modal, .popup, .overlay, [class*="modal"], [class*="dialog"]').length
            );

            await page.click(btn.selector).catch(() => { });
            await new Promise(r => setTimeout(r, 800));

            const afterModals = await page.evaluate(() =>
                document.querySelectorAll('[role="dialog"], .modal, .popup, .overlay, [class*="modal"], [class*="dialog"]').length
            );

            if (afterModals > beforeModals) {
                // Modal appeared
                const modalHTML = await page.evaluate(() => {
                    const modal = document.querySelector('[role="dialog"]:last-of-type, .modal:last-of-type, [class*="modal"]:last-of-type');
                    return modal ? modal.outerHTML.substring(0, 3000) : '';
                });
                capturedStates.push({
                    trigger: btn.id,
                    selector: btn.selector,
                    type: 'modal',
                    html: modalHTML,
                });

                // Close modal
                await page.evaluate(() => {
                    const close = document.querySelector('[role="dialog"] button[aria-label*="close"], .modal .close, .modal-close, [class*="modal"] button:first-of-type');
                    if (close) close.click();
                });
                await new Promise(r => setTimeout(r, 500));
            }

            interactionCount++;
            interactedElements.add(btn.id);
        } catch { }
    }

    // 6. Hover states
    const hoverTargets = elements.slice(0, 30);
    for (const el of hoverTargets) {
        if (interactionCount >= maxInteractions) break;
        try {
            await page.hover(el.selector).catch(() => { });
            await new Promise(r => setTimeout(r, 200));

            const hasTooltip = await page.evaluate(() =>
                !!document.querySelector('[role="tooltip"], .tooltip, [class*="tooltip"]')
            );

            if (hasTooltip) {
                capturedStates.push({
                    trigger: el.id,
                    selector: el.selector,
                    type: 'hover-tooltip',
                });
            }
            interactionCount++;
        } catch { }
    }

    // 7. Scroll-triggered states
    const scrollStates = await captureScrollStates(page);
    capturedStates.push(...scrollStates);

    return {
        totalElements: elements.length,
        forms: forms.length,
        buttons: buttons.length,
        links: links.length,
        toggles: toggles.length,
        interacted: interactedElements.size,
        statesDiscovered: capturedStates.length,
        states: capturedStates,
        elements,
    };
}

async function fillFormElement(page, formEl) {
    const { selector, attributes } = formEl;

    switch (attributes.inputType) {
        case 'email':
            await page.type(selector, 'test@example.com', { delay: 30 });
            break;
        case 'password':
            await page.type(selector, 'TestPass123!', { delay: 30 });
            break;
        case 'tel':
            await page.type(selector, '010-1234-5678', { delay: 30 });
            break;
        case 'number':
            await page.type(selector, '42', { delay: 30 });
            break;
        case 'url':
            await page.type(selector, 'https://example.com', { delay: 30 });
            break;
        case 'date':
            await page.type(selector, '2025-01-15', { delay: 30 });
            break;
        case 'checkbox':
        case 'radio':
            await page.click(selector);
            break;
        case 'search':
        case 'text':
        default:
            if (formEl.tag === 'SELECT') {
                await page.select(selector, '').catch(() => { });
            } else if (formEl.tag === 'TEXTAREA') {
                await page.type(selector, 'This is a test message for the design clone.', { delay: 20 });
            } else {
                await page.type(selector, 'Test User', { delay: 30 });
            }
    }
}

async function captureNewElements(page) {
    return page.evaluate(() => {
        const newEls = [];
        document.querySelectorAll('[aria-expanded="true"] + *, [data-state="open"], .show, .active, .visible, .expanded').forEach(el => {
            newEls.push({
                tag: el.tagName,
                classes: el.className?.toString().substring(0, 100),
                text: (el.textContent || '').trim().substring(0, 100),
            });
        });
        return newEls.slice(0, 10);
    });
}

async function captureScrollStates(page) {
    const states = [];
    const totalHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = 1080;
    const steps = Math.min(Math.ceil(totalHeight / viewportHeight), 10);

    for (let i = 0; i < steps; i++) {
        const scrollY = i * viewportHeight;
        await page.evaluate((y) => window.scrollTo(0, y), scrollY);
        await new Promise(r => setTimeout(r, 800));

        // Check for lazy-loaded content, infinite scroll, etc.
        const newContent = await page.evaluate((y) => {
            const elems = document.querySelectorAll('[data-aos], [class*="animate"], .lazy-loaded, [data-scroll]');
            const visible = [];
            elems.forEach(el => {
                const rect = el.getBoundingClientRect();
                if (rect.top > 0 && rect.top < window.innerHeight) {
                    visible.push({
                        tag: el.tagName,
                        classes: el.className?.toString().substring(0, 50),
                        animation: el.getAttribute('data-aos') || el.style.animation || '',
                    });
                }
            });
            return visible;
        }, scrollY);

        if (newContent.length > 0) {
            states.push({
                type: 'scroll-reveal',
                scrollY,
                newContent,
            });
        }
    }

    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 500));

    return states;
}

/**
 * Generate comprehensive interaction JS code from scan results
 */
export function generateDeepInteractionCode(scanResult) {
    if (!scanResult?.states?.length && !scanResult?.elements?.length) return null;

    let code = `/**\n * Deep Interaction Simulator — Design-DNA v10.0\n * Elements: ${scanResult.totalElements}\n * States: ${scanResult.statesDiscovered}\n */\n\n`;

    // Form auto-fill (for demo purposes)
    code += `// ═══ Form Auto-fill ═══\n`;
    code += `document.querySelectorAll('form').forEach(form => {\n`;
    code += `    form.addEventListener('submit', e => {\n`;
    code += `        e.preventDefault();\n`;
    code += `        const data = Object.fromEntries(new FormData(form));\n`;
    code += `        console.log('Form submitted:', data);\n`;
    code += `        const btn = form.querySelector('button[type="submit"]');\n`;
    code += `        if (btn) { btn.textContent = 'Submitted'; btn.disabled = true; }\n`;
    code += `    });\n`;
    code += `});\n\n`;

    // Modal state management from captured states
    const modals = scanResult.states.filter(s => s.type === 'modal');
    if (modals.length > 0) {
        code += `// ═══ Modal Management (${modals.length} modals) ═══\n`;
        for (const modal of modals) {
            const safeHTML = (modal.html || '<div style="background:white;padding:32px;border-radius:12px"><h3>Modal</h3><button onclick="this.parentElement.parentElement.remove()">Close</button></div>').replace(/`/g, "'").replace(/\\/g, '\\\\');
            code += `// Triggered by: ${modal.trigger}\n`;
            const safeSelector = modal.selector.replace(/'/g, "\\'");
            code += `document.querySelector('${safeSelector}')?.addEventListener('click', () => {\n`;
            code += `    const overlay = document.createElement('div');\n`;
            code += `    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center';\n`;
            code += `    overlay.innerHTML = '${safeHTML}';\n`;
            code += `    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });\n`;
            code += `    document.body.appendChild(overlay);\n`;
            code += `});\n\n`;
        }
    }

    // Scroll reveal animations
    const scrollStates = scanResult.states.filter(s => s.type === 'scroll-reveal');
    if (scrollStates.length > 0) {
        code += `// ═══ Scroll Reveal (${scrollStates.length} triggers) ═══\n`;
        code += `const observer = new IntersectionObserver((entries) => {\n`;
        code += `    entries.forEach(entry => {\n`;
        code += `        if (entry.isIntersecting) {\n`;
        code += `            entry.target.style.opacity = '1';\n`;
        code += `            entry.target.style.transform = 'translateY(0)';\n`;
        code += `        }\n`;
        code += `    });\n`;
        code += `}, { threshold: 0.1 });\n`;
        code += `document.querySelectorAll('[data-aos], [class*="animate"]').forEach(el => {\n`;
        code += `    el.style.opacity = '0'; el.style.transform = 'translateY(20px)';\n`;
        code += `    el.style.transition = 'opacity 0.6s, transform 0.6s';\n`;
        code += `    observer.observe(el);\n`;
        code += `});\n\n`;
    }

    return code;
}
