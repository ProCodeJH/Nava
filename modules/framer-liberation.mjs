/**
 * ═══════════════════════════════════════════════════════════════
 *  DESIGN-DNA — FRAMER LIBERATION POST-PROCESSOR
 *
 *  Reads clone output (animations.js, dna-report.json) and
 *  generates a clean React + GSAP ScrollTrigger + Framer Motion
 *  project with zero Framer-platform dependency.
 *
 *  Input:  projects/clone-XXXXX/
 *  Output: projects/clone-XXXXX/framer-liberation/
 * ═══════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';

// ─── Main Entry ──────────────────────────────────────────────
export async function liberateProject(projectDir) {
    console.log('📍 [Liberation] Starting Framer liberation pipeline...');
    console.log(`ℹ️  Project: ${projectDir}`);

    const cloneDir = path.join(projectDir, 'clone');
    const outputDir = path.join(projectDir, 'framer-liberation');

    // Verify clone dir exists
    if (!fs.existsSync(cloneDir)) {
        console.log('❌ [Liberation] clone/ directory not found');
        return null;
    }

    // Create output structure
    const dirs = [
        'src/components', 'src/hooks', 'src/animations', 'src/styles'
    ];
    for (const d of dirs) {
        fs.mkdirSync(path.join(outputDir, d), { recursive: true });
    }

    // 1. Parse animations.js
    console.log('🔄 [Liberation] [1/7] Parsing animations.js...');
    const animData = parseAnimationsJS(cloneDir);
    console.log(`ℹ️  Parsed: ${animData.variants.length} variants, ${animData.scrollObservers.length} scroll, ${animData.layoutElements.length} layout, ${animData.hoverSprings.length} hover`);

    // 2. Build section name map from dna-report
    console.log('🔄 [Liberation] [2/7] Building section name map...');
    const sectionMap = buildSectionMap(projectDir);
    console.log(`ℹ️  Section names: ${Object.keys(sectionMap).length} mappings`);

    // 3. Map .framer-xxxx selectors to meaningful names
    console.log('🔄 [Liberation] [3/7] Mapping Framer selectors to names...');
    const namedAnimations = mapFramerSelectors(animData, sectionMap);

    // 4. Generate Motion variants
    console.log('🔄 [Liberation] [4/7] Generating Motion variants...');
    generateMotionVariants(namedAnimations, outputDir);

    // 5. Generate ScrollTrigger configs
    console.log('🔄 [Liberation] [5/7] Generating ScrollTrigger configs...');
    generateScrollConfigs(namedAnimations, outputDir);

    // 6. Generate React components
    console.log('🔄 [Liberation] [6/7] Generating React components...');
    generateComponents(namedAnimations, outputDir);

    // 7. Generate project files
    console.log('🔄 [Liberation] [7/7] Generating project files...');
    generateProjectFiles(namedAnimations, outputDir, projectDir);

    console.log('');
    console.log('✅ [Liberation] Framer liberation complete!');
    console.log(`ℹ️  Output: ${outputDir}`);
    console.log(`ℹ️  ${namedAnimations.variants.length} variants → src/animations/variants.ts`);
    console.log(`ℹ️  ${namedAnimations.scrollObservers.length} scroll configs → src/animations/scroll-configs.ts`);
    console.log(`ℹ️  ${namedAnimations.layoutElements.length} layout animations → src/hooks/useLayoutFlip.ts`);
    console.log(`ℹ️  5 reusable components generated`);

    return { outputDir, ...namedAnimations };
}


// ═══════════════════════════════════════════════════════════════
//  1. PARSE animations.js (robust block-based parser)
// ═══════════════════════════════════════════════════════════════
function parseAnimationsJS(cloneDir) {
    const animPath = path.join(cloneDir, 'animations.js');
    if (!fs.existsSync(animPath)) {
        console.log('⚠️  animations.js not found, returning empty');
        return { variants: [], scrollObservers: [], layoutElements: [], hoverSprings: [] };
    }

    // Normalize line endings
    const source = fs.readFileSync(animPath, 'utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const result = {
        variants: [],
        scrollObservers: [],
        layoutElements: [],
        hoverSprings: [],
    };

    // ─── Parse Variant blocks ────────────────────────────────
    // Split by "// Variant N:" comments
    const variantSections = source.split(/(?=\/\/ Variant \d+:)/g);
    for (const section of variantSections) {
        const headerMatch = section.match(/^\/\/ Variant (\d+): (.+)/);
        if (!headerMatch) continue;

        const [, numStr, comment] = headerMatch;
        const selectorMatch = section.match(/document\.querySelectorAll\('([^']+)'\)/);
        if (!selectorMatch) continue;

        const selector = selectorMatch[1];

        // Extract gsap.set(el, {...})
        const setMatch = section.match(/gsap\.set\(el, (\{[^;]+\})\)/);
        let initial = {};
        if (setMatch) {
            initial = safeParseJSON(setMatch[1]);
        }

        // Extract the spread object in gsap.to(el, { ...{...}, ... })
        const toMatch = section.match(/gsap\.to\(el, \{\s*\.\.\.(\{[\s\S]*?\}),\s*duration:/);
        let final = {};
        if (toMatch) {
            final = safeParseJSON(toMatch[1]);
        }

        // Extract gsap.to duration and ease
        const durMatch = section.match(/duration:\s*([0-9.]+),\s*ease:\s*"([^"]+)"/);
        const gsapDuration = durMatch ? parseFloat(durMatch[1]) : 0.7;
        const gsapEase = durMatch ? durMatch[2] : 'power2.out';

        // Extract scrollTrigger start and toggleActions
        const startMatch = section.match(/start:\s*'([^']+)'/);
        const toggleMatch = section.match(/toggleActions:\s*'([^']+)'/);

        result.variants.push({
            index: parseInt(numStr),
            comment: comment.trim(),
            selector,
            initial,
            final,
            gsapDuration,
            gsapEase,
            scrollTrigger: {
                start: startMatch?.[1] || 'top 85%',
                toggleActions: toggleMatch?.[1] || 'play none none reverse',
            },
        });
    }

    // ─── Parse Scroll Observer blocks ────────────────────────
    const observerSections = source.split(/(?=\/\/ Observer \d+, target \d+:)/g);
    for (const section of observerSections) {
        const headerMatch = section.match(/^\/\/ Observer (\d+), target (\d+): (.+)/);
        if (!headerMatch) continue;

        const [, obsNum, targetNum, comment] = headerMatch;
        const selectorMatch = section.match(/document\.querySelectorAll\('([^']+)'\)/);
        if (!selectorMatch) continue;

        const opMatch = section.match(/opacity:\s*([0-9.]+)/);
        const yMatch = section.match(/y:\s*([0-9.]+)/);
        const durMatch = section.match(/duration:\s*([0-9.]+)/);
        const easeMatch = section.match(/ease:\s*'([^']+)'/);
        const startMatch = section.match(/start:\s*'([^']+)'/);
        const toggleMatch = section.match(/toggleActions:\s*'([^']+)'/);
        const threshMatch = section.match(/threshold=([0-9.]+)/);
        const marginMatch = section.match(/rootMargin="([^"]*)"/);

        result.scrollObservers.push({
            observer: parseInt(obsNum),
            target: parseInt(targetNum),
            comment: comment.trim(),
            selector: selectorMatch[1],
            from: {
                opacity: opMatch ? parseFloat(opMatch[1]) : 0,
                y: yMatch ? parseFloat(yMatch[1]) : 50,
            },
            duration: durMatch ? parseFloat(durMatch[1]) : 0.7,
            ease: easeMatch?.[1] || 'power2.out',
            scrollTrigger: {
                start: startMatch?.[1] || 'top 100%',
                toggleActions: toggleMatch?.[1] || 'play none none reverse',
            },
            original: {
                threshold: threshMatch ? parseFloat(threshMatch[1]) : 0,
                rootMargin: marginMatch?.[1] || '0px',
            },
        });
    }

    // ─── Parse Layout blocks ─────────────────────────────────
    const layoutSections = source.split(/(?=\/\/ Layout \d+:)/g);
    for (const section of layoutSections) {
        const headerMatch = section.match(/^\/\/ Layout (\d+): (.+)/);
        if (!headerMatch) continue;

        const selectorMatch = section.match(/document\.querySelectorAll\('([^']+)'\)/);
        if (!selectorMatch) continue;

        result.layoutElements.push({
            index: parseInt(headerMatch[1]),
            comment: headerMatch[2].trim(),
            selector: selectorMatch[1],
            layoutId: `auto-${headerMatch[1]}`,
        });
    }

    // ─── Parse Hover Springs ─────────────────────────────────
    if (source.includes('Hover spring on interactive elements')) {
        result.hoverSprings.push({
            selector: 'a, button, [role="button"]',
            enter: { scale: 1.02, duration: 0.3, ease: 'power2.out' },
            leave: { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.5)' },
        });
    }

    return result;
}


// ═══════════════════════════════════════════════════════════════
//  2. BUILD SECTION MAP from dna-report.json
// ═══════════════════════════════════════════════════════════════
function buildSectionMap(projectDir) {
    const reportPath = path.join(projectDir, 'dna-report.json');
    const map = {};

    if (!fs.existsSync(reportPath)) return map;

    try {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
        const sections = report.layout?.sections || [];

        for (const sec of sections) {
            if (!sec.name) continue;

            // Extract all framer class names from the section name/selector
            const framerClasses = [];
            const classMatches = (sec.name + ' ' + (sec.selector || '')).match(/framer-[\w-]+/g);
            if (classMatches) framerClasses.push(...classMatches);

            // Clean the section name
            const cleanName = cleanSectionName(sec.name);

            for (const cls of framerClasses) {
                map[cls] = cleanName;
            }

            // Also map the full section name
            map[sec.name] = cleanName;
        }

        // Try to extract more from layout.children recursively
        if (report.layout?.children) {
            extractChildNames(report.layout.children, map, 0);
        }
    } catch (e) {
        console.log('⚠️  Could not parse dna-report.json:', e.message?.substring(0, 60));
    }

    return map;
}

function extractChildNames(children, map, depth) {
    if (!Array.isArray(children) || depth > 5) return;
    for (const child of children) {
        if (child.name) {
            const framerClasses = (child.selector || child.className || '').match(/framer-[\w-]+/g);
            if (framerClasses) {
                const cleanName = cleanSectionName(child.name);
                for (const cls of framerClasses) {
                    map[cls] = cleanName;
                }
            }
        }
        if (child.children) {
            extractChildNames(child.children, map, depth + 1);
        }
    }
}

function cleanSectionName(raw) {
    // "09 What sets us" → "whatSetsUs"
    // "04 Services" → "services"
    // "03 Evolve" → "evolve"
    // "main" → "main"
    let name = raw
        .replace(/^\d+\s*/, '')           // Remove leading numbers
        .replace(/[^a-zA-Z0-9\s]/g, ' ') // Remove special chars
        .trim();

    if (!name) name = raw.replace(/[^a-zA-Z0-9]/g, '');

    // camelCase
    return name
        .split(/\s+/)
        .map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join('');
}


