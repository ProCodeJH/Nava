/**
 * v5.0 Module: Runtime Hook — JS Proxy Injection
 *
 * Injects proxies BEFORE page load to intercept animation library calls:
 *  - GSAP (gsap.to, gsap.from, gsap.fromTo, gsap.timeline, ScrollTrigger)
 *  - Framer Motion (React fiber tree walking for motion.* props)
 *  - anime.js (anime() call interception)
 *  - requestAnimationFrame tracking
 *  - IntersectionObserver usage
 *  - CSS scroll-driven animations
 */

/**
 * Returns the JS string to inject via page.evaluateOnNewDocument()
 * This MUST be called before page.goto()
 */
export function getInjectionScript() {
    return `
    (function() {
        // ═══════════════════════════════════════
        // GLOBAL CAPTURE STORE
        // ═══════════════════════════════════════
        window.__DNA_HOOKS__ = {
            gsap: [],
            gsapTimelines: [],
            scrollTriggers: [],
            animeInstances: [],
            rafCallbacks: 0,
            intersectionObservers: [],
            framerMotionProps: [],
            customAnimations: [],
            scrollListeners: [],
            resizeObservers: [],
            mutationObservers: [],
        };

        // ═══════════════════════════════════════
        // 1. GSAP PROXY
        // ═══════════════════════════════════════
        const _origDefineProperty = Object.defineProperty;
        const _gsapMethods = ['to', 'from', 'fromTo', 'set'];

        function wrapGSAP(gsapObj) {
            if (gsapObj.__dna_hooked__) return;
            gsapObj.__dna_hooked__ = true;

            _gsapMethods.forEach(method => {
                const orig = gsapObj[method];
                if (typeof orig !== 'function') return;

                gsapObj[method] = function(...args) {
                    try {
                        const entry = {
                            method,
                            target: describeTarget(args[0]),
                            vars: sanitizeVars(method === 'fromTo' ? args[2] : args[1]),
                            fromVars: method === 'fromTo' ? sanitizeVars(args[1]) : null,
                            timestamp: performance.now(),
                        };
                        window.__DNA_HOOKS__.gsap.push(entry);
                    } catch(e) {}
                    return orig.apply(this, args);
                };
            });

            // Timeline
            const origTimeline = gsapObj.timeline;
            if (typeof origTimeline === 'function') {
                gsapObj.timeline = function(vars) {
                    const tl = origTimeline.call(this, vars);
                    try {
                        window.__DNA_HOOKS__.gsapTimelines.push({
                            vars: sanitizeVars(vars),
                            timestamp: performance.now(),
                        });
                        // Wrap timeline methods
                        ['to', 'from', 'fromTo', 'set'].forEach(m => {
                            const origM = tl[m];
                            if (typeof origM !== 'function') return;
                            tl[m] = function(...a) {
                                try {
                                    window.__DNA_HOOKS__.gsap.push({
                                        method: 'timeline.' + m,
                                        target: describeTarget(a[0]),
                                        vars: sanitizeVars(m === 'fromTo' ? a[2] : a[1]),
                                        fromVars: m === 'fromTo' ? sanitizeVars(a[1]) : null,
                                        timestamp: performance.now(),
                                    });
                                } catch(e) {}
                                return origM.apply(this, a);
                            };
                        });
                    } catch(e) {}
                    return tl;
                };
            }
        }

        // Hook ScrollTrigger.create
        function wrapScrollTrigger(ST) {
            if (ST.__dna_hooked__) return;
            ST.__dna_hooked__ = true;

            const origCreate = ST.create;
            if (typeof origCreate === 'function') {
                ST.create = function(vars) {
                    try {
                        window.__DNA_HOOKS__.scrollTriggers.push({
                            trigger: describeTarget(vars?.trigger),
                            start: vars?.start,
                            end: vars?.end,
                            scrub: vars?.scrub,
                            pin: !!vars?.pin,
                            snap: vars?.snap,
                            markers: !!vars?.markers,
                            toggleActions: vars?.toggleActions,
                            toggleClass: vars?.toggleClass,
                            onEnter: !!vars?.onEnter,
                            onLeave: !!vars?.onLeave,
                            timestamp: performance.now(),
                        });
                    } catch(e) {}
                    return origCreate.call(this, vars);
                };
            }
        }

        // Watch for gsap/ScrollTrigger to appear on window
        let gsapCheckInterval = setInterval(() => {
            if (window.gsap && !window.gsap.__dna_hooked__) {
                wrapGSAP(window.gsap);
            }
            if (window.ScrollTrigger && !window.ScrollTrigger.__dna_hooked__) {
                wrapScrollTrigger(window.ScrollTrigger);
            }
        }, 50);
        setTimeout(() => clearInterval(gsapCheckInterval), 15000);

        // ═══════════════════════════════════════
        // 2. ANIME.JS PROXY
        // ═══════════════════════════════════════
        let animeCheckInterval = setInterval(() => {
            if (window.anime && !window.anime.__dna_hooked__) {
                window.anime.__dna_hooked__ = true;
                const origAnime = window.anime;
                window.anime = function(params) {
                    try {
                        window.__DNA_HOOKS__.animeInstances.push({
                            targets: describeTarget(params?.targets),
                            properties: Object.keys(params || {}).filter(k =>
                                !['targets', 'duration', 'delay', 'easing', 'loop', 'direction', 'autoplay', 'complete', 'begin', 'update'].includes(k)
                            ).reduce((obj, k) => { obj[k] = params[k]; return obj; }, {}),
                            duration: params?.duration,
                            delay: params?.delay,
                            easing: params?.easing,
                            loop: params?.loop,
                            direction: params?.direction,
                            timestamp: performance.now(),
                        });
                    } catch(e) {}
                    return origAnime(params);
                };
                Object.assign(window.anime, origAnime);
            }
        }, 50);
        setTimeout(() => clearInterval(animeCheckInterval), 15000);

        // ═══════════════════════════════════════
        // 3. requestAnimationFrame COUNTER
        // ═══════════════════════════════════════
        const origRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = function(cb) {
            window.__DNA_HOOKS__.rafCallbacks++;
            return origRAF.call(window, cb);
        };

        // ═══════════════════════════════════════
        // 4. IntersectionObserver PROXY
        // ═══════════════════════════════════════
        const OrigIO = window.IntersectionObserver;
        window.IntersectionObserver = function(callback, options) {
            const io = new OrigIO(callback, options);
            try {
                window.__DNA_HOOKS__.intersectionObservers.push({
                    root: options?.root ? describeTarget(options.root) : 'viewport',
                    rootMargin: options?.rootMargin || '0px',
                    threshold: options?.threshold,
                    timestamp: performance.now(),
                });
            } catch(e) {}

            // Wrap observe to capture targets
            const origObserve = io.observe.bind(io);
            io.observe = function(target) {
                try {
                    const last = window.__DNA_HOOKS__.intersectionObservers[window.__DNA_HOOKS__.intersectionObservers.length - 1];
                    if (last && !last.targets) last.targets = [];
                    if (last) last.targets.push(describeTarget(target));
                } catch(e) {}
                return origObserve(target);
            };
            return io;
        };
        window.IntersectionObserver.prototype = OrigIO.prototype;

        // ═══════════════════════════════════════
        // 5. SCROLL EVENT LISTENERS
        // ═══════════════════════════════════════
        const origAddEventListener = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            if (type === 'scroll' || type === 'wheel') {
                try {
                    window.__DNA_HOOKS__.scrollListeners.push({
                        target: this === window ? 'window' : this === document ? 'document' : describeTarget(this),
                        type,
                        passive: typeof options === 'object' ? !!options.passive : false,
                        timestamp: performance.now(),
                    });
                } catch(e) {}
            }
            return origAddEventListener.call(this, type, listener, options);
        };

        // ═══════════════════════════════════════
        // UTILITIES
        // ═══════════════════════════════════════
        function describeTarget(t) {
            if (!t) return null;
            if (typeof t === 'string') return t;
            if (t instanceof Element) {
                const id = t.id ? '#' + t.id : '';
                const cls = t.className?.toString?.()?.split(' ')?.filter(c => c)?.slice(0, 2)?.map(c => '.' + c)?.join('') || '';
                const framer = t.getAttribute?.('data-framer-name') || '';
                return t.tagName + id + cls + (framer ? '[' + framer + ']' : '');
            }
            if (Array.isArray(t)) return t.map(describeTarget).join(', ');
            if (t instanceof NodeList || t instanceof HTMLCollection) return Array.from(t).map(describeTarget).join(', ');
            return String(t).substring(0, 100);
        }

        function sanitizeVars(vars) {
            if (!vars || typeof vars !== 'object') return null;
            const clean = {};
            for (const [k, v] of Object.entries(vars)) {
                if (typeof v === 'function') {
                    clean[k] = '[Function]';
                } else if (v instanceof Element) {
                    clean[k] = describeTarget(v);
                } else if (typeof v === 'object' && v !== null) {
                    try { clean[k] = JSON.parse(JSON.stringify(v)); } catch(e) { clean[k] = '[Object]'; }
                } else {
                    clean[k] = v;
                }
            }
            return clean;
        }
    })();
    `;
}

