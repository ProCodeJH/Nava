/**
 * ═══════════════════════════════════════════════════════════════
 *  DESIGN-DNA — ANIMATION PATTERN ANALYZER
 *  Ported from clone-engine v3.0 ULTRA
 *
 *  Classifies raw detection data into named animation patterns
 *  that map directly to Framer Motion code generation
 * ═══════════════════════════════════════════════════════════════
 */

// ─── Pattern Type Constants ──────────────────────────────────
export const PATTERN = {
    // Hover patterns
    HOVER_SCALE: 'HOVER_SCALE',
    HOVER_FADE: 'HOVER_FADE',
    HOVER_COLOR: 'HOVER_COLOR',
    HOVER_GLOW: 'HOVER_GLOW',
    HOVER_LIFT: 'HOVER_LIFT',
    HOVER_UNDERLINE: 'HOVER_UNDERLINE',

    // Scroll patterns
    SCROLL_FADE_IN: 'SCROLL_FADE_IN',
    SCROLL_SLIDE_UP: 'SCROLL_SLIDE_UP',
    SCROLL_SLIDE_LEFT: 'SCROLL_SLIDE_LEFT',
    SCROLL_ZOOM: 'SCROLL_ZOOM',
    SCROLL_REVEAL: 'SCROLL_REVEAL',
    SCROLL_COLOR: 'SCROLL_COLOR',

    // Continuous patterns
    MARQUEE: 'MARQUEE',
    PULSE: 'PULSE',
    SPIN: 'SPIN',
    BOUNCE: 'BOUNCE',
    FLOAT: 'FLOAT',

    // 3D patterns
    TILT_3D: 'TILT_3D',
    FLIP_CARD: 'FLIP_CARD',
    PERSPECTIVE_HOVER: 'PERSPECTIVE_HOVER',

    // Layout patterns
    PARALLAX: 'PARALLAX',
    STAGGER_CHILDREN: 'STAGGER_CHILDREN',

    // Entrance patterns
    ENTRANCE_FADE: 'ENTRANCE_FADE',
    ENTRANCE_SLIDE: 'ENTRANCE_SLIDE',
    ENTRANCE_SCALE: 'ENTRANCE_SCALE',
};

// ─── Framer Motion mapping ───────────────────────────────────
const MOTION_MAP = {
    [PATTERN.HOVER_SCALE]: { whileHover: { scale: 1.05 }, whileTap: { scale: 0.97 }, transition: { duration: 0.2 } },
    [PATTERN.HOVER_FADE]: { whileHover: { opacity: 0.8 }, transition: { duration: 0.2 } },
    [PATTERN.HOVER_COLOR]: { whileHover: { backgroundColor: '#dynamic' }, transition: { duration: 0.3 } },
    [PATTERN.HOVER_GLOW]: { whileHover: { boxShadow: '#dynamic' }, transition: { duration: 0.3 } },
    [PATTERN.HOVER_LIFT]: { whileHover: { y: -4, boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }, transition: { duration: 0.3 } },
    [PATTERN.HOVER_UNDERLINE]: { whileHover: { textDecoration: 'underline' }, transition: { duration: 0.2 } },

    [PATTERN.SCROLL_FADE_IN]: { initial: { opacity: 0 }, whileInView: { opacity: 1 }, viewport: { once: false, amount: 0.3 }, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
    [PATTERN.SCROLL_SLIDE_UP]: { initial: { opacity: 0, y: 50 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: false, amount: 0.2 }, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
    [PATTERN.SCROLL_SLIDE_LEFT]: { initial: { opacity: 0, x: -50 }, whileInView: { opacity: 1, x: 0 }, viewport: { once: false, amount: 0.2 }, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
    [PATTERN.SCROLL_ZOOM]: { initial: { opacity: 0, scale: 0.85 }, whileInView: { opacity: 1, scale: 1 }, viewport: { once: false, amount: 0.3 }, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
    [PATTERN.SCROLL_REVEAL]: { initial: { clipPath: 'inset(100% 0% 0% 0%)' }, whileInView: { clipPath: 'inset(0% 0% 0% 0%)' }, viewport: { once: false, amount: 0.2 }, transition: { duration: 1.0, ease: [0.16, 1, 0.3, 1] } },

    [PATTERN.ENTRANCE_FADE]: { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.8, delay: 0.2 } },
    [PATTERN.ENTRANCE_SLIDE]: { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] } },
    [PATTERN.ENTRANCE_SCALE]: { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.8, delay: 0.2 } },
};