// ═══════════════════════════════════════════════════════════════
//  3. MAP FRAMER SELECTORS → MEANINGFUL NAMES
// ═══════════════════════════════════════════════════════════════
function mapFramerSelectors(animData, sectionMap) {
    let variantCounter = 0;
    let scrollCounter = 0;
    let layoutCounter = 0;

    const mapName = (selector) => {
        // Try to find a match in the section map
        const framerClasses = selector.match(/framer-[\w-]+/g) || [];
        for (const cls of framerClasses) {
            if (sectionMap[cls]) return sectionMap[cls];
        }
        // Extract the main framer class as a fallback
        if (framerClasses.length > 0) {
            return `framer_${framerClasses[0].replace('framer-', '')}`;
        }
        // For generic selectors
        return null;
    };

    const variants = animData.variants.map(v => {
        const name = mapName(v.selector) || `variant${++variantCounter}`;
        return { ...v, name };
    });

    const scrollObservers = animData.scrollObservers.map(s => {
        const name = mapName(s.selector) || `scrollReveal${++scrollCounter}`;
        return { ...s, name };
    });

    const layoutElements = animData.layoutElements.map(l => {
        const name = mapName(l.selector) || `layout${++layoutCounter}`;
        return { ...l, name };
    });

    return {
        variants,
        scrollObservers,
        layoutElements,
        hoverSprings: animData.hoverSprings,
    };
}


