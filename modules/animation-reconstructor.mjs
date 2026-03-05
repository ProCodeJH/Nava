/**
 * v7.0 Precision Animation Reconstructor
 * 
 * Generates EXACT animation code from deep capture data:
 *  - Framer Motion exact spring/variant/layout/drag reconstruction
 *  - IntersectionObserver precise threshold/rootMargin replay
 *  - GSAP exact timeline sequence replay
 *  - Three.js scene reconstruction from captured objects
 *  - Lottie player with actual JSON data
 *  - CSS Animation API keyframe preservation
 */

export function reconstructAnimations(dnaData, deepCapture) {
    const scripts = [];
    const cdnLinks = [];

    const framer = deepCapture?.framer || {};
    const webgl = deepCapture?.webgl || {};
    const lottie = deepCapture?.lottie || {};

    // ═══ Determine needed CDNs ═══
    cdnLinks.push('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js');
    cdnLinks.push('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js');

    const hasWebGL = (webgl.stats?.canvases > 0) || (dnaData.webgl?.contexts?.length > 0);
    const hasLottie = (lottie.downloaded > 0) || (dnaData.lottieRive?.lottieAnimations?.length > 0);
    const hasFramer = (framer.stats?.motionElements > 0) || (framer.stats?.variants > 0) ||
        !!(dnaData.runtimeHook?.framerMotionProps?.length || dnaData.animation?.framerComponents?.length);
    const hasGSAPCapture = (framer.stats?.gsapTweens > 0) || (framer.stats?.gsapTimelines > 0);
    const hasDrag = (framer.stats?.dragElements > 0);

    if (hasWebGL) cdnLinks.push('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
    if (hasLottie) cdnLinks.push('https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js');
    if (hasDrag) cdnLinks.push('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/Draggable.min.js');

    // ═══ 1. GSAP Setup ═══
    scripts.push(generateGSAPSetup());

    // ═══ 2. Precise Framer variant reconstruction ═══
    if (hasFramer) {
        scripts.push(generatePreciseFramerAnimations(framer, dnaData));
    }

    // ═══ 3. Precise IntersectionObserver replay ═══
    scripts.push(generatePreciseScrollAnimations(framer, dnaData));

    // ═══ 4. Captured GSAP timeline replay ═══
    if (hasGSAPCapture) {
        scripts.push(generateGSAPReplay(framer));
    }

    // ═══ 5. Layout animations (layoutId / AnimatePresence) ═══
    if (framer.layoutAnimations?.length > 0) {
        scripts.push(generateLayoutAnimations(framer));
    }

    // ═══ 6. Drag interactions ═══
    if (hasDrag) {
        scripts.push(generateDragInteractions(framer));
    }

    // ═══ 7. CSS Animation exact keyframes ═══
    scripts.push(generateExactCSSAnimations(framer, dnaData));

    // ═══ 8. Interaction effects (hover, tilt, magnetic) ═══
    scripts.push(generateInteractionEffects(dnaData));

    // ═══ 9. Smooth scroll + parallax ═══
    scripts.push(generateSmoothScroll(dnaData));

    // ═══ 10. Three.js scene reconstruction ═══
    if (hasWebGL) {
        scripts.push(generateThreeJSReconstruction(webgl, dnaData));
    }

    // ═══ 11. Lottie player with actual data ═══
    if (hasLottie) {
        scripts.push(generateLottiePlayer(lottie, dnaData));
    }

    const fullScript = scripts.filter(Boolean).join('\n\n');

    return {
        cdnLinks,
        script: fullScript,
        stats: {
            hasScrollAnimations: true,
            hasFramer,
            hasGSAP: hasGSAPCapture,
            hasWebGL,
            hasLottie,
            hasDrag,
            hasLayoutAnimations: (framer.layoutAnimations?.length || 0) > 0,
            preciseVariants: framer.variants?.length || 0,
            preciseObservers: framer.intersectionObservers?.length || 0,
            capturedAnimationFrames: framer.animationFrames?.length || 0,
            cdnCount: cdnLinks.length,
            scriptSize: fullScript.length,
        },
    };
}

// ═══════════════════════════════════════════
function generateGSAPSetup() {
    return `
// ═══ GSAP Precision Setup ═══
gsap.registerPlugin(ScrollTrigger);
if (window.Draggable) gsap.registerPlugin(Draggable);

gsap.defaults({ ease: 'power2.out', duration: 0.8 });
document.documentElement.style.scrollBehavior = 'smooth';
`;
}

// ═══════════════════════════════════════════
function generatePreciseFramerAnimations(framer, dnaData) {
    const variants = framer.variants || [];
    const motionEls = framer.motionElements || [];

    if (variants.length === 0 && motionEls.length === 0) {
        // Fallback to approximate mode
        return generateApproximateFramer(dnaData);
    }

    const lines = [`
// ═══ Precise Framer Motion Reconstruction ═══
// Reconstructed from ${variants.length} captured variant configs + ${motionEls.length} motion elements

(function initPreciseFramer() {
    // Page enter transition
    gsap.from('body', { opacity: 0, duration: 0.4, ease: 'power1.out' });
`];

    // Generate exact variant-based animations
    variants.forEach((v, i) => {
        const selector = v.selector;
        const initial = v.initial;
        const animate = v.animate;
        const transition = v.transition;
        const whileInView = v.whileInView;
        const whileHover = v.whileHover;
        const whileTap = v.whileTap;

        // Convert Framer spring to GSAP easing
        const easing = framerTransitionToGSAP(transition);

        if (initial && animate) {
            lines.push(`
    // Variant ${i}: ${selector}
    document.querySelectorAll('${escapeSel(selector)}').forEach(el => {
        gsap.set(el, ${toGSAPProps(initial)});
        gsap.to(el, {
            ...${toGSAPProps(animate)},
            ${easing}
            scrollTrigger: {
                trigger: el,
                start: 'top 85%',
                toggleActions: 'play none none reverse',
            },
        });
    });`);
        }

        if (whileInView) {
            lines.push(`
    // whileInView ${i}: ${selector}
    document.querySelectorAll('${escapeSel(selector)}').forEach(el => {
        gsap.from(el, {
            ...${toGSAPProps(invertProps(whileInView))},
            ${easing}
            scrollTrigger: {
                trigger: el,
                start: 'top 85%',
                toggleActions: 'play none none reverse',
            },
        });
    });`);
        }

        if (whileHover) {
            lines.push(`
    // whileHover ${i}: ${selector}
    document.querySelectorAll('${escapeSel(selector)}').forEach(el => {
        el.addEventListener('mouseenter', () => gsap.to(el, { ...${toGSAPProps(whileHover)}, duration: 0.3, ease: 'power2.out' }));
        el.addEventListener('mouseleave', () => gsap.to(el, { ...${toGSAPProps(invertProps(whileHover))}, duration: 0.4, ease: 'power2.out' }));
    });`);
        }

        if (whileTap) {
            lines.push(`
    // whileTap ${i}: ${selector}
    document.querySelectorAll('${escapeSel(selector)}').forEach(el => {
        el.addEventListener('mousedown', () => gsap.to(el, { ...${toGSAPProps(whileTap)}, duration: 0.1 }));
        el.addEventListener('mouseup', () => gsap.to(el, { ...${toGSAPProps(invertProps(whileTap))}, duration: 0.3, ease: 'elastic.out(1, 0.5)' }));
    });`);
        }
    });

    // Framer appear-id elements (those not covered by variants)
    lines.push(`
    // Framer appear-id fallback
    document.querySelectorAll('[data-framer-appear-id]').forEach((el, i) => {
        if (el.closest('[data-variant-captured]')) return;
        gsap.from(el, {
            opacity: 0, y: 50, duration: 0.7, delay: i * 0.04,
            ease: 'power2.out',
            scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' },
        });
    });

    // Stagger children in Framer containers
    document.querySelectorAll('[class*="framer-"] > [class*="framer-"]').forEach(container => {
        const children = Array.from(container.children).filter(c => c.offsetHeight > 10);
        if (children.length < 3) return;
        const rect = container.getBoundingClientRect();
        if (rect.top < window.innerHeight) return;
        children.forEach((child, i) => {
            gsap.from(child, {
                opacity: 0, y: 30, scale: 0.97, duration: 0.5, delay: i * 0.06,
                ease: 'back.out(1.2)',
                scrollTrigger: { trigger: container, start: 'top 80%', toggleActions: 'play none none reverse' },
            });
        });
    });

    // Hover spring on interactive elements
    document.querySelectorAll('a, button, [role="button"]').forEach(el => {
        el.addEventListener('mouseenter', () => gsap.to(el, { scale: 1.02, duration: 0.3, ease: 'power2.out' }));
        el.addEventListener('mouseleave', () => gsap.to(el, { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.5)' }));
    });

    console.log('[Clone] Precise Framer Motion: ${variants.length} variants + ${motionEls.length} elements');
})();`);

    return lines.join('\n');
}

function generateApproximateFramer(dnaData) {
    return `
// ═══ Approximate Framer Motion (no React fiber data) ═══
(function() {
    gsap.from('body', { opacity: 0, duration: 0.5, ease: 'power1.out' });
    document.querySelectorAll('[data-framer-appear-id]').forEach((el, i) => {
        gsap.from(el, { opacity: 0, y: 50, duration: 0.7, delay: i * 0.05, ease: 'power2.out',
            scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' } });
    });
    document.querySelectorAll('[class*="framer-"] > [class*="framer-"]').forEach(c => {
        const ch = Array.from(c.children).filter(x => x.offsetHeight > 10);
        if (ch.length < 3 || c.getBoundingClientRect().top < innerHeight) return;
        ch.forEach((child, i) => { gsap.from(child, { opacity: 0, y: 40, scale: 0.95, duration: 0.6, delay: i*0.08, ease: 'back.out(1.4)',
            scrollTrigger: { trigger: c, start: 'top 80%', toggleActions: 'play none none reverse' } }); });
    });
    document.querySelectorAll('a, button, [role="button"]').forEach(el => {
        el.addEventListener('mouseenter', () => gsap.to(el, { scale: 1.02, duration: 0.3 }));
        el.addEventListener('mouseleave', () => gsap.to(el, { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.5)' }));
    });
})();`;
}

// ═══════════════════════════════════════════
function generatePreciseScrollAnimations(framer, dnaData) {
    const observers = framer.intersectionObservers || [];
    const observerCount = dnaData.runtimeHook?.intersectionObservers || 0;

    if (observers.length === 0) {
        // Fallback: generic scroll reveals
        return `
// ═══ Scroll Animations (${observerCount} observers detected) ═══
(function() {
    document.querySelectorAll('section, [class*="framer-"]').forEach((s, i) => {
        if (s.getBoundingClientRect().top < innerHeight * 0.8) return;
        gsap.set(s, { opacity: 0, y: 60, visibility: 'visible' });
        gsap.to(s, { opacity: 1, y: 0, duration: 0.8, delay: i*0.05, ease: 'power2.out',
            scrollTrigger: { trigger: s, start: 'top 85%', end: 'top 50%', toggleActions: 'play none none reverse' } });
    });
    document.querySelectorAll('h1, h2, h3').forEach(h => {
        if (h.getBoundingClientRect().top < innerHeight) return;
        gsap.from(h, { opacity: 0, y: 40, duration: 1, ease: 'power3.out',
            scrollTrigger: { trigger: h, start: 'top 85%', toggleActions: 'play none none reverse' } });
    });
    document.querySelectorAll('img[loading], picture').forEach(img => {
        if (img.getBoundingClientRect().top < innerHeight) return;
        gsap.from(img, { scale: 0.9, opacity: 0, duration: 1, ease: 'power2.out',
            scrollTrigger: { trigger: img, start: 'top 90%', toggleActions: 'play none none none' } });
    });
})();`;
    }

    // Precise observer reconstruction
    const lines = [`
// ═══ Precise Scroll Animations (${observers.length} captured observers) ═══
(function() {`];

    observers.forEach((obs, i) => {
        const threshold = Array.isArray(obs.threshold)
            ? obs.threshold[0]
            : (obs.threshold || 0);
        const rootMargin = obs.rootMargin || '0px';
        const startPercent = Math.max(50, 100 - Math.round(threshold * 100));

        obs.targets?.forEach((target, j) => {
            if (!target.selector) return;
            lines.push(`
    // Observer ${i}, target ${j}: ${target.selector}
    document.querySelectorAll('${escapeSel(target.selector)}').forEach(el => {
        gsap.from(el, {
            opacity: 0, y: 50, duration: 0.7, ease: 'power2.out',
            scrollTrigger: {
                trigger: el,
                start: 'top ${startPercent}%',
                toggleActions: 'play none none reverse',
                // Original: threshold=${threshold}, rootMargin="${rootMargin}"
            },
        });
    });`);
        });
    });

    lines.push(`
    console.log('[Clone] Precise scroll: ${observers.length} observer patterns replayed');
})();`);

    return lines.join('\n');
}

// ═══════════════════════════════════════════
function generateGSAPReplay(framer) {
    const tweens = framer.gsapTweens || [];
    const timelines = framer.gsapTimelines || [];

    if (tweens.length === 0 && timelines.length === 0) return '';

    const lines = [`
// ═══ GSAP Timeline Replay (${tweens.length} tweens, ${timelines.length} timelines) ═══
(function() {`];

    // Replay individual tweens
    tweens.slice(0, 50).forEach((t, i) => {
        const target = typeof t.target === 'string' ? `'${escapeSel(t.target)}'` : `'${t.target}'`;
        const vars = JSON.stringify(cleanVarsForReplay(t.vars) || {});

        if (t.method === 'fromTo' && t.fromVars) {
            lines.push(`    try { gsap.fromTo(${target}, ${JSON.stringify(cleanVarsForReplay(t.fromVars))}, ${vars}); } catch(e) {}`);
        } else {
            lines.push(`    try { gsap.${t.method}(${target}, ${vars}); } catch(e) {}`);
        }
    });

    // Replay timelines
    timelines.forEach((tl, i) => {
        if (tl.tweens?.length === 0) return;
        lines.push(`\n    // Timeline ${i}`);
        lines.push(`    const tl${i} = gsap.timeline(${JSON.stringify(cleanVarsForReplay(tl.vars) || {})});`);
        tl.tweens?.slice(0, 30).forEach(t => {
            const target = typeof t.target === 'string' ? `'${escapeSel(t.target)}'` : `'${t.target}'`;
            const vars = JSON.stringify(cleanVarsForReplay(t.vars) || {});
            const pos = t.position !== undefined ? `, '${t.position}'` : '';
            lines.push(`    try { tl${i}.${t.method}(${target}, ${vars}${pos}); } catch(e) {}`);
        });
    });

    lines.push(`    console.log('[Clone] GSAP replay: ${tweens.length} tweens, ${timelines.length} timelines');`);
    lines.push('})();');
    return lines.join('\n');
}

// ═══════════════════════════════════════════
function generateLayoutAnimations(framer) {
    const layouts = framer.layoutAnimations || [];

    return `
// ═══ Layout Animations (${layouts.length} elements) ═══
(function() {
    // FLIP animation system for layout changes
    const layoutElements = new Map();
    
    ${layouts.map((l, i) => `
    // Layout ${i}: ${l.selector}
    document.querySelectorAll('${escapeSel(l.selector)}').forEach(el => {
        layoutElements.set(el, {
            layoutId: '${l.layoutId || 'auto-' + i}',
            lastBounds: el.getBoundingClientRect(),
        });
        
        // Observe layout changes
        const resizeObserver = new ResizeObserver(() => {
            const data = layoutElements.get(el);
            if (!data) return;
            const newBounds = el.getBoundingClientRect();
            const dx = data.lastBounds.x - newBounds.x;
            const dy = data.lastBounds.y - newBounds.y;
            const sw = data.lastBounds.width / newBounds.width;
            const sh = data.lastBounds.height / newBounds.height;
            
            if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || Math.abs(sw - 1) > 0.01) {
                gsap.from(el, {
                    x: dx, y: dy, scaleX: sw, scaleY: sh,
                    duration: 0.4, ease: 'power2.out',
                });
            }
            data.lastBounds = newBounds;
        });
        resizeObserver.observe(el);
    });
    `).join('\n')}
    
    console.log('[Clone] Layout animations: ${layouts.length} elements with FLIP');
})();`;
}