// ═══════════════════════════════════════════════════════════════
//  MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════
export function analyzeAnimationPatterns(framerDynamics) {
    console.log('   🔍 [Framer] Analyzing animation patterns...');

    const patterns = [];

    // 1. Classify hover interactions
    const hoverPatterns = classifyHoverInteractions(framerDynamics.hoverInteractions || []);
    patterns.push(...hoverPatterns);

    // 2. Classify scroll animations
    const scrollPatterns = classifyScrollAnimations(framerDynamics.scrollAnimations || []);
    patterns.push(...scrollPatterns);

    // 3. Detect marquee animations
    const marqueePatterns = detectMarquee(
        framerDynamics.activeAnimations || [],
        framerDynamics.keyframeAnimations || {},
        framerDynamics.cssAnimationElements || [],
    );
    patterns.push(...marqueePatterns);

    // 4. Detect 3D elements
    const threeDPatterns = detect3DElements(framerDynamics.transform3DElements || []);
    patterns.push(...threeDPatterns);

    // 5. Classify parallax elements
    const parallaxPatterns = classifyParallax(framerDynamics.parallaxElements || []);
    patterns.push(...parallaxPatterns);

    // 6. Detect continuous animations (pulse, spin, bounce, float)
    const continuousPatterns = detectContinuousAnimations(
        framerDynamics.activeAnimations || [],
        framerDynamics.keyframeAnimations || {},
        framerDynamics.cssAnimationElements || [],
    );
    patterns.push(...continuousPatterns);

    // 7. Detect entrance animations from active animations
    const entrancePatterns = detectEntranceAnimations(framerDynamics.activeAnimations || []);
    patterns.push(...entrancePatterns);

    // Compute confidence scores
    for (const pattern of patterns) {
        pattern.confidence = computeConfidence(pattern);
    }

    patterns.sort((a, b) => b.confidence - a.confidence);

    const typeCounts = {};
    for (const p of patterns) {
        typeCounts[p.pattern] = (typeCounts[p.pattern] || 0) + 1;
    }

    console.log(`   ✅ [Framer] Animation patterns classified: ${patterns.length} total`);
    for (const [type, count] of Object.entries(typeCounts)) {
        console.log(`   ℹ️  ${type}: ${count}`);
    }

    return {
        patterns,
        summary: typeCounts,
        motionMap: MOTION_MAP,
    };
}


