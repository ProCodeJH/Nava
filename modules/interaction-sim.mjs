/**
 * v5.0 Module: Interaction Simulator — Dynamic UI capture
 *
 * Simulates user interactions and captures resulting UI changes:
 *  - Button clicks → modals, dialogs, toasts
 *  - Tab panels → all tab content
 *  - Accordions → expanded states
 *  - Dropdowns → menu items
 *  - Hover states → visual changes
 *  - Before/after DOM snapshots
 */

import fs from 'fs/promises';
import path from 'path';

export async function simulateInteractions(page, outputDir, options = {}) {
    const {
        maxClicks = 15,
        captureScreenshots = true,
    } = options;

    const simDir = outputDir ? path.join(outputDir, 'interaction-captures') : null;
    if (simDir) await fs.mkdir(simDir, { recursive: true });

    const result = {
        modals: [],
        tabs: [],
        accordions: [],
        dropdowns: [],
        tooltips: [],
        toasts: [],
        hoverEffects: [],
        totalInteractions: 0,
    };

    // ═══ 1. Click Buttons & Capture Modals ═══
    const clickableElements = await page.evaluate(() => {
        const elements = [];
        const seen = new Set();

        // Buttons and clickable elements
        document.querySelectorAll('button, [role="button"], a[data-modal], [data-toggle="modal"], [aria-haspopup="dialog"]').forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.width < 5 || rect.height < 5) return;
            if (rect.bottom < 0 || rect.top > window.innerHeight) return;

            const text = el.textContent?.trim()?.substring(0, 30) || el.getAttribute('aria-label') || '';
            const key = text + rect.x + rect.y;
            if (seen.has(key)) return;
            seen.add(key);

            // Skip navigation links, submit buttons, external links
            if (el.tagName === 'A' && el.href && !el.getAttribute('data-modal') && !el.getAttribute('data-toggle')) return;
            if (el.type === 'submit') return;

            elements.push({
                selector: getUniqueSelector(el),
                text,
                tag: el.tagName,
                type: el.getAttribute('type') || null,
                ariaLabel: el.getAttribute('aria-label'),
                position: { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) },
            });
        });

        function getUniqueSelector(el) {
            if (el.id) return '#' + el.id;
            const path = [];
            while (el && el !== document.body) {
                let selector = el.tagName.toLowerCase();
                if (el.id) { path.unshift('#' + el.id); break; }
                const parent = el.parentElement;
                if (parent) {
                    const siblings = Array.from(parent.children).filter(c => c.tagName === el.tagName);
                    if (siblings.length > 1) {
                        selector += ':nth-child(' + (Array.from(parent.children).indexOf(el) + 1) + ')';
                    }
                }
                path.unshift(selector);
                el = parent;
            }
            return path.join(' > ');
        }

        return elements.slice(0, 30);
    });

    // Click each and check for new overlays/modals
    let clickCount = 0;
    for (const elem of clickableElements) {
        if (clickCount >= maxClicks) break;

        try {
            // Get pre-click state
            const preState = await page.evaluate(() => {
                return {
                    dialogs: document.querySelectorAll('[role="dialog"], dialog[open], .modal.show, .modal.active, [data-state="open"]').length,
                    overlays: document.querySelectorAll('.overlay, .backdrop, [class*="overlay"], [class*="backdrop"]').length,
                    toasts: document.querySelectorAll('[role="alert"], .toast, [class*="toast"], [class*="notification"]').length,
                };
            });

            // Click
            await page.click(elem.selector, { timeout: 3000 }).catch(() => { });
            await new Promise(r => setTimeout(r, 500));

            // Check post-click state
            const postState = await page.evaluate(() => {
                const newElement = document.querySelector('[role="dialog"]:not([aria-hidden="true"]), dialog[open], .modal.show, .modal.active, [data-state="open"]');
                return {
                    dialogs: document.querySelectorAll('[role="dialog"], dialog[open], .modal.show, .modal.active, [data-state="open"]').length,
                    overlays: document.querySelectorAll('.overlay, .backdrop, [class*="overlay"], [class*="backdrop"]').length,
                    toasts: document.querySelectorAll('[role="alert"], .toast, [class*="toast"], [class*="notification"]').length,
                    newDialogContent: newElement ? {
                        title: newElement.querySelector('h1, h2, h3, [class*="title"]')?.textContent?.trim()?.substring(0, 60),
                        content: newElement.textContent?.trim()?.substring(0, 200),
                        hasCloseButton: !!newElement.querySelector('button[aria-label="Close"], .close, [data-dismiss]'),
                        size: {
                            width: Math.round(newElement.getBoundingClientRect().width),
                            height: Math.round(newElement.getBoundingClientRect().height),
                        },
                    } : null,
                };
            });

            if (postState.dialogs > preState.dialogs || postState.overlays > preState.overlays) {
                result.modals.push({
                    trigger: elem.text || elem.selector,
                    dialog: postState.newDialogContent,
                });

                // Screenshot
                if (captureScreenshots && simDir) {
                    const screenshotName = `modal-${clickCount}.png`;
                    await page.screenshot({ path: path.join(simDir, screenshotName) });
                    result.modals[result.modals.length - 1].screenshot = screenshotName;
                }

                // Close modal
                await page.evaluate(() => {
                    const closeBtn = document.querySelector('[role="dialog"] button[aria-label="Close"], dialog[open] button[aria-label="Close"], .modal.show .close, [data-dismiss="modal"]');
                    if (closeBtn) closeBtn.click();
                    // Press Escape
                    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }));
                });
                await new Promise(r => setTimeout(r, 300));
            }

            if (postState.toasts > preState.toasts) {
                result.toasts.push({
                    trigger: elem.text || elem.selector,
                    count: postState.toasts - preState.toasts,
                });
            }

            clickCount++;
            result.totalInteractions++;
        } catch (e) { /* skip */ }
    }

    // ═══ 2. Discover & Cycle Through Tabs ═══
    const tabData = await page.evaluate(() => {
        const tabSets = [];

        document.querySelectorAll('[role="tablist"]').forEach(tablist => {
            const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
            if (tabs.length < 2) return;

            tabSets.push({
                selector: tablist.id ? '#' + tablist.id : null,
                tabs: tabs.map((tab, i) => ({
                    text: tab.textContent?.trim()?.substring(0, 40),
                    selector: tab.id ? '#' + tab.id : `[role="tablist"] [role="tab"]:nth-child(${i + 1})`,
                    selected: tab.getAttribute('aria-selected') === 'true',
                    panelId: tab.getAttribute('aria-controls'),
                })),
            });
        });

        return tabSets;
    });

    for (const tabSet of tabData) {
        const tabContent = [];
        for (const tab of tabSet.tabs) {
            try {
                await page.click(tab.selector, { timeout: 2000 }).catch(() => { });
                await new Promise(r => setTimeout(r, 300));

                const panelContent = await page.evaluate((panelId) => {
                    const panel = panelId ? document.getElementById(panelId) :
                        document.querySelector('[role="tabpanel"]:not([hidden])');
                    if (!panel) return null;
                    return {
                        text: panel.textContent?.trim()?.substring(0, 200),
                        elementCount: panel.querySelectorAll('*').length,
                        hasImages: panel.querySelectorAll('img').length,
                    };
                }, tab.panelId);

                tabContent.push({
                    tabName: tab.text,
                    panelContent,
                });
            } catch (e) { }
        }
        result.tabs.push({ tabs: tabSet.tabs.map(t => t.text), content: tabContent });
    }

    // ═══ 3. Expand Accordions ═══
    const accordionData = await page.evaluate(() => {
        const items = [];

        // <details> elements
        document.querySelectorAll('details').forEach((d, i) => {
            items.push({
                type: 'details',
                summary: d.querySelector('summary')?.textContent?.trim()?.substring(0, 60),
                selector: d.id ? '#' + d.id : `details:nth-of-type(${i + 1})`,
                isOpen: d.open,
            });
        });

        // aria-expanded
        document.querySelectorAll('[aria-expanded]').forEach((el, i) => {
            if (el.getAttribute('role') === 'tab') return; // Skip tabs
            items.push({
                type: 'aria-expanded',
                text: el.textContent?.trim()?.substring(0, 60),
                selector: el.id ? '#' + el.id : `[aria-expanded]:nth-of-type(${i + 1})`,
                isExpanded: el.getAttribute('aria-expanded') === 'true',
                controls: el.getAttribute('aria-controls'),
            });
        });

        return items;
    });

    for (const item of accordionData.slice(0, 10)) {
        try {
            if (item.type === 'details' && !item.isOpen) {
                await page.click(item.selector + ' summary', { timeout: 2000 }).catch(() => { });
            } else if (item.type === 'aria-expanded' && !item.isExpanded) {
                await page.click(item.selector, { timeout: 2000 }).catch(() => { });
            }
            await new Promise(r => setTimeout(r, 300));

            const content = await page.evaluate((controlsId) => {
                const panel = controlsId ? document.getElementById(controlsId) : null;
                return panel ? panel.textContent?.trim()?.substring(0, 200) : null;
            }, item.controls);

            result.accordions.push({
                title: item.summary || item.text,
                content,
                type: item.type,
            });
        } catch (e) { }
    }

    // ═══ 4. Open Dropdowns ═══
    const dropdownTriggers = await page.evaluate(() => {
        const triggers = [];
        document.querySelectorAll('[aria-haspopup="true"], [aria-haspopup="menu"], [aria-haspopup="listbox"], [data-toggle="dropdown"]').forEach((el, i) => {
            const rect = el.getBoundingClientRect();
            if (rect.width < 5) return;
            triggers.push({
                text: el.textContent?.trim()?.substring(0, 40),
                selector: el.id ? '#' + el.id : `[aria-haspopup]:nth-of-type(${i + 1})`,
            });
        });
        return triggers.slice(0, 10);
    });

    for (const trigger of dropdownTriggers) {
        try {
            await page.click(trigger.selector, { timeout: 2000 }).catch(() => { });
            await new Promise(r => setTimeout(r, 300));

            const menuItems = await page.evaluate(() => {
                const menu = document.querySelector('[role="menu"]:not([hidden]), [role="listbox"]:not([hidden]), .dropdown-menu.show');
                if (!menu) return null;
                return {
                    items: Array.from(menu.querySelectorAll('[role="menuitem"], [role="option"], .dropdown-item, li'))
                        .map(item => item.textContent?.trim()?.substring(0, 40))
                        .filter(Boolean)
                        .slice(0, 15),
                };
            });

            if (menuItems) {
                result.dropdowns.push({
                    trigger: trigger.text,
                    items: menuItems.items,
                });
            }

            // Close dropdown
            await page.keyboard.press('Escape');
            await new Promise(r => setTimeout(r, 200));
        } catch (e) { }
    }

    result.totalInteractions += tabData.length + accordionData.length + dropdownTriggers.length;

    return result;
}