/**
 * Extract Framer Motion props from React fiber tree (post-render)
 */
export function getFramerExtractionScript() {
    return `
    (function() {
        const results = [];

        // Walk React fiber tree
        function walkFiber(fiber, depth) {
            if (!fiber || depth > 50) return;

            try {
                // Look for Framer Motion components
                const props = fiber.memoizedProps || fiber.pendingProps || {};
                const type = fiber.type;

                if (type && (
                    type.displayName?.includes('motion') ||
                    type.render?.displayName?.includes('motion') ||
                    props.initial || props.animate || props.exit ||
                    props.whileInView || props.whileHover || props.whileTap ||
                    props.variants || props.transition ||
                    props.layout || props.layoutId
                )) {
                    const element = fiber.stateNode;
                    let rect = null;
                    if (element && element.getBoundingClientRect) {
                        const r = element.getBoundingClientRect();
                        rect = { x: Math.round(r.x), y: Math.round(r.y + window.scrollY), w: Math.round(r.width), h: Math.round(r.height) };
                    }

                    results.push({
                        component: type.displayName || type.render?.displayName || type.name || 'motion.*',
                        tag: typeof type === 'string' ? type : (element?.tagName || '?'),
                        initial: serializeMotionProp(props.initial),
                        animate: serializeMotionProp(props.animate),
                        exit: serializeMotionProp(props.exit),
                        whileInView: serializeMotionProp(props.whileInView),
                        whileHover: serializeMotionProp(props.whileHover),
                        whileTap: serializeMotionProp(props.whileTap),
                        variants: props.variants ? Object.keys(props.variants).reduce((acc, k) => {
                            acc[k] = serializeMotionProp(props.variants[k]);
                            return acc;
                        }, {}) : null,
                        transition: serializeMotionProp(props.transition),
                        layout: props.layout || null,
                        layoutId: props.layoutId || null,
                        viewport: serializeMotionProp(props.viewport),
                        rect,
                        framerName: element?.getAttribute?.('data-framer-name') || null,
                    });
                }
            } catch(e) {}

            // Walk children
            try { if (fiber.child) walkFiber(fiber.child, depth + 1); } catch(e) {}
            try { if (fiber.sibling) walkFiber(fiber.sibling, depth + 1); } catch(e) {}
        }

        function serializeMotionProp(prop) {
            if (!prop) return null;
            if (typeof prop === 'string') return prop;
            if (typeof prop === 'number') return prop;
            if (typeof prop === 'boolean') return prop;
            if (typeof prop === 'function') return '[Function]';
            try { return JSON.parse(JSON.stringify(prop)); } catch(e) { return '[Complex]'; }
        }

        // Find React root(s)
        const roots = document.querySelectorAll('[data-reactroot], #__next, #root, #app, #__nuxt');
        roots.forEach(root => {
            // Access React fiber
            const key = Object.keys(root).find(k => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'));
            if (key) {
                const fiber = root[key];
                walkFiber(fiber, 0);
            }
        });

        return results;
    })();
    `;
}