// ═══════════════════════════════════════════════════════════════
//  HOVER INTERACTION CLASSIFIER
// ═══════════════════════════════════════════════════════════════
function classifyHoverInteractions(hoverInteractions) {
    const patterns = [];

    for (const hover of hoverInteractions) {
        const changes = hover.hoverChanges || {};
        const changeKeys = Object.keys(changes);
        if (changeKeys.length === 0) continue;

        let patternType = null;
        const params = {};

        if (changes.scale || hasTransformScale(changes.transform)) {
            patternType = PATTERN.HOVER_SCALE;
            const scaleVal = changes.scale
                ? parseFloat(changes.scale.to)
                : extractScaleFromTransform(changes.transform?.to);
            params.scale = scaleVal || 1.05;
        } else if (changes.boxShadow && !changes.backgroundColor) {
            patternType = PATTERN.HOVER_GLOW;
            params.boxShadow = changes.boxShadow.to;
        } else if (changes.transform && hasTranslateY(changes.transform)) {
            patternType = PATTERN.HOVER_LIFT;
            params.y = extractTranslateY(changes.transform.to);
            if (changes.boxShadow) params.boxShadow = changes.boxShadow.to;
        } else if (changes.backgroundColor) {
            patternType = PATTERN.HOVER_COLOR;
            params.backgroundColor = changes.backgroundColor.to;
            if (changes.color) params.color = changes.color.to;
        } else if (changes.opacity) {
            patternType = PATTERN.HOVER_FADE;
            params.opacity = parseFloat(changes.opacity.to);
        } else if (changes.textDecoration) {
            patternType = PATTERN.HOVER_UNDERLINE;
        } else if (changes.color) {
            patternType = PATTERN.HOVER_COLOR;
            params.color = changes.color.to;
        }

        if (!patternType) continue;

        patterns.push({
            pattern: patternType,
            element: {
                id: hover.id,
                framerName: hover.framerName,
                text: hover.text,
                tag: hover.tag,
            },
            params,
            transition: hover.transition || {},
            motionProps: buildMotionProps(patternType, params),
            source: 'hover',
        });
    }

    return patterns;
}


// ═══════════════════════════════════════════════════════════════
//  SCROLL ANIMATION CLASSIFIER
// ═══════════════════════════════════════════════════════════════
function classifyScrollAnimations(scrollAnimations) {
    const patterns = [];

    for (const anim of scrollAnimations) {
        const types = anim.animationTypes || [];
        const changes = anim.changes || [];
        if (types.length === 0 && changes.length === 0) continue;

        let patternType = null;
        const params = {};

        let hasOpacityChange = false;
        let hasTransformChange = false;
        let hasScaleChange = false;
        let hasClipPathChange = false;
        let hasColorChange = false;
        let hasSlideSide = false;

        for (const change of changes) {
            if (change.opacity) hasOpacityChange = true;
            if (change.transform) hasTransformChange = true;
            if (change.scale) hasScaleChange = true;
            if (change.clipPath) hasClipPathChange = true;
            if (change.backgroundColor || change.color) hasColorChange = true;
            if (change._positionDelta) {
                const dx = change._positionDelta?.diff || 0;
                if (Math.abs(dx) > 20) hasSlideSide = true;
            }
        }

        if (hasClipPathChange) {
            patternType = PATTERN.SCROLL_REVEAL;
            if (changes[0]?.clipPath) {
                params.from = changes[0].clipPath.from;
                params.to = changes[changes.length - 1]?.clipPath?.to || 'inset(0% 0% 0% 0%)';
            }
        } else if (hasScaleChange && hasOpacityChange) {
            patternType = PATTERN.SCROLL_ZOOM;
            if (changes[0]?.scale) {
                params.fromScale = parseFloat(changes[0].scale.from) || 0.85;
            }
        } else if (hasSlideSide && hasOpacityChange) {
            patternType = PATTERN.SCROLL_SLIDE_LEFT;
        } else if (hasTransformChange && hasOpacityChange) {
            patternType = PATTERN.SCROLL_SLIDE_UP;
            params.y = 50;
        } else if (hasOpacityChange) {
            patternType = PATTERN.SCROLL_FADE_IN;
        } else if (hasColorChange) {
            patternType = PATTERN.SCROLL_COLOR;
        } else if (hasTransformChange) {
            patternType = PATTERN.SCROLL_SLIDE_UP;
            params.y = 30;
        }

        if (!patternType) continue;

        patterns.push({
            pattern: patternType,
            element: {
                id: anim.id,
                framerName: anim.framerName,
                tag: anim.tag,
            },
            params,
            scrollRange: anim.scrollRange || {},
            motionProps: buildMotionProps(patternType, params),
            source: 'scroll',
        });
    }

    return patterns;
}


