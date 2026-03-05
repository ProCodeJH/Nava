/**
 * ═══════════════════════════════════════════════════════════════
 *  DESIGN-DNA — FRAMER MOTION CODE GENERATOR
 *  Ported from clone-engine v3.0 ULTRA
 *
 *  Converts extracted Framer dynamics → framer-motion React code
 *  Generates: hooks, CSS, component wrappers, marquee, tilt 3D
 * ═══════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';

export function generateFramerMotionCode(framerDynamics, outputDir, animationPatterns = null) {
    console.log('   🎬 [Framer] Generating framer-motion code from dynamics...');

    if (!framerDynamics || Object.keys(framerDynamics).length === 0) {
        console.log('   ⚠️  No framer dynamics data found, skipping');
        return null;
    }

    const output = {
        hooks: '',
        motionCSS: '',
        componentSnippets: [],
    };

    // 1. Generate useScrollAnimations hook
    output.hooks = generateScrollHook(framerDynamics);

    // 2. Generate hover animation styles
    output.motionCSS = generateMotionCSS(framerDynamics);

    // 3. Generate component motion wrapper snippets
    output.componentSnippets = generateMotionSnippets(framerDynamics);

    // Write files
    const framerDir = path.join(outputDir, 'src', 'framer');
    fs.mkdirSync(framerDir, { recursive: true });

    // useScrollAnimations.ts
    fs.writeFileSync(path.join(framerDir, 'useScrollAnimations.ts'), output.hooks);
    console.log('   ✅ Generated useScrollAnimations.ts');

    // motion-overrides.css
    fs.writeFileSync(path.join(framerDir, 'motion-overrides.css'), output.motionCSS);
    console.log('   ✅ Generated motion-overrides.css');

    // MotionWrappers.tsx (enhanced with patterns if available)
    const wrappersCode = generateMotionWrappers(framerDynamics, animationPatterns);
    fs.writeFileSync(path.join(framerDir, 'MotionWrappers.tsx'), wrappersCode);
    console.log('   ✅ Generated MotionWrappers.tsx');

    // framer-config.json (raw data for manual tweaking)
    fs.writeFileSync(path.join(framerDir, 'framer-config.json'),
        JSON.stringify(framerDynamics, null, 2));
    console.log('   ✅ Generated framer-config.json');

    // GsapScrollAnimations.tsx (GSAP ScrollTrigger output)
    const gsapCode = generateGsapScrollCode(framerDynamics);
    fs.writeFileSync(path.join(framerDir, 'GsapScrollAnimations.tsx'), gsapCode);
    console.log('   ✅ Generated GsapScrollAnimations.tsx');

    // ── Pattern-based generators ──────────────────────────
    if (animationPatterns && animationPatterns.patterns && animationPatterns.patterns.length > 0) {
        const patterns = animationPatterns.patterns;

        // MarqueeAnimation.tsx
        const marqueePatterns = patterns.filter(p => p.pattern === 'MARQUEE');
        if (marqueePatterns.length > 0) {
            fs.writeFileSync(path.join(framerDir, 'MarqueeAnimation.tsx'), generateMarqueeComponent(marqueePatterns));
            console.log('   ✅ Generated MarqueeAnimation.tsx');
        }

        // Tilt3DCard.tsx
        const tiltPatterns = patterns.filter(p => ['TILT_3D', 'FLIP_CARD', 'PERSPECTIVE_HOVER'].includes(p.pattern));
        if (tiltPatterns.length > 0) {
            fs.writeFileSync(path.join(framerDir, 'Tilt3DCard.tsx'), generateTilt3DComponent(tiltPatterns));
            console.log('   ✅ Generated Tilt3DCard.tsx');
        }

        // animations.ts — all pattern configs as typed constants
        fs.writeFileSync(path.join(framerDir, 'animations.ts'), generateAnimationsConfig(patterns));
        console.log('   ✅ Generated animations.ts');
    }

    return output;
}


// ═══════════════════════════════════════════════════════════════
//  1. SCROLL ANIMATION HOOK
// ═══════════════════════════════════════════════════════════════
function generateScrollHook(dynamics) {
    const scrollAnims = dynamics.scrollAnimations || [];
    const parallax = dynamics.parallaxElements || [];

    if (scrollAnims.length === 0 && parallax.length === 0) {
        return `// No scroll animations detected\nexport function useScrollAnimations() { return {}; }\n`;
    }

    let code = `/**
 * Auto-generated scroll animations from Design-DNA Clone Engine
 * Extracted from original Framer site dynamics
 */