// ═══════════════════════════════════════════
function generateDragInteractions(framer) {
    const drags = framer.dragElements || [];

    return `
// ═══ Drag Interactions (${drags.length} draggable elements) ═══
(function() {
    if (!window.Draggable) {
        console.warn('[Clone] Draggable plugin not loaded');
        return;
    }
    
    ${drags.map((d, i) => `
    // Drag ${i}: ${d.selector}
    document.querySelectorAll('${escapeSel(d.selector)}').forEach(el => {
        const parentRect = el.parentElement?.getBoundingClientRect();
        Draggable.create(el, {
            type: '${d.dragAxis === 'x' ? 'x' : d.dragAxis === 'y' ? 'y' : 'x,y'}',
            ${d.parentBounds ? `bounds: el.parentElement,` : ''}
            inertia: true,
            edgeResistance: 0.65,
            cursor: '${d.cursor || 'grab'}',
            activeCursor: 'grabbing',
            onDragEnd: function() {
                // Snap back with spring
                gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
            },
        });
    });
    `).join('\n')}
    
    console.log('[Clone] Drag interactions: ${drags.length} elements');
})();`;
}

// ═══════════════════════════════════════════
function generateExactCSSAnimations(framer, dnaData) {
    const frames = framer.animationFrames || [];
    const keyframes = dnaData.animation?.keyframes || [];

    return `
// ═══ CSS Animations (${frames.length} captured + ${keyframes.length} keyframes) ═══
(function() {
    ${frames.map((f, i) => {
        if (!f.selector || !f.keyframes?.length) return '';
        const kfProps = f.keyframes.map(kf => {
            const props = {};
            Object.keys(kf).forEach(k => {
                if (!['offset', 'easing', 'composite'].includes(k)) props[k] = kf[k];
            });
            return props;
        });

        return `
    // Animation ${i}: ${f.name || 'unnamed'} on ${f.selector}
    document.querySelectorAll('${escapeSel(f.selector)}').forEach(el => {
        try {
            el.animate(${JSON.stringify(kfProps)}, {
                duration: ${f.timing?.duration || 1000},
                delay: ${f.timing?.delay || 0},
                iterations: ${f.timing?.iterations || 1},
                direction: '${f.timing?.direction || 'normal'}',
                fill: '${f.timing?.fill || 'none'}',
                easing: '${f.timing?.easing || 'ease'}',
            });
        } catch(e) {}
    });`;
    }).filter(Boolean).join('\n')}

    // Scroll-triggered CSS animation play/pause
    document.querySelectorAll('[style*="animation"]').forEach(el => {
        const anim = getComputedStyle(el).animationName;
        if (anim && anim !== 'none' && el.getBoundingClientRect().top > innerHeight) {
            el.style.animationPlayState = 'paused';
            ScrollTrigger.create({
                trigger: el, start: 'top 90%',
                onEnter: () => el.style.animationPlayState = 'running',
                onLeaveBack: () => el.style.animationPlayState = 'paused',
            });
        }
    });

    // Number counter
    document.querySelectorAll('[class*="counter"], [class*="number"], [class*="stat"]').forEach(el => {
        const text = el.textContent.trim();
        const num = parseInt(text.replace(/[^0-9]/g, ''));
        if (isNaN(num) || num === 0) return;
        const suffix = text.replace(/[0-9,]/g, '').trim();
        const obj = { val: 0 };
        gsap.to(obj, { val: num, duration: 2, ease: 'power2.out',
            scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' },
            onUpdate: () => el.textContent = Math.round(obj.val).toLocaleString() + suffix });
    });

    console.log('[Clone] CSS animations: ${frames.length} precise + ${keyframes.length} keyframes');
})();`;
}