// ═══════════════════════════════════════════════════════════════
//  MARQUEE DETECTOR
// ═══════════════════════════════════════════════════════════════
function detectMarquee(activeAnims, keyframes, cssAnimations) {
    const patterns = [];

    for (const anim of cssAnimations) {
        if (anim.isMarquee) {
            patterns.push({
                pattern: PATTERN.MARQUEE,
                element: anim.element,
                params: {
                    animationName: anim.animationName,
                    duration: anim.duration,
                    direction: anim.direction,
                    timingFunction: anim.timingFunction,
                },
                keyframes: keyframes[anim.animationName] || null,
                motionProps: null,
                cssAnimation: {
                    name: anim.animationName,
                    duration: anim.duration,
                    iterationCount: 'infinite',
                    timingFunction: anim.timingFunction === 'ease' ? 'linear' : anim.timingFunction,
                    direction: anim.direction,
                },
                source: 'css-animation',
                confidence: 0.95,
            });
        }
    }

    for (const anim of activeAnims) {
        if (anim.iterations !== Infinity && anim.iterations !== 'Infinity' && anim.iterations < 100) continue;

        const kfs = anim.keyframes || [];
        let hasTranslateX = false;
        for (const kf of kfs) {
            const props = kf.properties || {};
            if (props.transform && (props.transform.includes('translateX') || props.transform.includes('translate3d'))) {
                hasTranslateX = true;
                break;
            }
        }

        if (!hasTranslateX) continue;

        const alreadyFound = patterns.some(p =>
            p.element?.id === anim.element?.id &&
            p.element?.framerName === anim.element?.framerName
        );
        if (alreadyFound) continue;

        patterns.push({
            pattern: PATTERN.MARQUEE,
            element: anim.element,
            params: {
                animationName: anim.name,
                duration: typeof anim.duration === 'number' ? `${anim.duration / 1000}s` : anim.duration,
                direction: anim.direction,
                easing: anim.easing,
            },
            keyframes: kfs,
            motionProps: null,
            cssAnimation: {
                name: anim.name,
                duration: typeof anim.duration === 'number' ? `${anim.duration / 1000}s` : anim.duration,
                iterationCount: 'infinite',
                timingFunction: anim.easing === 'linear' ? 'linear' : anim.easing,
                direction: anim.direction,
            },
            source: 'web-animation-api',
        });
    }

    return patterns;
}


// ═══════════════════════════════════════════════════════════════
//  3D ELEMENT DETECTOR
// ═══════════════════════════════════════════════════════════════
function detect3DElements(transform3DElements) {
    const patterns = [];

    for (const el of transform3DElements) {
        let patternType = null;
        const params = {};

        if (el.isTiltCard) {
            patternType = PATTERN.TILT_3D;
            params.perspective = el.perspective || el.parentPerspective || '1000px';
            params.rotateX = el.rotation.x;
            params.rotateY = el.rotation.y;
            params.transformOrigin = el.transformOrigin;
        } else if (el.hasPreserve3D && el.backfaceVisibility === 'hidden') {
            patternType = PATTERN.FLIP_CARD;
            params.perspective = el.perspective || el.parentPerspective || '1000px';
            params.backfaceVisibility = 'hidden';
        } else if (el.perspective || el.parentPerspective) {
            patternType = PATTERN.PERSPECTIVE_HOVER;
            params.perspective = el.perspective || el.parentPerspective || '1000px';
            params.rotation = el.rotation;
        }

        if (!patternType) continue;

        patterns.push({
            pattern: patternType,
            element: el.element,
            params,
            motionProps: build3DMotionProps(patternType, params),
            source: '3d-transform',
        });
    }

    return patterns;
}


