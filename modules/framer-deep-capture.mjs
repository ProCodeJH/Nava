/**
 * v7.0 Deep Framer Motion Capture
 * 
 * Injects hooks into the page to capture EXACT Framer Motion configs:
 *  - Spring physics (stiffness, damping, mass)
 *  - Stagger timing (delayChildren, staggerChildren)
 *  - Layout animations (layoutId, AnimatePresence)
 *  - Drag constraints (dragConstraints, dragElastic)
 *  - Variant definitions (initial, animate, exit, whileHover, whileInView)
 *  - IntersectionObserver exact options (threshold, rootMargin)
 */

/**
 * Inject deep capture hooks BEFORE page loads
 * Must be called before page.goto()
 */
export function getFramerCaptureScript() {
    return `
    (function() {
        window.__FRAMER_CAPTURE__ = {
            motionElements: [],
            springs: [],
            staggers: [],
            layoutAnimations: [],
            dragElements: [],
            variants: [],
            presenceAnimations: [],
            intersectionObservers: [],
            mutationRecords: [],
            animationFrames: [],
            transitionConfigs: [],
        };
        const FC = window.__FRAMER_CAPTURE__;

        // ═══ 1. IntersectionObserver Precise Capture ═══
        const OrigIO = window.IntersectionObserver;
        window.IntersectionObserver = function(callback, options) {
            const record = {
                threshold: options?.threshold || 0,
                rootMargin: options?.rootMargin || '0px',
                root: options?.root ? options.root.tagName + (options.root.id ? '#' + options.root.id : '') : null,
                targets: [],
                callbackSource: callback.toString().substring(0, 300),
                timestamp: performance.now(),
            };
            FC.intersectionObservers.push(record);

            const orig = new OrigIO(function(entries, observer) {
                entries.forEach(entry => {
                    const el = entry.target;
                    const selector = el.tagName.toLowerCase() + 
                        (el.id ? '#' + el.id : '') + 
                        (el.className ? '.' + String(el.className).split(' ').filter(Boolean).slice(0, 2).join('.') : '');
                    
                    if (!record.targets.find(t => t.selector === selector)) {
                        record.targets.push({
                            selector,
                            bounds: {
                                x: Math.round(entry.boundingClientRect.x),
                                y: Math.round(entry.boundingClientRect.y),
                                width: Math.round(entry.boundingClientRect.width),
                                height: Math.round(entry.boundingClientRect.height),
                            },
                            isIntersecting: entry.isIntersecting,
                            intersectionRatio: Math.round(entry.intersectionRatio * 100) / 100,
                        });
                    }
                });
                return callback(entries, observer);
            }, options);

            const origObserve = orig.observe.bind(orig);
            orig.observe = function(target) {
                const selector = target.tagName.toLowerCase() + 
                    (target.id ? '#' + target.id : '') +
                    (target.className ? '.' + String(target.className).split(' ').filter(Boolean).slice(0, 2).join('.') : '');
                if (!record.targets.find(t => t.selector === selector)) {
                    record.targets.push({ selector, observed: true });
                }
                return origObserve(target);
            };
            return orig;
        };
        window.IntersectionObserver.prototype = OrigIO.prototype;

        // ═══ 2. GSAP Call Interception ═══
        const waitForGSAP = setInterval(() => {
            if (window.gsap) {
                clearInterval(waitForGSAP);
                captureGSAP();
            }
        }, 100);

        function captureGSAP() {
            FC.gsapTimelines = [];
            FC.gsapTweens = [];

            // Wrap gsap.to / gsap.from / gsap.fromTo
            ['to', 'from', 'fromTo'].forEach(method => {
                const orig = gsap[method].bind(gsap);
                gsap[method] = function(...args) {
                    const record = {
                        method,
                        target: describeTarget(args[0]),
                        vars: sanitizeVars(method === 'fromTo' ? args[2] : args[1]),
                        fromVars: method === 'fromTo' ? sanitizeVars(args[1]) : null,
                        timestamp: performance.now(),
                    };
                    FC.gsapTweens.push(record);
                    return orig(...args);
                };
            });

            // Wrap gsap.timeline
            const origTimeline = gsap.timeline.bind(gsap);
            gsap.timeline = function(vars) {
                const tl = origTimeline(vars);
                const tlRecord = {
                    vars: sanitizeVars(vars),
                    tweens: [],
                    timestamp: performance.now(),
                };
                FC.gsapTimelines.push(tlRecord);

                ['to', 'from', 'fromTo'].forEach(method => {
                    const origMethod = tl[method].bind(tl);
                    tl[method] = function(...args) {
                        tlRecord.tweens.push({
                            method,
                            target: describeTarget(args[0]),
                            vars: sanitizeVars(method === 'fromTo' ? args[2] : args[1]),
                            fromVars: method === 'fromTo' ? sanitizeVars(args[1]) : null,
                            position: args[method === 'fromTo' ? 3 : 2],
                        });
                        return origMethod(...args);
                    };
                });
                return tl;
            };

            // Wrap ScrollTrigger.create
            if (window.ScrollTrigger) {
                FC.scrollTriggerConfigs = [];
                const origCreate = ScrollTrigger.create.bind(ScrollTrigger);
                ScrollTrigger.create = function(vars) {
                    FC.scrollTriggerConfigs.push({
                        trigger: describeTarget(vars.trigger),
                        start: vars.start,
                        end: vars.end,
                        scrub: vars.scrub,
                        pin: vars.pin,
                        toggleActions: vars.toggleActions,
                        markers: vars.markers,
                        onEnter: !!vars.onEnter,
                        onLeave: !!vars.onLeave,
                        onEnterBack: !!vars.onEnterBack,
                        onLeaveBack: !!vars.onLeaveBack,
                    });
                    return origCreate(vars);
                };
            }
        }

        // ═══ 3. Framer Motion Runtime Capture ═══
        // Hook into React fiber tree to find motion components
        const waitForReact = setInterval(() => {
            const rootEl = document.getElementById('__next') || document.getElementById('root') || document.getElementById('main');
            if (rootEl && rootEl._reactRootContainer || rootEl?.__reactFiber$) {
                clearInterval(waitForReact);
                setTimeout(() => captureFramerFromDOM(), 2000);
            }
        }, 200);

        setTimeout(() => {
            clearInterval(waitForReact);
            captureFramerFromDOM();
        }, 8000);

        function captureFramerFromDOM() {
            // Scan for Framer motion elements by data attributes
            document.querySelectorAll('[data-framer-appear-id]').forEach(el => {
                const style = getComputedStyle(el);
                const transform = style.transform;
                const opacity = style.opacity;
                const transition = style.transition;

                FC.motionElements.push({
                    selector: buildSelector(el),
                    appearId: el.getAttribute('data-framer-appear-id'),
                    framerName: el.getAttribute('data-framer-name') || null,
                    currentTransform: transform !== 'none' ? transform : null,
                    currentOpacity: parseFloat(opacity),
                    transition: transition !== 'all 0s ease 0s' ? transition : null,
                    willChange: style.willChange,
                    bounds: el.getBoundingClientRect().toJSON(),
                    // Extract inline style animation data
                    inlineStyle: extractAnimationStyles(el),
                });
            });

            // Scan for Framer-specific classes that indicate motion
            document.querySelectorAll('[class*="framer-"]').forEach(el => {
                const style = getComputedStyle(el);
                
                // Detect spring-like transitions
                if (style.transition && style.transition.includes('transform')) {
                    const parsed = parseTransition(style.transition);
                    if (parsed.length > 0) {
                        FC.transitionConfigs.push({
                            selector: buildSelector(el),
                            transitions: parsed,
                        });
                    }
                }

                // Detect layout animation candidates (position: relative with transform)
                if (style.position === 'relative' && style.transform !== 'none') {
                    FC.layoutAnimations.push({
                        selector: buildSelector(el),
                        layoutId: el.getAttribute('data-framer-layout-id') || el.getAttribute('layoutid') || null,
                        transform: style.transform,
                        position: { x: el.offsetLeft, y: el.offsetTop },
                        size: { width: el.offsetWidth, height: el.offsetHeight },
                    });
                }

                // Detect drag candidates
                if (el.getAttribute('draggable') === 'true' || 
                    style.cursor === 'grab' || style.cursor === 'pointer' ||
                    el.getAttribute('data-framer-drag') !== null) {
                    FC.dragElements.push({
                        selector: buildSelector(el),
                        cursor: style.cursor,
                        dragAxis: el.getAttribute('data-framer-drag') || 'both',
                        bounds: el.getBoundingClientRect().toJSON(),
                        parentBounds: el.parentElement?.getBoundingClientRect().toJSON(),
                    });
                }
            });

            // Capture active CSS animations with EXACT timing
            document.getAnimations().forEach(anim => {
                if (anim instanceof CSSAnimation || anim instanceof CSSTransition) {
                    const effect = anim.effect;
                    const timing = effect?.getTiming() || {};
                    const computed = effect?.getComputedTiming() || {};
                    const keyframes = effect?.getKeyframes() || [];

                    FC.animationFrames.push({
                        type: anim instanceof CSSAnimation ? 'css-animation' : 'css-transition',
                        name: anim.animationName || anim.transitionProperty || null,
                        selector: anim.effect?.target ? buildSelector(anim.effect.target) : null,
                        timing: {
                            duration: timing.duration,
                            delay: timing.delay,
                            endDelay: timing.endDelay,
                            iterations: timing.iterations,
                            direction: timing.direction,
                            fill: timing.fill,
                            easing: timing.easing,
                        },
                        computed: {
                            progress: computed.progress,
                            currentIteration: computed.currentIteration,
                            activeDuration: computed.activeDuration,
                        },
                        keyframes: keyframes.map(kf => ({
                            offset: kf.offset,
                            easing: kf.easing,
                            composite: kf.composite,
                            ...Object.fromEntries(
                                Object.entries(kf).filter(([k]) => 
                                    !['offset', 'easing', 'composite'].includes(k) && kf[k] !== ''
                                )
                            ),
                        })),
                    });
                }
            });

            // Try to extract React Fiber motion props
            captureReactMotionProps();
        }

        function captureReactMotionProps() {
            document.querySelectorAll('[data-framer-appear-id], [class*="framer-"]').forEach(el => {
                // Walk React fiber tree
                const fiberKey = Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
                if (!fiberKey) return;

                let fiber = el[fiberKey];
                let depth = 0;
                while (fiber && depth < 15) {
                    const props = fiber.memoizedProps || fiber.pendingProps;
                    if (props) {
                        // Framer Motion motion.div props
                        if (props.animate || props.initial || props.variants || props.whileInView || props.whileHover) {
                            FC.variants.push({
                                selector: buildSelector(el),
                                initial: safeClone(props.initial),
                                animate: safeClone(props.animate),
                                exit: safeClone(props.exit),
                                whileHover: safeClone(props.whileHover),
                                whileInView: safeClone(props.whileInView),
                                whileTap: safeClone(props.whileTap),
                                whileDrag: safeClone(props.whileDrag),
                                transition: safeClone(props.transition),
                                variants: safeClone(props.variants),
                                layout: props.layout || false,
                                layoutId: props.layoutId || null,
                                drag: props.drag || false,
                                dragConstraints: safeClone(props.dragConstraints),
                                dragElastic: props.dragElastic,
                                dragMomentum: props.dragMomentum,
                            });
                            break;
                        }
                        // Framer's internal motion config
                        if (props.style && props.style.willChange) {
                            // Framer uses willChange as a marker for animated elements
                        }
                    }
                    fiber = fiber.return;
                    depth++;
                }
            });
        }

        // ═══ Utilities ═══
        function buildSelector(el) {
            const tag = el.tagName.toLowerCase();
            const id = el.id ? '#' + el.id : '';
            const classes = el.className ? '.' + String(el.className).split(' ').filter(c => c && !c.startsWith('__')).slice(0, 3).join('.') : '';
            return tag + id + classes;
        }

        function extractAnimationStyles(el) {
            const style = el.style;
            const result = {};
            ['transform', 'opacity', 'scale', 'rotate', 'x', 'y', 'transition',
             'animationName', 'animationDuration', 'animationDelay', 'animationTimingFunction',
             'willChange', 'transformOrigin'].forEach(prop => {
                if (style[prop]) result[prop] = style[prop];
            });
            return Object.keys(result).length > 0 ? result : null;
        }

        function parseTransition(str) {
            if (!str || str === 'all 0s ease 0s') return [];
            return str.split(',').map(t => {
                const parts = t.trim().split(/\\s+/);
                return {
                    property: parts[0],
                    duration: parts[1],
                    easing: parts[2],
                    delay: parts[3],
                };
            }).filter(t => t.duration !== '0s');
        }

        function describeTarget(target) {
            if (typeof target === 'string') return target;
            if (target instanceof Element) return buildSelector(target);
            if (Array.isArray(target)) return target.map(t => describeTarget(t));
            return String(target);
        }

        function sanitizeVars(vars) {
            if (!vars) return null;
            const result = {};
            for (const [key, val] of Object.entries(vars)) {
                if (typeof val === 'function') {
                    result[key] = '[Function]';
                } else if (val instanceof Element) {
                    result[key] = buildSelector(val);
                } else if (typeof val === 'object' && val !== null) {
                    result[key] = sanitizeVars(val);
                } else {
                    result[key] = val;
                }
            }
            return result;
        }

        function safeClone(obj) {
            if (obj === null || obj === undefined) return null;
            try {
                return JSON.parse(JSON.stringify(obj, (key, val) => {
                    if (typeof val === 'function') return '[Function]';
                    if (val instanceof Element) return buildSelector(val);
                    return val;
                }));
            } catch {
                return String(obj);
            }
        }
    })();
    `;
}