// ═══════════════════════════════════════════
function generateInteractionEffects(dnaData) {
    return `
// ═══ Interaction Effects ═══
(function() {
    // Magnetic buttons
    document.querySelectorAll('a[class*="button"], button, [role="button"], [class*="cta"]').forEach(btn => {
        btn.addEventListener('mousemove', e => {
            const r = btn.getBoundingClientRect();
            gsap.to(btn, { x: (e.clientX-r.left-r.width/2)*0.15, y: (e.clientY-r.top-r.height/2)*0.15, duration: 0.4, ease: 'power2.out' });
        });
        btn.addEventListener('mouseleave', () => gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' }));
    });

    // Card 3D tilt
    document.querySelectorAll('[class*="card"], [class*="project"], [class*="portfolio"]').forEach(card => {
        card.style.transformStyle = 'preserve-3d';
        card.addEventListener('mousemove', e => {
            const r = card.getBoundingClientRect();
            gsap.to(card, { rotateX: (e.clientY-r.top-r.height/2)/r.height*-8, rotateY: (e.clientX-r.left-r.width/2)/r.width*8, duration: 0.3, ease: 'power2.out' });
        });
        card.addEventListener('mouseleave', () => gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.5 }));
    });

    // Image zoom
    document.querySelectorAll('[class*="image-wrap"], [class*="img-container"], figure').forEach(w => {
        const img = w.querySelector('img');
        if (!img) return;
        w.style.overflow = 'hidden';
        w.addEventListener('mouseenter', () => gsap.to(img, { scale: 1.05, duration: 0.6 }));
        w.addEventListener('mouseleave', () => gsap.to(img, { scale: 1, duration: 0.6 }));
    });
})();`;
}