// ═══════════════════════════════════════════════════════════════
//  PARALLAX CLASSIFIER
// ═══════════════════════════════════════════════════════════════
function classifyParallax(parallaxElements) {
    return parallaxElements.map(el => ({
        pattern: PATTERN.PARALLAX,
        element: {
            id: el.id,
            framerName: el.framerName,
            tag: el.tag,
        },
        params: {
            speed: el.speed,
            direction: el.direction,
        },
        motionProps: {
            _hookBased: true,
            hook: 'useParallax',
            hookParams: { speed: Math.round(el.speed * 1000) / 1000 },
        },
        source: 'parallax',
    }));
}


// ═══════════════════════════════════════════════════════════════
//  CONTINUOUS ANIMATION DETECTOR (Pulse, Spin, Bounce, Float)
// ═══════════════════════════════════════════════════════════════
function detectContinuousAnimations(activeAnims, keyframes, cssAnimations) {
    const patterns = [];

    const infiniteAnims = [
        ...cssAnimations.filter(a => a.isInfinite && !a.isMarquee),
        ...activeAnims.filter(a => (a.iterations === Infinity || a.iterations === 'Infinity' || a.iterations >= 100)),
    ];

    for (const anim of infiniteAnims) {
        const name = anim.animationName || anim.name || '';
        const kfs = keyframes[name] || anim.keyframes || [];
        const nameLower = name.toLowerCase();

        let patternType = null;
        const params = { animationName: name };

        if (nameLower.includes('pulse') || nameLower.includes('glow')) {
            patternType = PATTERN.PULSE;
        } else if (nameLower.includes('spin') || nameLower.includes('rotate')) {
            patternType = PATTERN.SPIN;
        } else if (nameLower.includes('bounce')) {
            patternType = PATTERN.BOUNCE;
        } else if (nameLower.includes('float') || nameLower.includes('hover') || nameLower.includes('bob')) {
            patternType = PATTERN.FLOAT;
        }

        if (!patternType && Array.isArray(kfs)) {
            const allProps = kfs.flatMap(kf => Object.keys(kf.properties || kf));
            if (allProps.some(p => p === 'transform' || p === 'rotate')) {
                const transforms = kfs.map(kf => (kf.properties || kf).transform || '').filter(Boolean);
                if (transforms.some(t => t.includes('rotate(360') || t.includes('rotate(1turn'))) {
                    patternType = PATTERN.SPIN;
                } else if (transforms.some(t => t.includes('translateY'))) {
                    patternType = PATTERN.FLOAT;
                } else if (transforms.some(t => t.includes('scale'))) {
                    patternType = PATTERN.PULSE;
                }
            } else if (allProps.some(p => p === 'opacity' || p === 'boxShadow')) {
                patternType = PATTERN.PULSE;
            }
        }

        if (!patternType && !Array.isArray(kfs) && typeof kfs === 'object') {
            const allValues = Object.values(kfs).flatMap(frame => Object.entries(frame));
            const hasScale = allValues.some(([k, v]) => k === 'transform' && v?.includes('scale'));
            const hasRotate = allValues.some(([k, v]) => k === 'transform' && (v?.includes('rotate(360') || v?.includes('rotate(1turn')));
            const hasTranslateYKf = allValues.some(([k, v]) => k === 'transform' && v?.includes('translateY'));

            if (hasRotate) patternType = PATTERN.SPIN;
            else if (hasTranslateYKf) patternType = PATTERN.FLOAT;
            else if (hasScale) patternType = PATTERN.PULSE;
        }

        if (!patternType) continue;

        const elKey = (anim.element?.id || anim.element?.framerName || anim.element?.className || '');
        const alreadyFound = patterns.some(p =>
            p.pattern === patternType &&
            (p.element?.id || p.element?.framerName || p.element?.className || '') === elKey
        );
        if (alreadyFound) continue;

        params.duration = anim.duration || '1s';
        params.timingFunction = anim.timingFunction || anim.easing || 'ease';

        patterns.push({
            pattern: patternType,
            element: anim.element,
            params,
            keyframes: kfs,
            motionProps: buildContinuousMotionProps(patternType, params),
            source: 'continuous',
        });
    }

    return patterns;
}