// ═══════════════════════════════════════════════════════════════
//  4. GENERATE MOTION VARIANTS
// ═══════════════════════════════════════════════════════════════
function generateMotionVariants(data, outputDir) {
    const { variants } = data;

    // ─── variants.ts ─────────────────────────────────────
    let code = `/**
 * Auto-generated Motion Variants from Design-DNA Liberation Pipeline
 * Source: animations.js (${variants.length} captured variant configs)
 *
 * Usage:
 *   import { heroReveal } from './variants';
 *   <motion.div variants={heroReveal} initial="initial" animate="animate" />
 */
import type { Variants } from 'framer-motion';

`;

    // De-duplicate by creating a map
    const seen = new Set();

    for (const v of variants) {
        const exportName = makeExportName(v.name, seen);
        seen.add(exportName);

        // Extract the real transition from the final config
        const transition = v.final?.transition || {};
        const motionTransition = convertTransition(transition);

        // Build initial/animate states — strip 'transition' key from final
        const initial = {};
        const animate = {};

        const animProps = ['opacity', 'x', 'y', 'rotation', 'rotateX', 'rotateY', 'scale', 'skewX', 'skewY'];
        for (const prop of animProps) {
            if (v.initial?.[prop] !== undefined) {
                const motionProp = prop === 'rotation' ? 'rotate' : prop;
                initial[motionProp] = v.initial[prop];
            }
            if (v.final?.[prop] !== undefined) {
                const motionProp = prop === 'rotation' ? 'rotate' : prop;
                animate[motionProp] = v.final[prop];
            }
        }

        code += `// Variant ${v.index}: ${v.comment}\n`;
        code += `// Original selector: ${v.selector}\n`;
        code += `export const ${exportName}: Variants = {\n`;
        code += `    initial: ${JSON.stringify(initial)},\n`;
        code += `    animate: ${JSON.stringify(animate)},\n`;
        code += `};\n`;
        code += `export const ${exportName}Transition = ${JSON.stringify(motionTransition)};\n\n`;
    }

    fs.writeFileSync(path.join(outputDir, 'src/animations/variants.ts'), code);

    // ─── spring-presets.ts ───────────────────────────────
    const springs = variants.filter(v => v.final?.transition?.type === 'spring');
    const tweens = variants.filter(v => v.final?.transition?.type === 'tween');

    let presets = `/**
 * Spring & Tween Presets extracted from Framer variant configs
 * ${springs.length} spring configs, ${tweens.length} tween configs
 */

export const springPresets = {\n`;

    const springMap = new Map();
    for (const s of springs) {
        const t = s.final?.transition || {};
        const key = `d${t.damping || 30}_s${t.stiffness || 400}_m${t.mass || 1}`;
        if (!springMap.has(key)) {
            springMap.set(key, {
                damping: t.damping || 30,
                stiffness: t.stiffness || 400,
                mass: t.mass || 1,
            });
        }
    }

    let springIdx = 0;
    for (const [key, config] of springMap) {
        presets += `    spring${++springIdx}: { type: "spring" as const, damping: ${config.damping}, stiffness: ${config.stiffness}, mass: ${config.mass} },\n`;
    }
    presets += `};\n\n`;

    // Common easing curves
    const easingSet = new Set();
    for (const t of tweens) {
        const ease = t.final?.transition?.ease;
        if (Array.isArray(ease)) {
            easingSet.add(JSON.stringify(ease));
        }
    }

    presets += `export const easingPresets = {\n`;
    let easeIdx = 0;
    for (const e of easingSet) {
        presets += `    ease${++easeIdx}: ${e} as [number, number, number, number],\n`;
    }
    presets += `};\n`;

    fs.writeFileSync(path.join(outputDir, 'src/animations/spring-presets.ts'), presets);
}