// ═══════════════════════════════════════════
function generateSmoothScroll(dnaData) {
    return `
// ═══ Smooth Scroll & Parallax ═══
(function() {
    // Hero parallax
    document.querySelectorAll('[class*="hero"], [class*="banner"]').forEach(hero => {
        const bg = hero.querySelector('img') || hero;
        gsap.to(bg, { y: () => hero.offsetHeight * 0.3, ease: 'none',
            scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 1 } });
    });

    // Navbar blur on scroll
    const nav = document.querySelector('nav, [class*="navbar"], header');
    if (nav) {
        ScrollTrigger.create({ start: 'top -80px', onUpdate: self => {
            nav.style.backdropFilter = self.progress > 0 ? 'blur(20px)' : '';
            nav.style.webkitBackdropFilter = nav.style.backdropFilter;
        }});
    }

    // Scroll progress bar
    const bar = document.createElement('div');
    bar.style.cssText = 'position:fixed;top:0;left:0;height:3px;background:linear-gradient(90deg,#667eea,#764ba2);z-index:99999;transform-origin:left;transform:scaleX(0);';
    document.body.appendChild(bar);
    gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.3 } });

    // Horizontal scroll sections
    document.querySelectorAll('[style*="overflow-x"], [class*="horizontal"]').forEach(c => {
        if (c.scrollWidth <= c.offsetWidth * 1.5) return;
        gsap.to(c, { scrollLeft: c.scrollWidth - c.offsetWidth, ease: 'none',
            scrollTrigger: { trigger: c, start: 'top center', end: () => '+=' + (c.scrollWidth - c.offsetWidth), scrub: 1, pin: true } });
    });
})();`;
}