import { useScroll, useTransform, useSpring, useMotionValueEvent, MotionValue } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

// ─── Scroll Animation Configs ────────────────────────────────
export const SCROLL_ANIMATIONS = ${JSON.stringify(scrollAnims.map(a => ({
        id: a.id || a.framerName,
        types: a.animationTypes,
        scrollRange: a.scrollRange,
        changes: a.changes?.slice(0, 3).map(c => {
            const clean = {};
            for (const [k, v] of Object.entries(c)) {
                if (k !== 'scrollFrom' && k !== 'scrollTo' && k !== '_positionDelta') {
                    clean[k] = v;
                }
            }
            return { scrollFrom: c.scrollFrom, scrollTo: c.scrollTo, props: clean };
        }),
    })), null, 2)};

// ─── Parallax Configs ────────────────────────────────────────
export const PARALLAX_ELEMENTS = ${JSON.stringify(parallax.map(p => ({
        id: p.id || p.framerName,
        speed: Math.round(p.speed * 1000) / 1000,
        direction: p.direction,
    })), null, 2)};

// ─── useScrollAnimation hook ─────────────────────────────────
export function useScrollAnimation(ref: React.RefObject<HTMLElement | null>) {
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"],
    });

    return { scrollYProgress };
}

// ─── useParallax hook ────────────────────────────────────────
export function useParallax(ref: React.RefObject<HTMLElement | null>, speed: number = 0.5) {
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"],
    });

    const y = useTransform(scrollYProgress, [0, 1], [speed * -100, speed * 100]);
    const smoothY = useSpring(y, { stiffness: 100, damping: 30 });

    return { y: smoothY, scrollYProgress };
}

// ─── useFadeIn hook ──────────────────────────────────────────
export function useFadeIn(ref: React.RefObject<HTMLElement | null>, threshold = 0.2) {
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"],
    });

    const opacity = useTransform(scrollYProgress, [0, threshold, 1 - threshold, 1], [0, 1, 1, 0]);

    return { opacity, scrollYProgress };
}

// ─── useReveal hook ──────────────────────────────────────────
export function useReveal(ref: React.RefObject<HTMLElement | null>) {
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"],
    });

    const clipPath = useTransform(
        scrollYProgress,
        [0, 0.3, 0.7, 1],
        ["inset(100% 0% 0% 0%)", "inset(0% 0% 0% 0%)", "inset(0% 0% 0% 0%)", "inset(0% 0% 100% 0%)"]
    );

    return { clipPath, scrollYProgress };
}
`;

    return code;
}


// ═══════════════════════════════════════════════════════════════
//  2. HOVER / INTERACTION CSS
// ═══════════════════════════════════════════════════════════════
function generateMotionCSS(dynamics) {
    const hovers = dynamics.hoverInteractions || [];
    const keyframes = dynamics.keyframeAnimations || {};

    let css = `/* Auto-generated motion CSS from Design-DNA Clone Engine */\n/* Extracted hover interactions and keyframe animations */\n\n`;

    // Generate keyframe animations
    for (const [name, frames] of Object.entries(keyframes)) {
        if (name.startsWith('__framer')) continue;
        css += `@keyframes ${name} {\n`;
        for (const [offset, props] of Object.entries(frames)) {
            css += `  ${offset} {\n`;
            for (const [prop, val] of Object.entries(props)) {
                const kebab = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
                css += `    ${kebab}: ${val};\n`;
            }
            css += `  }\n`;
        }
        css += `}\n\n`;
    }

    // Generate hover states from extracted interactions
    for (const hover of hovers) {
        const selector = hover.id ? `#${hover.id}` :
            hover.framerName ? `[data-framer-name="${hover.framerName}"]` :
                null;
        if (!selector) continue;

        const changes = hover.hoverChanges || {};
        if (Object.keys(changes).length === 0) continue;

        css += `${selector} {\n`;
        if (hover.transition?.duration && hover.transition.duration !== '0s') {
            css += `  transition: ${hover.transition.property || 'all'} ${hover.transition.duration} ${hover.transition.timing || 'ease'};\n`;
        } else {
            css += `  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);\n`;
        }
        css += `}\n\n`;

        css += `${selector}:hover {\n`;
        for (const [prop, { to }] of Object.entries(changes)) {
            const kebab = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
            css += `  ${kebab}: ${to};\n`;
        }
        css += `}\n\n`;
    }

    return css;
}