// ═══════════════════════════════════════════════════════════════
//  5. GENERATE SCROLL CONFIGS
// ═══════════════════════════════════════════════════════════════
function generateScrollConfigs(data, outputDir) {
    const { scrollObservers } = data;

    let code = `/**
 * Auto-generated ScrollTrigger configs from Design-DNA Liberation Pipeline
 * Source: ${scrollObservers.length} captured IntersectionObserver patterns
 *
 * Usage with GSAP:
 *   import { scrollConfigs } from './scroll-configs';
 *   gsap.from(el, { ...scrollConfigs[0].from, scrollTrigger: scrollConfigs[0].trigger });
 *
 * Usage with useScrollTrigger hook:
 *   const ref = useScrollTrigger(scrollConfigs[0]);
 */

export interface ScrollConfig {
    name: string;
    selector: string;
    from: { opacity: number; y: number };
    duration: number;
    ease: string;
    trigger: {
        start: string;
        toggleActions: string;
    };
    original: {
        threshold: number;
        rootMargin: string;
    };
}

export const scrollConfigs: ScrollConfig[] = [\n`;

    const seen = new Set();
    for (const s of scrollObservers) {
        // De-duplicate by selector
        if (seen.has(s.selector)) continue;
        seen.add(s.selector);

        code += `    {\n`;
        code += `        name: ${JSON.stringify(s.name)},\n`;
        code += `        selector: ${JSON.stringify(s.selector)},\n`;
        code += `        from: ${JSON.stringify(s.from)},\n`;
        code += `        duration: ${s.duration},\n`;
        code += `        ease: ${JSON.stringify(s.ease)},\n`;
        code += `        trigger: ${JSON.stringify(s.scrollTrigger)},\n`;
        code += `        original: ${JSON.stringify(s.original)},\n`;
        code += `    },\n`;
    }

    code += `];\n`;

    fs.writeFileSync(path.join(outputDir, 'src/animations/scroll-configs.ts'), code);
}