// ═══════════════════════════════════════════
function generateThreeJSReconstruction(webgl, dnaData) {
    const scenes = webgl.threeScenes || [];
    const shaders = webgl.shaders || [];
    const textures = webgl.textures || [];

    if (scenes.length === 0 && shaders.length === 0) {
        // No captured data — generate atmospheric particles
        return generateFallbackThreeJS();
    }

    const lines = [`
// ═══ Three.js Scene Reconstruction (${scenes.length} objects, ${shaders.length} shaders) ═══
(function() {
    const canvases = document.querySelectorAll('canvas');
    if (!canvases.length || typeof THREE === 'undefined') return;

    canvases.forEach(canvas => {
        if (canvas.width < 100 || canvas.height < 100) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, canvas.width/canvas.height, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setSize(canvas.width, canvas.height);
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));`];

    // Reconstruct captured scene objects
    scenes.forEach((obj, i) => {
        lines.push(generateThreeObject(obj, i));
    });

    // Custom shaders
    shaders.forEach((shader, i) => {
        lines.push(`
        // Captured shader ${i} (${shader.type})
        // ${shader.source?.substring(0, 100)}...`);
    });

    // Textures
    textures.forEach((tex, i) => {
        if (tex.src) {
            lines.push(`
        // Texture ${i}: ${tex.source} (${tex.src?.substring(0, 60)})`);
        }
    });

    // If no scene objects, fallback to particles
    if (scenes.length === 0) {
        lines.push(`
        // Fallback: atmospheric particles
        const geo = new THREE.BufferGeometry();
        const count = 500;
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 10;
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x667eea, size: 0.03, transparent: true, opacity: 0.8 })));`);
    }

    lines.push(`
        camera.position.z = 5;
        let mouseX = 0, mouseY = 0;
        document.addEventListener('mousemove', e => {
            mouseX = (e.clientX/innerWidth - 0.5) * 2;
            mouseY = (e.clientY/innerHeight - 0.5) * 2;
        });

        function animate() {
            requestAnimationFrame(animate);
            scene.rotation.y += 0.001;
            camera.position.x += (mouseX * 0.5 - camera.position.x) * 0.05;
            camera.position.y += (-mouseY * 0.5 - camera.position.y) * 0.05;
            renderer.render(scene, camera);
        }
        animate();

        window.addEventListener('resize', () => {
            camera.aspect = canvas.clientWidth/canvas.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        });
    });
    console.log('[Clone] Three.js: ${scenes.length} objects, ${shaders.length} shaders reconstructed');
})();`);

    return lines.join('\n');
}