// ═══════════════════════════════════════════════════════════════
//  ENTRANCE ANIMATION DETECTOR
// ═══════════════════════════════════════════════════════════════
function detectEntranceAnimations(activeAnims) {
    const patterns = [];

    for (const anim of activeAnims) {
        if (anim.iterations > 2 || anim.iterations === Infinity) continue;
        const duration = typeof anim.duration === 'number' ? anim.duration : 1000;
        if (duration > 3000) continue;

        const kfs = anim.keyframes || [];
        if (kfs.length < 2) continue;

        const firstFrame = kfs[0]?.properties || {};
        const lastFrame = kfs[kfs.length - 1]?.properties || {};

        let patternType = null;
        const params = {};

        const hasOpacity = firstFrame.opacity !== undefined && lastFrame.opacity !== undefined &&
            parseFloat(firstFrame.opacity) < parseFloat(lastFrame.opacity);

        const hasTransform = firstFrame.transform !== lastFrame.transform;
        const hasSlide = firstFrame.transform && (
            firstFrame.transform.includes('translateY') || firstFrame.transform.includes('translateX')
        );
        const hasScale = firstFrame.transform && firstFrame.transform.includes('scale');

        if (hasOpacity && hasSlide) {
            patternType = PATTERN.ENTRANCE_SLIDE;
            params.duration = duration / 1000;
        } else if (hasOpacity && hasScale) {
            patternType = PATTERN.ENTRANCE_SCALE;
            params.duration = duration / 1000;
        } else if (hasOpacity) {
            patternType = PATTERN.ENTRANCE_FADE;
            params.duration = duration / 1000;
        }

        if (!patternType) continue;

        params.delay = (anim.delay || 0) / 1000;
        params.easing = anim.easing || 'ease';

        patterns.push({
            pattern: patternType,
            element: anim.element,
            params,
            motionProps: buildMotionProps(patternType, params),
            source: 'entrance',
        });
    }

    return patterns;
}


// ═══════════════════════════════════════════════════════════════
//  CONFIDENCE SCORING
// ═══════════════════════════════════════════════════════════════
function computeConfidence(pattern) {
    let score = 0.5;

    if (pattern.source === 'css-animation') score += 0.3;
    if (pattern.source === 'hover') score += 0.2;
    if (pattern.source === 'scroll') score += 0.15;
    if (pattern.source === '3d-transform') score += 0.25;
    if (pattern.source === 'parallax') score += 0.2;

    if (pattern.element?.id) score += 0.1;
    if (pattern.element?.framerName) score += 0.15;

    if (pattern.params && Object.keys(pattern.params).length > 2) score += 0.1;
    if (pattern.keyframes) score += 0.1;

    return Math.min(Math.round(score * 100) / 100, 1.0);
}


// ═══════════════════════════════════════════════════════════════
//  MOTION PROPS BUILDERS
// ═══════════════════════════════════════════════════════════════
function buildMotionProps(patternType, params) {
    const base = MOTION_MAP[patternType];
    if (!base) return null;

    const props = JSON.parse(JSON.stringify(base));

    if (patternType === PATTERN.HOVER_SCALE && params.scale) {
        props.whileHover.scale = params.scale;
    }
    if (patternType === PATTERN.HOVER_FADE && params.opacity) {
        props.whileHover.opacity = params.opacity;
    }
    if (patternType === PATTERN.HOVER_COLOR) {
        if (params.backgroundColor) props.whileHover.backgroundColor = params.backgroundColor;
        if (params.color) props.whileHover.color = params.color;
    }
    if (patternType === PATTERN.HOVER_GLOW && params.boxShadow) {
        props.whileHover.boxShadow = params.boxShadow;
    }
    if (patternType === PATTERN.HOVER_LIFT) {
        if (params.y) props.whileHover.y = params.y;
        if (params.boxShadow) props.whileHover.boxShadow = params.boxShadow;
    }
    if (patternType === PATTERN.SCROLL_ZOOM && params.fromScale) {
        props.initial.scale = params.fromScale;
    }
    if (params.duration) {
        props.transition.duration = params.duration;
    }
    if (params.delay) {
        props.transition.delay = params.delay;
    }

    return props;
}