/**
 * Main extraction function — call after page has loaded
 */
export async function extractRuntimeData(page) {
    // 1. Get hooked data
    const hookData = await page.evaluate(() => {
        const h = window.__DNA_HOOKS__;
        if (!h) return null;
        return {
            gsap: h.gsap.slice(0, 200),
            gsapTimelines: h.gsapTimelines.slice(0, 50),
            scrollTriggers: h.scrollTriggers.slice(0, 100),
            animeInstances: h.animeInstances.slice(0, 100),
            rafCallbacks: h.rafCallbacks,
            intersectionObservers: h.intersectionObservers.slice(0, 50),
            scrollListeners: h.scrollListeners.slice(0, 50),
        };
    });

    // 2. Get Framer Motion component props
    let framerMotionProps = [];
    try {
        framerMotionProps = await page.evaluate(getFramerExtractionScript());
    } catch (e) { /* not a React app */ }

    // 3. Get runtime ScrollTrigger state (if GSAP loaded after hooks)
    const liveScrollTriggers = await page.evaluate(() => {
        if (!window.ScrollTrigger) return [];
        try {
            return window.ScrollTrigger.getAll().map(st => ({
                trigger: (() => {
                    const t = st.trigger;
                    if (!t) return null;
                    return t.tagName + (t.id ? '#' + t.id : '') + (t.className ? '.' + t.className.toString().split(' ')[0] : '');
                })(),
                start: st.start,
                end: st.end,
                pin: !!st.pin,
                scrub: st.vars?.scrub,
                snap: st.vars?.snap,
                toggleActions: st.vars?.toggleActions,
                progress: st.progress,
            }));
        } catch (e) { return []; }
    });

    return {
        gsapCalls: hookData?.gsap || [],
        gsapTimelines: hookData?.gsapTimelines || [],
        scrollTriggers: [
            ...(hookData?.scrollTriggers || []),
            ...liveScrollTriggers,
        ],
        animeInstances: hookData?.animeInstances || [],
        rafCallbackCount: hookData?.rafCallbacks || 0,
        intersectionObservers: hookData?.intersectionObservers || [],
        scrollListeners: hookData?.scrollListeners || [],
        framerMotionProps,
    };
}

/**
 * Inject hooks BEFORE page.goto() — call this first!
 */
export async function injectRuntimeHooks(page) {
    await page.evaluateOnNewDocument(getInjectionScript());
}