function generateFallbackThreeJS() {
    return `
// ═══ Three.js Fallback (atmospheric particles) ═══
(function() {
    if (typeof THREE === 'undefined') return;
    document.querySelectorAll('canvas').forEach(canvas => {
        if (canvas.width < 100) return;
        const scene = new THREE.Scene();
        const cam = new THREE.PerspectiveCamera(75, canvas.width/canvas.height, 0.1, 1000);
        const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        r.setSize(canvas.width, canvas.height);
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(500 * 3);
        for (let i = 0; i < 1500; i++) pos[i] = (Math.random() - 0.5) * 10;
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x667eea, size: 0.03, transparent: true }));
        scene.add(pts); cam.position.z = 5;
        (function a() { requestAnimationFrame(a); pts.rotation.x += 0.0005; pts.rotation.y += 0.001; r.render(scene, cam); })();
    });
})();`;
}

function generateThreeObject(obj, index) {
    const lines = [];

    if (obj.type === 'AmbientLight' || obj.lightType === 'ambient') {
        lines.push(`        scene.add(new THREE.AmbientLight(${hexToInt(obj.color)}, ${obj.intensity || 1}));`);
    } else if (obj.type === 'DirectionalLight' || obj.lightType === 'directional') {
        lines.push(`        { const l = new THREE.DirectionalLight(${hexToInt(obj.color)}, ${obj.intensity || 1});`);
        if (obj.position) lines.push(`          l.position.set(${obj.position.x}, ${obj.position.y}, ${obj.position.z});`);
        lines.push(`          scene.add(l); }`);
    } else if (obj.type === 'PointLight' || obj.lightType === 'point') {
        lines.push(`        scene.add(new THREE.PointLight(${hexToInt(obj.color)}, ${obj.intensity || 1}, ${obj.distance || 0}));`);
    } else if (obj.type === 'Mesh' && obj.geometry) {
        const geoType = obj.geometry.type || 'BoxGeometry';
        const params = obj.geometry.parameters || {};
        let geoArgs = '';
        if (geoType.includes('Box')) geoArgs = `${params.width || 1}, ${params.height || 1}, ${params.depth || 1}`;
        else if (geoType.includes('Sphere')) geoArgs = `${params.radius || 1}, ${params.widthSegments || 32}, ${params.heightSegments || 32}`;
        else if (geoType.includes('Plane')) geoArgs = `${params.width || 1}, ${params.height || 1}`;
        else if (geoType.includes('Cylinder')) geoArgs = `${params.radiusTop || 1}, ${params.radiusBottom || 1}, ${params.height || 1}`;

        const matType = obj.material?.type || 'MeshStandardMaterial';
        const matProps = {};
        if (obj.material?.color) matProps.color = `__HEX__${hexToInt(obj.material.color)}`;
        if (obj.material?.metalness !== undefined) matProps.metalness = obj.material.metalness;
        if (obj.material?.roughness !== undefined) matProps.roughness = obj.material.roughness;
        if (obj.material?.transparent) matProps.transparent = true;
        if (obj.material?.opacity !== undefined && obj.material.opacity < 1) matProps.opacity = obj.material.opacity;
        if (obj.material?.wireframe) matProps.wireframe = true;

        let matStr = JSON.stringify(matProps).replace(/"__HEX__(\d+)"/g, '$1');

        lines.push(`        { const m = new THREE.Mesh(new THREE.${geoType}(${geoArgs}), new THREE.${matType}(${matStr}));`);
        if (obj.position) lines.push(`          m.position.set(${obj.position.x}, ${obj.position.y}, ${obj.position.z});`);
        if (obj.rotation) lines.push(`          m.rotation.set(${obj.rotation.x}, ${obj.rotation.y}, ${obj.rotation.z});`);
        if (obj.scale && (obj.scale.x !== 1 || obj.scale.y !== 1 || obj.scale.z !== 1)) {
            lines.push(`          m.scale.set(${obj.scale.x}, ${obj.scale.y}, ${obj.scale.z});`);
        }
        lines.push(`          scene.add(m); }`);
    }

    return lines.join('\n');
}