// ═══════════════════════════════════════════════════════════════
//  3. MOTION SNIPPETS (per-element motion props)
// ═══════════════════════════════════════════════════════════════
function generateMotionSnippets(dynamics) {
    const snippets = [];
    const scrollAnims = dynamics.scrollAnimations || [];
    const hovers = dynamics.hoverInteractions || [];

    for (const anim of scrollAnims) {
        const types = anim.animationTypes || [];
        const motionProps = {};

        if (types.includes('fade')) {
            motionProps.initial = { opacity: 0 };
            motionProps.whileInView = { opacity: 1 };
            motionProps.viewport = { once: false, amount: 0.3 };
        }
        if (types.includes('transform') || types.includes('parallax')) {
            motionProps.initial = { ...(motionProps.initial || {}), y: 50 };
            motionProps.whileInView = { ...(motionProps.whileInView || {}), y: 0 };
        }
        if (types.includes('scale')) {
            motionProps.initial = { ...(motionProps.initial || {}), scale: 0.9 };
            motionProps.whileInView = { ...(motionProps.whileInView || {}), scale: 1 };
        }

        if (Object.keys(motionProps).length > 0) {
            motionProps.transition = { duration: 0.6, ease: [0.16, 1, 0.3, 1] };
            snippets.push({
                id: anim.id || anim.framerName,
                framerName: anim.framerName,
                motionProps,
            });
        }
    }

    for (const hover of hovers) {
        const changes = hover.hoverChanges || {};
        const whileHover = {};

        for (const [prop, { to }] of Object.entries(changes)) {
            if (prop === 'opacity') whileHover.opacity = parseFloat(to);
            else if (prop === 'scale') whileHover.scale = parseFloat(to);
            else if (prop === 'backgroundColor') whileHover.backgroundColor = to;
            else if (prop === 'color') whileHover.color = to;
            else if (prop === 'boxShadow') whileHover.boxShadow = to;
        }

        if (Object.keys(whileHover).length > 0) {
            snippets.push({
                id: hover.id,
                framerName: hover.framerName,
                text: hover.text,
                motionProps: {
                    whileHover,
                    whileTap: { scale: 0.97 },
                    transition: { duration: 0.2 },
                },
            });
        }
    }

    return snippets;
}


