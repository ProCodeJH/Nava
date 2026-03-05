/**
 * v5.0 Module: Webflow IX2 Interaction Extractor
 *
 * Extracts:
 *  - Webflow IX2 interaction definitions from __WEBFLOW_DATA__
 *  - Trigger types: scroll-into-view, click, hover, page-load, page-scroll
 *  - Animation action steps with property/value/duration/easing
 *  - Webflow CMS collection structures
 *  - Webflow custom attributes (wf-*, w-*, data-w-*)
 *  - Webflow component classes and styles
 */

export async function extractWebflowIX2(page) {
    return page.evaluate(() => {
        const result = {
            isWebflow: false,
            ix2Data: null,
            interactions: [],
            triggers: [],
            animations: [],
            cmsCollections: [],
            customAttributes: [],
            webflowClasses: [],
            navbars: [],
            sliders: [],
            tabs: [],
            forms: [],
        };

        // ═══ 1. Detect Webflow ═══
        const isWebflow = !!(
            document.querySelector('html[data-wf-site]') ||
            document.querySelector('html[data-wf-page]') ||
            document.querySelector('[class*="w-"]') ||
            window.__WEBFLOW_DATA__ ||
            document.querySelector('script[src*="webflow"]')
        );
        result.isWebflow = isWebflow;

        if (!isWebflow) return result;

        // ═══ 2. Extract IX2 Data ═══
        try {
            // Try require-based access
            if (typeof Webflow !== 'undefined' && Webflow.require) {
                const ix2 = Webflow.require('ix2');
                if (ix2) {
                    const store = ix2.store?.getState?.();
                    if (store) {
                        const { events, actionLists } = store.ixData || {};

                        // Parse events (triggers)
                        if (events) {
                            for (const [id, evt] of Object.entries(events)) {
                                result.triggers.push({
                                    id: id.substring(0, 30),
                                    name: evt.name || '',
                                    triggerType: evt.eventTypeId || '',
                                    target: evt.target?.selector || evt.target?.id || '',
                                    config: {
                                        scrollOffsetStart: evt.config?.scrollOffsetStart,
                                        scrollOffsetEnd: evt.config?.scrollOffsetEnd,
                                        continuousParameterGroupId: evt.config?.continuousParameterGroupId,
                                    },
                                    actionListId: evt.action?.actionListId || '',
                                });
                            }
                        }

                        // Parse action lists (animations)
                        if (actionLists) {
                            for (const [id, list] of Object.entries(actionLists)) {
                                const steps = [];
                                if (list.actionItemGroups) {
                                    list.actionItemGroups.forEach(group => {
                                        group.actionItems?.forEach(item => {
                                            steps.push({
                                                actionTypeId: item.actionTypeId || '',
                                                target: item.config?.target?.selector || item.config?.target?.id || '',
                                                property: item.config?.value?.property || '',
                                                value: item.config?.value?.value,
                                                unit: item.config?.value?.unit || '',
                                                duration: item.config?.duration,
                                                delay: item.config?.delay,
                                                easing: item.config?.easing,
                                            });
                                        });
                                    });
                                }
                                result.animations.push({
                                    id: id.substring(0, 30),
                                    name: list.name || '',
                                    useFirstGroupAsInitialState: list.useFirstGroupAsInitialState || false,
                                    steps,
                                });
                            }
                        }
                    }
                }
            }
        } catch (e) { }

        // ═══ 3. Fallback: Parse from data attributes ═══
        if (result.triggers.length === 0) {
            document.querySelectorAll('[data-ix]').forEach(el => {
                result.triggers.push({
                    triggerType: 'data-ix',
                    target: el.getAttribute('data-ix'),
                    element: el.tagName + (el.className ? '.' + el.className.toString().split(' ')[0] : ''),
                });
            });

            // IX2 data attributes
            document.querySelectorAll('[data-w-id]').forEach(el => {
                const wId = el.getAttribute('data-w-id');
                result.triggers.push({
                    triggerType: 'w-id',
                    wId,
                    element: el.tagName + (el.className ? '.' + el.className.toString().split(' ')[0] : ''),
                    animationType: el.getAttribute('data-animation-type') || null,
                });
            });
        }

        // ═══ 4. Webflow CMS Collections ═══
        document.querySelectorAll('.w-dyn-list, [data-wf-collection]').forEach(el => {
            const items = el.querySelectorAll('.w-dyn-item');
            result.cmsCollections.push({
                className: el.className?.toString()?.substring(0, 80),
                itemCount: items.length,
                sampleFields: items.length > 0 ? (() => {
                    const first = items[0];
                    const fields = [];
                    first.querySelectorAll('[data-wf-binding], [data-wf-sku]').forEach(f => {
                        fields.push({
                            binding: f.getAttribute('data-wf-binding') || null,
                            tag: f.tagName,
                        });
                    });
                    return fields;
                })() : [],
            });
        });

        // ═══ 5. Webflow Components ═══
        // Navbar
        document.querySelectorAll('.w-nav').forEach(nav => {
            result.navbars.push({
                brand: nav.querySelector('.w-nav-brand')?.textContent?.trim()?.substring(0, 50),
                menuItems: Array.from(nav.querySelectorAll('.w-nav-link')).map(a => a.textContent?.trim()?.substring(0, 30)),
                hasOverlay: !!nav.querySelector('.w-nav-overlay'),
                hasButton: !!nav.querySelector('.w-nav-button'),
            });
        });

        // Sliders
        document.querySelectorAll('.w-slider').forEach(slider => {
            result.sliders.push({
                slideCount: slider.querySelectorAll('.w-slide').length,
                hasArrows: !!slider.querySelector('.w-slider-arrow-left'),
                hasDots: !!slider.querySelector('.w-slider-dot'),
                autoplay: slider.getAttribute('data-autoplay') === 'true',
                duration: slider.getAttribute('data-duration'),
            });
        });

        // Tabs
        document.querySelectorAll('.w-tabs').forEach(tab => {
            result.tabs.push({
                tabCount: tab.querySelectorAll('.w-tab-link').length,
                tabNames: Array.from(tab.querySelectorAll('.w-tab-link')).map(t => t.textContent?.trim()?.substring(0, 30)),
            });
        });

        // Forms
        document.querySelectorAll('.w-form').forEach(form => {
            result.forms.push({
                fieldCount: form.querySelectorAll('input, textarea, select').length,
                fields: Array.from(form.querySelectorAll('input, textarea, select')).map(f => ({
                    type: f.type || f.tagName.toLowerCase(),
                    name: f.name || f.id || null,
                    placeholder: f.placeholder?.substring(0, 50) || null,
                    required: f.required,
                })).slice(0, 20),
            });
        });

        // ═══ 6. Custom Attributes Summary ═══
        const attrCounts = {};
        document.querySelectorAll('*').forEach(el => {
            Array.from(el.attributes).forEach(attr => {
                if (attr.name.startsWith('data-w-') || attr.name.startsWith('data-wf-') || attr.name.startsWith('w-')) {
                    attrCounts[attr.name] = (attrCounts[attr.name] || 0) + 1;
                }
            });
        });
        result.customAttributes = Object.entries(attrCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 30)
            .map(([name, count]) => ({ name, count }));

        // ═══ 7. Webflow Style Classes ═══
        const wfClasses = new Set();
        document.querySelectorAll('[class]').forEach(el => {
            el.classList.forEach(cls => {
                if (cls.startsWith('w-') || cls.startsWith('wf-')) wfClasses.add(cls);
            });
        });
        result.webflowClasses = [...wfClasses].sort().slice(0, 100);

        return result;
    });
}