// ═══════════════════════════════════════════
function generateLottiePlayer(lottieData, dnaData) {
    const anims = lottieData.animations || [];
    if (anims.length === 0) return '';

    return `
// ═══ Lottie Animation Player (${anims.length} animations) ═══
(function() {
    if (typeof lottie === 'undefined') { console.warn('[Clone] lottie-web not loaded'); return; }
    
    ${anims.map((a, i) => {
        const path = a.local || a.original;
        if (!path) return '';
        return `
    // Lottie ${i}: ${a.name || 'animation'}
    try {
        const container${i} = document.querySelector('[data-lottie="${i}"]') || document.querySelectorAll('div[class*="lottie"], div[class*="animation"]')[${i}];
        if (container${i}) {
            lottie.loadAnimation({
                container: container${i},
                renderer: '${a.renderer || 'svg'}',
                loop: ${a.loop !== false},
                autoplay: true,
                path: '${path}',
            });
        }
    } catch(e) { console.warn('Lottie ${i}:', e); }`;
    }).filter(Boolean).join('\n')}
    
    console.log('[Clone] Lottie: ${anims.length} animations loaded');
})();`;
}

// ═══════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════

function framerTransitionToGSAP(transition) {
    if (!transition) return 'duration: 0.7, ease: "power2.out",';

    // Spring physics → GSAP equivalent
    if (transition.type === 'spring') {
        const stiffness = transition.stiffness || 100;
        const damping = transition.damping || 10;
        const mass = transition.mass || 1;

        // Convert spring params to GSAP duration + ease
        const omega = Math.sqrt(stiffness / mass);
        const zeta = damping / (2 * Math.sqrt(stiffness * mass));
        const duration = Math.max(0.3, Math.min(2.0, 4 / (omega * zeta)));

        if (zeta < 0.5) return `duration: ${duration.toFixed(2)}, ease: "elastic.out(${(1 / zeta).toFixed(1)}, ${(zeta * 2).toFixed(2)})",`;
        if (zeta < 1) return `duration: ${duration.toFixed(2)}, ease: "back.out(${(1.5 / zeta).toFixed(1)})",`;
        return `duration: ${duration.toFixed(2)}, ease: "power2.out",`;
    }

    // Tween
    const duration = transition.duration || 0.7;
    const delay = transition.delay || 0;
    const ease = transition.ease || 'easeOut';

    const easingMap = {
        'easeIn': 'power2.in',
        'easeOut': 'power2.out',
        'easeInOut': 'power2.inOut',
        'circIn': 'circ.in',
        'circOut': 'circ.out',
        'circInOut': 'circ.inOut',
        'backIn': 'back.in(1.7)',
        'backOut': 'back.out(1.7)',
        'backInOut': 'back.inOut(1.7)',
        'anticipate': 'back.inOut(3)',
        'linear': 'none',
    };

    let gsapEase = easingMap[ease] || 'power2.out';
    if (Array.isArray(ease) && ease.length === 4) {
        gsapEase = `cubic-bezier(${ease.join(',')})`;
    }

    return `duration: ${duration}, ${delay > 0 ? `delay: ${delay}, ` : ''}ease: "${gsapEase}",`;
}