// ═══════════════════════════════════════════════════════════════
//  4. MOTION WRAPPERS COMPONENT
// ═══════════════════════════════════════════════════════════════
function generateMotionWrappers(dynamics, animationPatterns = null) {
    const scrollAnims = dynamics.scrollAnimations || [];
    const parallax = dynamics.parallaxElements || [];
    const activeAnims = dynamics.activeAnimations || [];

    let code = `/**
 * Auto-generated Motion Wrappers from Design-DNA Clone Engine
 * Wrap your sections with these for exact Framer-like animations
 */
import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion';

// ─── FadeInOnScroll ──────────────────────────────────────────
export const FadeInOnScroll: React.FC<{
    children: React.ReactNode;
    delay?: number;
    duration?: number;
    y?: number;
}> = ({ children, delay = 0, duration = 0.8, y = 40 }) => (
    <motion.div
        initial={{ opacity: 0, y }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.2 }}
        transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
    >
        {children}
    </motion.div>
);

// ─── ScaleOnScroll ───────────────────────────────────────────
export const ScaleOnScroll: React.FC<{
    children: React.ReactNode;
    from?: number;
    to?: number;
}> = ({ children, from = 0.85, to = 1 }) => (
    <motion.div
        initial={{ scale: from, opacity: 0 }}
        whileInView={{ scale: to, opacity: 1 }}
        viewport={{ once: false, amount: 0.3 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
        {children}
    </motion.div>
);

// ─── ParallaxWrapper ─────────────────────────────────────────
export const ParallaxWrapper: React.FC<{
    children: React.ReactNode;
    speed?: number;
}> = ({ children, speed = 0.5 }) => {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"],
    });
    const y = useTransform(scrollYProgress, [0, 1], [speed * -100, speed * 100]);
    const smoothY = useSpring(y, { stiffness: 100, damping: 30, restDelta: 0.001 });

    return (
        <motion.div ref={ref} style={{ y: smoothY }}>
            {children}
        </motion.div>
    );
};

// ─── RevealOnScroll ──────────────────────────────────────────
export const RevealOnScroll: React.FC<{
    children: React.ReactNode;
    direction?: 'up' | 'down' | 'left' | 'right';
}> = ({ children, direction = 'up' }) => {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"],
    });

    const clipPaths: Record<string, [string, string]> = {
        up: ["inset(100% 0% 0% 0%)", "inset(0% 0% 0% 0%)"],
        down: ["inset(0% 0% 100% 0%)", "inset(0% 0% 0% 0%)"],
        left: ["inset(0% 100% 0% 0%)", "inset(0% 0% 0% 0%)"],
        right: ["inset(0% 0% 0% 100%)", "inset(0% 0% 0% 0%)"],
    };

    const clipPath = useTransform(scrollYProgress, [0, 0.4], clipPaths[direction]);

    return (
        <motion.div ref={ref} style={{ clipPath, overflow: 'hidden' }}>
            {children}
        </motion.div>
    );
};

// ─── HoverScale ──────────────────────────────────────────────
export const HoverScale: React.FC<{
    children: React.ReactNode;
    scale?: number;
}> = ({ children, scale = 1.05 }) => (
    <motion.div
        whileHover={{ scale }}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
    >
        {children}
    </motion.div>
);

// ─── StaggerChildren ────────────────────────────────────────
export const StaggerChildren: React.FC<{
    children: React.ReactNode;
    staggerDelay?: number;
}> = ({ children, staggerDelay = 0.1 }) => (
    <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.2 }}
        variants={{
            hidden: {},
            visible: { transition: { staggerChildren: staggerDelay } },
        }}
    >
        {React.Children.map(children, (child) => (
            <motion.div
                variants={{
                    hidden: { opacity: 0, y: 30 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
                }}
            >
                {child}
            </motion.div>
        ))}
    </motion.div>
);

`;

    // ─── MarqueeScroll (from active translateX animations) ───────
    if (activeAnims.length > 0) {
        const marqueeAnims = activeAnims.filter(a => {
            const kf = a.keyframes || [];
            return kf.some(k => {
                const t = k?.properties?.transform || '';
                return t.includes('translateX');
            });
        });

        if (marqueeAnims.length > 0) {
            const defaultDuration = (marqueeAnims[0].duration / 1000).toFixed(3);
            code += `
// ─── MarqueeScroll ───────────────────────────────────────────
// Extracted from ACTIVE_ANIMATIONS: ${marqueeAnims.length} infinite translateX loops detected
export const MarqueeScroll: React.FC<{
    children: React.ReactNode;
    duration?: number;
    direction?: 'left' | 'right';
    pauseOnHover?: boolean;
    gap?: number;
    className?: string;
}> = ({
    children,
    duration = ${defaultDuration},
    direction = 'left',
    pauseOnHover = true,
    gap = 32,
    className = '',
}) => {
    const trackStyle: React.CSSProperties = {
        display: 'flex',
        gap: \`\${gap}px\`,
        width: 'max-content',
        animation: \`marquee-scroll \${duration}s linear infinite\`,
        animationDirection: direction === 'right' ? 'reverse' : 'normal',
    };

    return (
        <div className={className} style={{ overflow: 'hidden', width: '100%', position: 'relative' }}>
            <div
                style={trackStyle}
                onMouseEnter={(e) => { if (pauseOnHover) e.currentTarget.style.animationPlayState = 'paused'; }}
                onMouseLeave={(e) => { if (pauseOnHover) e.currentTarget.style.animationPlayState = 'running'; }}
            >
                {children}
                <div aria-hidden="true" style={{ display: 'flex', gap: \`\${gap}px\` }}>{children}</div>
            </div>
            <style>{\`
            @keyframes marquee-scroll {
                    from { transform: translateX(0); }
                    to   { transform: translateX(-50%); }
            }
            \`}</style>
        </div>
    );
};

`;
        }
    }

    // ─── Tilt3DCard + FlipCard ────────────────────────────────────
    code += `
// ─── Tilt3DCard ──────────────────────────────────────────────
export const Tilt3DCard: React.FC<{
    children: React.ReactNode;
    perspective?: number;
    maxTilt?: number;
    scale?: number;
    springConfig?: { stiffness: number; damping: number };
    glare?: boolean;
    className?: string;
    style?: React.CSSProperties;
}> = ({
    children,
    perspective = 1000,
    maxTilt = 15,
    scale = 1.03,
    springConfig = { stiffness: 300, damping: 30 },
    glare = false,
    className = '',
    style = {},
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [maxTilt, -maxTilt]), springConfig);
    const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-maxTilt, maxTilt]), springConfig);
    const scaleVal = useSpring(1, springConfig);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
        mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
        scaleVal.set(scale);
    };
    const handleMouseLeave = () => { mouseX.set(0); mouseY.set(0); scaleVal.set(1); };

    return (
        <motion.div ref={ref} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}
            className={className}
            style={{ perspective, transformStyle: 'preserve-3d' as const, rotateX, rotateY, scale: scaleVal, ...style }}>
            {children}
            {glare && (
                <motion.div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 'inherit',
                    background: useTransform(mouseX, [-0.5, 0.5], [
                        'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)',
                        'linear-gradient(225deg, rgba(255,255,255,0.15) 0%, transparent 50%)',
                    ]),
                }} />
            )}
        </motion.div>
    );
};

// ─── FlipCard ────────────────────────────────────────────────
export const FlipCard: React.FC<{
    front: React.ReactNode;
    back: React.ReactNode;
    perspective?: number;
    className?: string;
}> = ({ front, back, perspective = 1000, className = '' }) => {
    const [isFlipped, setIsFlipped] = React.useState(false);
    return (
        <div className={className} style={{ perspective, cursor: 'pointer' }}
            onClick={() => setIsFlipped(!isFlipped)}>
            <motion.div
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: 'spring', stiffness: 200, damping: 25 }}
                style={{ transformStyle: 'preserve-3d' as const, position: 'relative' }}>
                <div style={{ backfaceVisibility: 'hidden' }}>{front}</div>
                <div style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0, transform: 'rotateY(180deg)' }}>
                    {back}
                </div>
            </motion.div>
        </div>
    );
};

`;

    // ─── Generated Parallax configs ──────────────────────────
    if (parallax.length > 0) {
        code += `\n// ─── Extracted Parallax Configs ───────────────────────────────\n`;
        code += `export const PARALLAX_CONFIG = [\n`;
        for (const p of parallax) {
            code += `  { id: ${JSON.stringify(p.id || p.framerName)}, speed: ${Math.round(p.speed * 1000) / 1000}, direction: "${p.direction}" },\n`;
        }
        code += `];\n`;
    }

    // ─── Generated Active Animation configs ──────────────────
    if (activeAnims.length > 0) {
        code += `\n// ─── Active Animations Detected ──────────────────────────────\n`;
        code += `export const ACTIVE_ANIMATIONS = ${JSON.stringify(activeAnims.map(a => ({
            element: a.element?.framerName || a.element?.id || a.element?.tag,
            name: a.name,
            duration: a.duration,
            iterations: a.iterations,
            direction: a.direction,
            easing: a.easing,
            keyframes: a.keyframes?.slice(0, 3),
        })), null, 2)};\n`;
    }

    return code;
}