function build3DMotionProps(patternType, params) {
    if (patternType === PATTERN.TILT_3D) {
        return {
            _hookBased: true,
            hook: 'useTilt3D',
            hookParams: {
                perspective: params.perspective || '1000px',
                maxRotateX: Math.abs(params.rotateX) || 15,
                maxRotateY: Math.abs(params.rotateY) || 15,
                transformOrigin: params.transformOrigin || 'center center',
            },
        };
    }
    if (patternType === PATTERN.FLIP_CARD) {
        return {
            _hookBased: true,
            hook: 'useFlipCard',
            hookParams: {
                perspective: params.perspective || '1000px',
            },
        };
    }
    return null;
}

function buildContinuousMotionProps(patternType, params) {
    const duration = parseAnimDuration(params.duration);

    if (patternType === PATTERN.PULSE) {
        return {
            animate: { scale: [1, 1.05, 1] },
            transition: { duration, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' },
        };
    }
    if (patternType === PATTERN.SPIN) {
        return {
            animate: { rotate: 360 },
            transition: { duration, repeat: Infinity, repeatType: 'loop', ease: 'linear' },
        };
    }
    if (patternType === PATTERN.BOUNCE) {
        return {
            animate: { y: [0, -10, 0] },
            transition: { duration, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' },
        };
    }
    if (patternType === PATTERN.FLOAT) {
        return {
            animate: { y: [0, -8, 0] },
            transition: { duration: duration || 3, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' },
        };
    }
    return null;
}


// ═══════════════════════════════════════════════════════════════
//  HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════
function hasTransformScale(transformChange) {
    if (!transformChange) return false;
    const to = transformChange.to || '';
    const from = transformChange.from || '';
    const toScale = extractScaleFromTransform(to);
    const fromScale = extractScaleFromTransform(from);
    return toScale !== null && fromScale !== null && Math.abs(toScale - fromScale) > 0.01;
}

function extractScaleFromTransform(transform) {
    if (!transform || transform === 'none') return null;
    const match = transform.match(/matrix\(([^)]+)\)/);
    if (match) {
        const vals = match[1].split(',').map(v => parseFloat(v.trim()));
        if (vals.length >= 4) {
            return Math.sqrt(vals[0] * vals[0] + vals[1] * vals[1]);
        }
    }
    const scaleMatch = transform.match(/scale\(([^)]+)\)/);
    if (scaleMatch) return parseFloat(scaleMatch[1]);
    return null;
}

function hasTranslateY(transformChange) {
    if (!transformChange) return false;
    const to = transformChange.to || transformChange;
    if (typeof to !== 'string') return false;
    return to.includes('translateY') || to.includes('matrix');
}

function extractTranslateY(transform) {
    if (!transform || transform === 'none') return 0;
    const match = transform.match(/translateY\(([^)]+)\)/);
    if (match) return parseFloat(match[1]);
    const matrixMatch = transform.match(/matrix\(([^)]+)\)/);
    if (matrixMatch) {
        const vals = matrixMatch[1].split(',').map(v => parseFloat(v.trim()));
        return vals.length >= 6 ? vals[5] : 0;
    }
    return 0;
}

function parseAnimDuration(duration) {
    if (typeof duration === 'number') return duration / 1000;
    if (typeof duration === 'string') {
        if (duration.endsWith('ms')) return parseFloat(duration) / 1000;
        if (duration.endsWith('s')) return parseFloat(duration);
    }
    return 1;
}