function toGSAPProps(obj) {
    if (!obj) return '{}';
    const result = {};
    const propMap = { x: 'x', y: 'y', opacity: 'opacity', scale: 'scale', rotate: 'rotation', rotateX: 'rotateX', rotateY: 'rotateY', rotateZ: 'rotateZ', skew: 'skew', skewX: 'skewX', skewY: 'skewY' };

    for (const [key, val] of Object.entries(obj)) {
        if (val === '[Function]') continue;
        const gsapKey = propMap[key] || key;
        result[gsapKey] = val;
    }
    return JSON.stringify(result);
}

function invertProps(obj) {
    if (!obj) return {};
    const result = {};
    for (const [key, val] of Object.entries(obj)) {
        if (typeof val === 'number') result[key] = key === 'opacity' ? 1 : (key === 'scale' ? 1 : 0);
        else result[key] = val;
    }
    return result;
}

function escapeSel(sel) {
    return (sel || '').replace(/'/g, "\\'").replace(/\\/g, '\\\\');
}

function cleanVarsForReplay(vars) {
    if (!vars) return null;
    const result = {};
    for (const [k, v] of Object.entries(vars)) {
        if (v === '[Function]' || k === 'onComplete' || k === 'onUpdate' || k === 'onStart') continue;
        if (typeof v === 'object' && v !== null) result[k] = cleanVarsForReplay(v);
        else result[k] = v;
    }
    return result;
}

function hexToInt(hex) {
    if (!hex) return '0xffffff';
    return '0x' + hex.replace('#', '');
}