// ═══════════════════════════════════════════════════════════════
//  5. GSAP SCROLLTRIGGER COMPONENT
// ═══════════════════════════════════════════════════════════════
function generateGsapScrollCode(dynamics) {
    const scrollAnims = dynamics.scrollAnimations || [];
    const parallax = dynamics.parallaxElements || [];

    if (scrollAnims.length === 0 && parallax.length === 0) {
        return `// No scroll animations detected for GSAP\nexport function GsapScrollAnimations() { return null; }\n`;
    }

    let code = `/**
 * Auto-generated GSAP ScrollTrigger code from Design-DNA Clone Engine
 * Implements the Dual Output strategy: GSAP for scrolling, Motion for interaction
 */
import React, { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

// ─── GsapParallax Wrapper ──────────────────────────────────────
export const GsapParallax: React.FC<{
    children: React.ReactNode;
    speed?: number;
    className?: string;
}> = ({ children, speed = 0.5, className = '' }) => {
    const container = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        if (!container.current) return;
        
        gsap.to(container.current, {
            y: () => window.innerHeight * speed,
            ease: "none",
            scrollTrigger: {
                trigger: container.current,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
                invalidateOnRefresh: true,
            }
        });
    }, { scope: container });

    return (
        <div ref={container} className={className}>
            {children}
        </div>
    );
};

// ─── GsapRevealOnScroll Wrapper ───────────────────────────────
export const GsapRevealOnScroll: React.FC<{
    children: React.ReactNode;
    className?: string;
}> = ({ children, className = '' }) => {
    const container = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        if (!container.current) return;
        
        gsap.fromTo(container.current, 
            { opacity: 0, y: 50 },
            {
                opacity: 1, 
                y: 0,
                duration: 0.8,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: container.current,
                    start: "top 85%",
                    toggleActions: "play none none reverse",
                }
            }
        );
    }, { scope: container });

    return (
        <div ref={container} className={className}>
            {children}
        </div>
    );
};

// ─── GsapBatchReveal Wrapper ───────────────────────────────────
export const GsapBatchReveal: React.FC<{
    children: React.ReactNode;
    className?: string;
}> = ({ children, className = '' }) => {
    const container = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        if (!container.current) return;
        
        const items = container.current.children;
        if (items.length === 0) return;

        gsap.set(items, { opacity: 0, y: 30 });

        ScrollTrigger.batch(items, {
            onEnter: (elements) => {
                gsap.to(elements, {
                    opacity: 1,
                    y: 0,
                    duration: 0.6,
                    stagger: 0.1,
                    ease: "power2.out",
                    overwrite: true
                });
            },
            onLeaveBack: (elements) => {
                gsap.set(elements, { opacity: 0, y: 30, overwrite: true });
            }
        });
    }, { scope: container });

    return (
        <div ref={container} className={className}>
            {children}
        </div>
    );
};

`;

    return code;
}