// ═══════════════════════════════════════════════════════════════
//  6. GENERATE REACT COMPONENTS
// ═══════════════════════════════════════════════════════════════
function generateComponents(data, outputDir) {
    const compDir = path.join(outputDir, 'src/components');
    const hookDir = path.join(outputDir, 'src/hooks');

    // ─── ScrollReveal.tsx ────────────────────────────────
    fs.writeFileSync(path.join(compDir, 'ScrollReveal.tsx'), `/**
 * ScrollReveal — Motion-based scroll reveal wrapper
 * Generated by Design-DNA Liberation Pipeline
 */
import React from 'react';
import { motion, type Variants } from 'framer-motion';

interface ScrollRevealProps {
    children: React.ReactNode;
    variants: Variants;
    transition?: Record<string, unknown>;
    delay?: number;
    className?: string;
    once?: boolean;
    amount?: number;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
    children,
    variants,
    transition = {},
    delay = 0,
    className = '',
    once = false,
    amount = 0.2,
}) => (
    <motion.div
        className={className}
        initial="initial"
        whileInView="animate"
        viewport={{ once, amount }}
        variants={variants}
        transition={{ ...transition, delay }}
    >
        {children}
    </motion.div>
);

export default ScrollReveal;
`);

    // ─── HoverSpring.tsx ─────────────────────────────────
    fs.writeFileSync(path.join(compDir, 'HoverSpring.tsx'), `/**
 * HoverSpring — Spring-based hover interaction wrapper
 * Generated by Design-DNA Liberation Pipeline
 */
import React from 'react';
import { motion } from 'framer-motion';

interface HoverSpringProps {
    children: React.ReactNode;
    scale?: number;
    tapScale?: number;
    className?: string;
    style?: React.CSSProperties;
}

export const HoverSpring: React.FC<HoverSpringProps> = ({
    children,
    scale = 1.02,
    tapScale = 0.97,
    className = '',
    style = {},
}) => (
    <motion.div
        className={className}
        style={style}
        whileHover={{ scale }}
        whileTap={{ scale: tapScale }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
        {children}
    </motion.div>
);

export default HoverSpring;
`);

    // ─── ParallaxSection.tsx ─────────────────────────────
    fs.writeFileSync(path.join(compDir, 'ParallaxSection.tsx'), `/**
 * ParallaxSection — GSAP ScrollTrigger parallax wrapper
 * Generated by Design-DNA Liberation Pipeline
 */
import React, { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

interface ParallaxSectionProps {
    children: React.ReactNode;
    speed?: number;
    className?: string;
}

export const ParallaxSection: React.FC<ParallaxSectionProps> = ({
    children,
    speed = 0.3,
    className = '',
}) => {
    const ref = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        if (!ref.current) return;
        const el = ref.current.querySelector('img') || ref.current;
        gsap.to(el, {
            y: () => ref.current!.offsetHeight * speed,
            ease: 'none',
            scrollTrigger: {
                trigger: ref.current,
                start: 'top top',
                end: 'bottom top',
                scrub: 1,
            },
        });
    }, { scope: ref });

    return (
        <div ref={ref} className={className}>
            {children}
        </div>
    );
};

export default ParallaxSection;
`);

    // ─── LayoutTransition.tsx ────────────────────────────
    fs.writeFileSync(path.join(compDir, 'LayoutTransition.tsx'), `/**
 * LayoutTransition — Framer Motion layoutId wrapper for FLIP animations
 * Generated by Design-DNA Liberation Pipeline
 */
import React from 'react';
import { motion, LayoutGroup } from 'framer-motion';

interface LayoutTransitionProps {
    children: React.ReactNode;
    layoutId: string;
    className?: string;
    style?: React.CSSProperties;
}

export const LayoutTransition: React.FC<LayoutTransitionProps> = ({
    children,
    layoutId,
    className = '',
    style = {},
}) => (
    <motion.div
        layoutId={layoutId}
        className={className}
        style={style}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
        {children}
    </motion.div>
);

export const LayoutTransitionGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <LayoutGroup>{children}</LayoutGroup>
);

export default LayoutTransition;
`);

    // ─── StaggerChildren.tsx ─────────────────────────────
    fs.writeFileSync(path.join(compDir, 'StaggerChildren.tsx'), `/**
 * StaggerChildren — Sequential entrance animation wrapper
 * Generated by Design-DNA Liberation Pipeline
 */
import React from 'react';
import { motion } from 'framer-motion';

interface StaggerChildrenProps {
    children: React.ReactNode;
    staggerDelay?: number;
    className?: string;
    once?: boolean;
}

const containerVariants = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.06 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.97 },
    visible: {
        opacity: 1, y: 0, scale: 1,
        transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
    },
};

export const StaggerChildren: React.FC<StaggerChildrenProps> = ({
    children,
    staggerDelay = 0.06,
    className = '',
    once = false,
}) => (
    <motion.div
        className={className}
        initial="hidden"
        whileInView="visible"
        viewport={{ once, amount: 0.2 }}
        variants={{
            hidden: {},
            visible: { transition: { staggerChildren: staggerDelay } },
        }}
    >
        {React.Children.map(children, (child) => (
            <motion.div variants={itemVariants}>
                {child}
            </motion.div>
        ))}
    </motion.div>
);

export default StaggerChildren;
`);

    // ─── useScrollTrigger.ts ─────────────────────────────
    fs.writeFileSync(path.join(hookDir, 'useScrollTrigger.ts'), `/**
 * useScrollTrigger — GSAP ScrollTrigger custom hook
 * Generated by Design-DNA Liberation Pipeline
 *
 * Usage:
 *   import { useScrollTrigger } from '../hooks/useScrollTrigger';
 *   import { scrollConfigs } from '../animations/scroll-configs';
 *
 *   function MySection() {
 *       const ref = useScrollTrigger(scrollConfigs[0]);
 *       return <div ref={ref}>Content</div>;
 *   }
 */
import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface ScrollTriggerConfig {
    from: { opacity: number; y: number };
    duration: number;
    ease: string;
    trigger: {
        start: string;
        toggleActions: string;
    };
}

export function useScrollTrigger<T extends HTMLElement = HTMLDivElement>(config: ScrollTriggerConfig) {
    const ref = useRef<T>(null);

    useEffect(() => {
        if (!ref.current) return;

        const ctx = gsap.context(() => {
            gsap.from(ref.current!, {
                ...config.from,
                duration: config.duration,
                ease: config.ease,
                scrollTrigger: {
                    trigger: ref.current,
                    start: config.trigger.start,
                    toggleActions: config.trigger.toggleActions,
                },
            });
        });

        return () => ctx.revert();
    }, []);

    return ref;
}

export default useScrollTrigger;
`);

    // ─── useLayoutFlip.ts ────────────────────────────────
    fs.writeFileSync(path.join(hookDir, 'useLayoutFlip.ts'), `/**
 * useLayoutFlip — Layout FLIP animation hook using GSAP
 * Generated by Design-DNA Liberation Pipeline
 *
 * For most cases, prefer using <LayoutTransition layoutId="..." /> instead.
 * This hook is for cases where you need direct GSAP control.
 */
import { useRef, useEffect, useCallback } from 'react';
import gsap from 'gsap';

export function useLayoutFlip<T extends HTMLElement = HTMLDivElement>() {
    const ref = useRef<T>(null);
    const lastBounds = useRef<DOMRect | null>(null);

    useEffect(() => {
        if (ref.current) {
            lastBounds.current = ref.current.getBoundingClientRect();
        }
    }, []);

    const flip = useCallback(() => {
        if (!ref.current || !lastBounds.current) return;

        const newBounds = ref.current.getBoundingClientRect();
        const dx = lastBounds.current.x - newBounds.x;
        const dy = lastBounds.current.y - newBounds.y;
        const sw = lastBounds.current.width / newBounds.width;
        const sh = lastBounds.current.height / newBounds.height;

        if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || Math.abs(sw - 1) > 0.01) {
            gsap.from(ref.current, {
                x: dx, y: dy, scaleX: sw, scaleY: sh,
                duration: 0.4, ease: 'power2.out',
            });
        }

        lastBounds.current = newBounds;
    }, []);

    return { ref, flip };
}

export default useLayoutFlip;
`);

    // ─── CSS tokens ──────────────────────────────────────
    const tokensPath = path.join(outputDir, '..', 'clone', 'design-tokens.css');
    if (fs.existsSync(tokensPath)) {
        fs.copyFileSync(tokensPath, path.join(outputDir, 'src/styles/tokens.css'));
    } else {
        fs.writeFileSync(path.join(outputDir, 'src/styles/tokens.css'), '/* No design tokens found */\n');
    }

    // ─── animations.css ──────────────────────────────────
    fs.writeFileSync(path.join(outputDir, 'src/styles/animations.css'), `/**
 * Keyframe definitions extracted by Design-DNA Liberation Pipeline
 * Import this in your app entry point
 */

/* Scroll reveal default */
@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(40px); }
    to   { opacity: 1; transform: translateY(0); }
}

/* Stagger child entrance */
@keyframes slideUp {
    from { opacity: 0; transform: translateY(30px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* Elastic hover bounce */
@keyframes hoverBounce {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.02); }
    100% { transform: scale(1); }
}
`);
}