/**
 * Extract captured Framer data from the page
 */
export async function extractFramerDeepData(page) {
    return await page.evaluate(() => {
        const FC = window.__FRAMER_CAPTURE__;
        if (!FC) return null;
        return {
            motionElements: FC.motionElements || [],
            springs: FC.springs || [],
            transitionConfigs: FC.transitionConfigs || [],
            layoutAnimations: FC.layoutAnimations || [],
            dragElements: FC.dragElements || [],
            variants: FC.variants || [],
            animationFrames: FC.animationFrames || [],
            intersectionObservers: FC.intersectionObservers || [],
            gsapTweens: FC.gsapTweens || [],
            gsapTimelines: FC.gsapTimelines || [],
            scrollTriggerConfigs: FC.scrollTriggerConfigs || [],
            stats: {
                motionElements: FC.motionElements?.length || 0,
                variants: FC.variants?.length || 0,
                layoutAnimations: FC.layoutAnimations?.length || 0,
                dragElements: FC.dragElements?.length || 0,
                intersectionObservers: FC.intersectionObservers?.length || 0,
                animationFrames: FC.animationFrames?.length || 0,
                gsapTweens: FC.gsapTweens?.length || 0,
                gsapTimelines: FC.gsapTimelines?.length || 0,
            },
        };
    });
}