// ═══════════════════════════════════════════════════════════════
//  6. MARQUEE ANIMATION COMPONENT
// ═══════════════════════════════════════════════════════════════
function generateMarqueeComponent(marqueePatterns) {
    const first = marqueePatterns[0];
    const duration = first?.params?.duration || first?.cssAnimation?.duration || '20s';
    const direction = first?.params?.direction || 'normal';

    return `/**
 * MarqueeAnimation — Auto-generated by Design-DNA Clone Engine
 * Infinite horizontal scroll animation (CSS-based)
 * Detected ${marqueePatterns.length} marquee pattern(s) from source site
 */
import React from 'react';

interface MarqueeProps {
  children: React.ReactNode;
  duration?: string;
  direction?: 'normal' | 'reverse';
  pauseOnHover?: boolean;
  gap?: string;
  className?: string;
}

export const MarqueeAnimation: React.FC<MarqueeProps> = ({
  children,
  duration = '${duration}',
  direction = '${direction}',
  pauseOnHover = true,
  gap = '2rem',
  className = '',
}) => {
  return (
    <div
      className={\`marquee-container \${className}\`}
      style={{
        overflow: 'hidden',
        width: '100%',
        position: 'relative',
      }}
    >
      <div
        className="marquee-track"
        style={{
          display: 'flex',
          gap,
          animation: \`marquee-scroll \${duration} linear infinite \${direction}\`,
          width: 'max-content',
        }}
        onMouseEnter={(e) => {
          if (pauseOnHover) e.currentTarget.style.animationPlayState = 'paused';
        }}
        onMouseLeave={(e) => {
          if (pauseOnHover) e.currentTarget.style.animationPlayState = 'running';
        }}
      >
        {children}
        {/* Duplicate for seamless loop */}
        <div aria-hidden style={{ display: 'flex', gap }}>{children}</div>
      </div>

      <style>{\`
        @keyframes marquee-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      \`}</style>
    </div>
  );
};

export default MarqueeAnimation;
`;
}