// ═══════════════════════════════════════════════════════════════
//  7. GENERATE PROJECT FILES
// ═══════════════════════════════════════════════════════════════
function generateProjectFiles(data, outputDir, projectDir) {
    // package.json
    const pkgJson = {
        name: 'framer-liberated',
        version: '1.0.0',
        description: 'Liberated Framer animations — zero Framer SDK dependency',
        private: true,
        dependencies: {
            'react': '^18.2.0',
            'react-dom': '^18.2.0',
            'framer-motion': '^11.0.0',
            'gsap': '^3.12.5',
            '@gsap/react': '^2.1.1',
        },
        devDependencies: {
            '@types/react': '^18.2.0',
            '@types/react-dom': '^18.2.0',
            'typescript': '^5.3.0',
        },
    };

    fs.writeFileSync(path.join(outputDir, 'package.json'), JSON.stringify(pkgJson, null, 2));

    // README.md
    const readme = `# Framer Liberation Output

> Generated by Design-DNA Clone Engine — Framer Liberation Pipeline

## What's Inside

| File | Description |
|------|-------------|
| \`src/animations/variants.ts\` | ${data.variants.length} Motion variant configs (initial → animate states) |
| \`src/animations/scroll-configs.ts\` | ${data.scrollObservers.length} ScrollTrigger configurations |
| \`src/animations/spring-presets.ts\` | Spring & easing preset constants |
| \`src/components/ScrollReveal.tsx\` | Motion-based scroll reveal wrapper |
| \`src/components/HoverSpring.tsx\` | Spring hover interaction wrapper |
| \`src/components/ParallaxSection.tsx\` | GSAP ScrollTrigger parallax |
| \`src/components/LayoutTransition.tsx\` | FLIP layout animation wrapper |
| \`src/components/StaggerChildren.tsx\` | Sequential entrance animation |
| \`src/hooks/useScrollTrigger.ts\` | GSAP ScrollTrigger React hook |
| \`src/hooks/useLayoutFlip.ts\` | FLIP animation hook |
| \`src/styles/tokens.css\` | Design tokens (CSS custom properties) |
| \`src/styles/animations.css\` | Keyframe definitions |

## Usage

### 1. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 2. Import Components

\`\`\`tsx
import { ScrollReveal } from './components/ScrollReveal';
import { HoverSpring } from './components/HoverSpring';
import { ParallaxSection } from './components/ParallaxSection';
import { StaggerChildren } from './components/StaggerChildren';
import { heroReveal, heroRevealTransition } from './animations/variants';

// Scroll reveal with extracted variant
<ScrollReveal variants={heroReveal} transition={heroRevealTransition}>
    <h1>Hello World</h1>
</ScrollReveal>

// Stagger children
<StaggerChildren staggerDelay={0.06}>
    <Card />
    <Card />
    <Card />
</StaggerChildren>

// Hover spring
<HoverSpring scale={1.02}>
    <Button>Click me</Button>
</HoverSpring>

// GSAP Parallax
<ParallaxSection speed={0.3}>
    <img src="hero.jpg" />
</ParallaxSection>
\`\`\`

### 3. Use ScrollTrigger Hook Directly

\`\`\`tsx
import { useScrollTrigger } from './hooks/useScrollTrigger';
import { scrollConfigs } from './animations/scroll-configs';

function MySection() {
    const ref = useScrollTrigger(scrollConfigs[0]);
    return <div ref={ref}>Animated content</div>;
}
\`\`\`

## Zero Framer Dependency

This output uses ONLY open-source libraries:
- **framer-motion** (MIT) — for declarative animations
- **gsap** (Standard License) — for scroll-driven animations
- **@gsap/react** — official React integration

No \`framer\` platform imports. No \`.framer.app\` dependency.
`;

    fs.writeFileSync(path.join(outputDir, 'README.md'), readme);
}


// ═══════════════════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════════════════
function safeParseJSON(str) {
    try {
        // Handle JS object notation (unquoted keys)
        const jsonStr = str
            .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":')  // unquoted keys
            .replace(/'/g, '"');                          // single quotes
        return JSON.parse(jsonStr);
    } catch {
        // Fallback: eval-safe parsing (only for known-safe animation data)
        try {
            return (new Function('return ' + str))();
        } catch {
            return {};
        }
    }
}

function convertTransition(t) {
    if (t.type === 'spring') {
        return {
            type: 'spring',
            damping: t.damping || 30,
            stiffness: t.stiffness || 400,
            mass: t.mass || 1,
            delay: t.delay || 0,
        };
    }

    // tween
    return {
        type: 'tween',
        duration: t.duration || 0.7,
        ease: t.ease || [0.4, 0, 0.2, 1],
        delay: t.delay || 0,
    };
}

function makeExportName(name, seen) {
    // Ensure valid JS identifier
    let clean = name
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .replace(/^(\d)/, '_$1');

    if (!clean) clean = 'unnamed';

    // De-duplicate
    let final = clean;
    let counter = 2;
    while (seen.has(final)) {
        final = `${clean}_${counter++}`;
    }
    return final;
}