// ═══════════════════════════════════════════════════════════════
//  6. TILT 3D CARD COMPONENT
// ═══════════════════════════════════════════════════════════════
function generateTilt3DComponent(tiltPatterns) {
    const first = tiltPatterns[0];
    const perspective = first?.params?.perspective || '1000px';
    const maxTilt = first?.params?.maxTilt || 15;
    const hasFlip = tiltPatterns.some(p => p.pattern === 'FLIP_CARD');

    let code = `/**
 * Tilt3DCard — Auto-generated by Design-DNA Clone Engine
 * Mouse-tracking 3D perspective tilt effect
 * Detected ${tiltPatterns.length} 3D pattern(s): ${[...new Set(tiltPatterns.map(p => p.pattern))].join(', ')}
 */
import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface Tilt3DCardProps {
  children: React.ReactNode;
  perspective?: number;
  maxTilt?: number;
  scale?: number;
  springConfig?: { stiffness: number; damping: number };
  className?: string;
  style?: React.CSSProperties;
}

export const Tilt3DCard: React.FC<Tilt3DCardProps> = ({
  children,
  perspective = ${parseInt(perspective)},
  maxTilt = ${maxTilt},
  scale = 1.02,
  springConfig = { stiffness: 300, damping: 30 },
  className = '',
  style = {},
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [maxTilt, -maxTilt]), springConfig);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-maxTilt, maxTilt]), springConfig);
  const scaleVal = useSpring(1, springConfig);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
    scaleVal.set(scale);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    scaleVal.set(1);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{
        perspective,
        transformStyle: 'preserve-3d',
        rotateX,
        rotateY,
        scale: scaleVal,
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
};
`;

    if (hasFlip) {
        code += `
// ─── FlipCard ────────────────────────────────────────────────
interface FlipCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  perspective?: number;
  duration?: number;
  className?: string;
}

export const FlipCard: React.FC<FlipCardProps> = ({
  front,
  back,
  perspective = ${parseInt(perspective)},
  duration = 0.6,
  className = '',
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className={className}
      style={{ perspective, cursor: 'pointer' }}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration, type: 'spring', stiffness: 200, damping: 25 }}
        style={{ transformStyle: 'preserve-3d', position: 'relative' }}
      >
        <div style={{ backfaceVisibility: 'hidden' }}>{front}</div>
        <div
          style={{
            backfaceVisibility: 'hidden',
            position: 'absolute',
            inset: 0,
            transform: 'rotateY(180deg)',
          }}
        >
          {back}
        </div>
      </motion.div>
    </div>
  );
};
`;
    }

    code += `\nexport default Tilt3DCard;\n`;
    return code;
}


// ═══════════════════════════════════════════════════════════════
//  7. ANIMATIONS CONFIG (TypeScript constants)
// ═══════════════════════════════════════════════════════════════
function generateAnimationsConfig(patterns) {
    const grouped = {};
    for (const p of patterns) {
        if (!grouped[p.pattern]) grouped[p.pattern] = [];
        grouped[p.pattern].push(p);
    }

    let code = `/**
 * animations.ts — Auto-generated by Design-DNA Clone Engine
 * ${patterns.length} animation patterns extracted from source site
 * 
 * Usage:
 *   import { SCROLL_PRESETS, HOVER_PRESETS } from './animations';
 *   <motion.div {...SCROLL_PRESETS.fadeIn} />
 */
import type { Variants, Transition } from 'framer-motion';

// ─── Types ───────────────────────────────────────────────────
export interface AnimationPreset {
  initial?: Record<string, any>;
  animate?: Record<string, any>;
  whileInView?: Record<string, any>;
  whileHover?: Record<string, any>;
  exit?: Record<string, any>;
  transition?: Transition;
  viewport?: { once?: boolean; amount?: number };
}

`;

    // Scroll presets
    const scrollTypes = ['SCROLL_FADE_IN', 'SCROLL_SLIDE_UP', 'SCROLL_SLIDE_LEFT', 'SCROLL_ZOOM', 'SCROLL_REVEAL', 'SCROLL_COLOR'];
    const scrollPatterns = patterns.filter(p => scrollTypes.includes(p.pattern));
    if (scrollPatterns.length > 0) {
        code += `// ─── Scroll Animation Presets ─────────────────────────────────\n`;
        code += `export const SCROLL_PRESETS = {\n`;

        const addedTypes = new Set();
        for (const p of scrollPatterns) {
            if (addedTypes.has(p.pattern)) continue;
            addedTypes.add(p.pattern);

            const mp = p.motionProps || {};
            const camelName = patternToCamel(p.pattern);

            code += `  ${camelName}: {\n`;
            if (mp.initial) code += `    initial: ${JSON.stringify(mp.initial)},\n`;
            if (mp.whileInView) code += `    whileInView: ${JSON.stringify(mp.whileInView)},\n`;
            if (mp.transition) code += `    transition: ${JSON.stringify(mp.transition)},\n`;
            code += `    viewport: { once: true, amount: 0.3 },\n`;
            code += `  } as AnimationPreset,\n\n`;
        }
        code += `} as const;\n\n`;
    }

    // Hover presets
    const hoverTypes = ['HOVER_SCALE', 'HOVER_FADE', 'HOVER_COLOR', 'HOVER_GLOW', 'HOVER_LIFT', 'HOVER_UNDERLINE'];
    const hoverPatterns = patterns.filter(p => hoverTypes.includes(p.pattern));
    if (hoverPatterns.length > 0) {
        code += `// ─── Hover Animation Presets ──────────────────────────────────\n`;
        code += `export const HOVER_PRESETS = {\n`;

        const addedTypes = new Set();
        for (const p of hoverPatterns) {
            if (addedTypes.has(p.pattern)) continue;
            addedTypes.add(p.pattern);

            const mp = p.motionProps || {};
            const camelName = patternToCamel(p.pattern);

            code += `  ${camelName}: {\n`;
            if (mp.whileHover) code += `    whileHover: ${JSON.stringify(mp.whileHover)},\n`;
            if (mp.transition) code += `    transition: ${JSON.stringify(mp.transition)},\n`;
            code += `  } as AnimationPreset,\n\n`;
        }
        code += `} as const;\n\n`;
    }

    // Continuous animation presets
    const contTypes = ['PULSE', 'SPIN', 'BOUNCE', 'FLOAT'];
    const contPatterns = patterns.filter(p => contTypes.includes(p.pattern));
    if (contPatterns.length > 0) {
        code += `// ─── Continuous Animation Presets ─────────────────────────────\n`;
        code += `export const CONTINUOUS_PRESETS = {\n`;

        for (const p of contPatterns) {
            const mp = p.motionProps || {};
            const camelName = patternToCamel(p.pattern);
            code += `  ${camelName}: {\n`;
            if (mp.animate) code += `    animate: ${JSON.stringify(mp.animate)},\n`;
            if (mp.transition) code += `    transition: ${JSON.stringify(mp.transition)},\n`;
            code += `  } as AnimationPreset,\n\n`;
        }
        code += `} as const;\n\n`;
    }

    // Entrance presets
    const entTypes = ['ENTRANCE_FADE', 'ENTRANCE_SLIDE', 'ENTRANCE_SCALE'];
    const entPatterns = patterns.filter(p => entTypes.includes(p.pattern));
    if (entPatterns.length > 0) {
        code += `// ─── Entrance Animation Presets ───────────────────────────────\n`;
        code += `export const ENTRANCE_PRESETS = {\n`;

        const addedTypes = new Set();
        for (const p of entPatterns) {
            if (addedTypes.has(p.pattern)) continue;
            addedTypes.add(p.pattern);

            const mp = p.motionProps || {};
            const camelName = patternToCamel(p.pattern);
            code += `  ${camelName}: {\n`;
            if (mp.initial) code += `    initial: ${JSON.stringify(mp.initial)},\n`;
            if (mp.animate) code += `    animate: ${JSON.stringify(mp.animate)},\n`;
            if (mp.transition) code += `    transition: ${JSON.stringify(mp.transition)},\n`;
            code += `  } as AnimationPreset,\n\n`;
        }
        code += `} as const;\n\n`;
    }

    // Summary comment
    code += `// ─── Pattern Summary ─────────────────────────────────────────\n`;
    code += `// Total patterns detected: ${patterns.length}\n`;
    for (const [type, list] of Object.entries(grouped)) {
        code += `//   ${type}: ${list.length} instance(s)\n`;
    }
    code += `//\n// Generated by Design-DNA Clone Engine\n`;

    return code;
}

// Helper: convert PATTERN_NAME → camelCase
function patternToCamel(pattern) {
    return pattern
        .toLowerCase()
        .replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
