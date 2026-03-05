/**
 * Upgrade 2: GSAP Code Auto-Generation
 * Converts extracted animation DNA into usable GSAP ScrollTrigger code
 */

export function generateGSAPCode(animationData, layoutData) {
    const lines = [];

    lines.push('// ═══════════════════════════════════════════════════');
    lines.push('// AUTO-GENERATED GSAP CODE — design-dna v4.0');
    lines.push('// ═══════════════════════════════════════════════════');
    lines.push('');
    lines.push('import gsap from "gsap";');
    lines.push('import { ScrollTrigger } from "gsap/ScrollTrigger";');
    lines.push('');
    lines.push('gsap.registerPlugin(ScrollTrigger);');
    lines.push('');

    // ── From @keyframes → GSAP timelines ──
    if (animationData.keyframes?.length) {
        lines.push('// ── Keyframe Animations ──');
        animationData.keyframes.forEach(kf => {
            lines.push(`// @keyframes ${kf.name}`);
            lines.push(`const tl_${sanitize(kf.name)} = gsap.timeline();`);

            kf.frames.forEach((frame, i) => {
                const props = parseCSS(frame.styles);
                if (Object.keys(props).length > 0) {
                    const progress = parseOffset(frame.offset);
                    lines.push(`tl_${sanitize(kf.name)}.to(".target", ${JSON.stringify(props)}, ${progress});`);
                }
            });
            lines.push('');
        });
    }

    // ── From transitions → GSAP hover animations ──
    if (animationData.transitions?.length) {
        lines.push('// ── Hover Transitions ──');
        const uniqueTransitions = new Map();
        animationData.transitions.forEach(t => {
            if (!t.selector || uniqueTransitions.has(t.selector)) return;
            uniqueTransitions.set(t.selector, t);
        });

        uniqueTransitions.forEach((t, selector) => {
            const duration = extractDuration(t.transition);
            const ease = extractEase(t.transition);
            lines.push(`// ${selector}`);
            lines.push(`document.querySelectorAll("${escapeSelector(selector)}").forEach(el => {`);
            lines.push(`  el.addEventListener("mouseenter", () => {`);
            lines.push(`    gsap.to(el, { duration: ${duration}, ease: "${ease}" });`);
            lines.push(`  });`);
            lines.push(`});`);
            lines.push('');
        });
    }

    // ── From Framer components → ScrollTrigger reveals ──
    if (animationData.framerComponents?.length) {
        lines.push('// ── Scroll-Triggered Reveals (from Framer components) ──');
        const filteredComponents = animationData.framerComponents
            .filter(c => c.opacity !== '1' || c.transform)
            .slice(0, 20);

        if (filteredComponents.length > 0) {
            lines.push(`gsap.utils.toArray(".reveal-element").forEach((el, i) => {`);
            lines.push(`  gsap.from(el, {`);
            lines.push(`    opacity: 0,`);
            lines.push(`    y: 60,`);
            lines.push(`    duration: 0.8,`);
            lines.push(`    delay: i * 0.1,`);
            lines.push(`    ease: "power3.out",`);
            lines.push(`    scrollTrigger: {`);
            lines.push(`      trigger: el,`);
            lines.push(`      start: "top 85%",`);
            lines.push(`      toggleActions: "play none none reverse",`);
            lines.push(`    },`);
            lines.push(`  });`);
            lines.push(`});`);
            lines.push('');
        }
    }

    // ── From GSAP ScrollTriggers ──
    if (animationData.gsapTriggers?.length) {
        lines.push('// ── Existing GSAP ScrollTriggers (extracted) ──');
        animationData.gsapTriggers.forEach((st, i) => {
            lines.push(`// ScrollTrigger ${i + 1}: ${st.trigger}`);
            lines.push(`gsap.to("${escapeSelector(st.trigger)}", {`);
            lines.push(`  scrollTrigger: {`);
            lines.push(`    trigger: "${escapeSelector(st.trigger)}",`);
            if (st.start) lines.push(`    start: "${st.start}",`);
            if (st.end) lines.push(`    end: "${st.end}",`);
            if (st.scrub) lines.push(`    scrub: ${st.scrub},`);
            if (st.pin) lines.push(`    pin: true,`);
            lines.push(`  },`);
            lines.push(`});`);
            lines.push('');
        });
    }

    // ── From sections → parallax ──
    if (layoutData?.parallax?.length) {
        lines.push('// ── Parallax Effects ──');
        layoutData.parallax.forEach(p => {
            lines.push(`gsap.to("${escapeSelector(p.name)}", {`);
            lines.push(`  yPercent: ${parseFloat(p.speed) * -50},`);
            lines.push(`  ease: "none",`);
            lines.push(`  scrollTrigger: {`);
            lines.push(`    trigger: "${escapeSelector(p.name)}",`);
            lines.push(`    start: "top bottom",`);
            lines.push(`    end: "bottom top",`);
            lines.push(`    scrub: true,`);
            lines.push(`  },`);
            lines.push(`});`);
            lines.push('');
        });
    }

    // ── Smooth scroll setup ──
    lines.push('// ── Smooth Scroll (Lenis-compatible) ──');
    lines.push('// Uncomment if using Lenis:');
    lines.push('// import Lenis from "@studio-freight/lenis";');
    lines.push('// const lenis = new Lenis();');
    lines.push('// lenis.on("scroll", ScrollTrigger.update);');
    lines.push('// gsap.ticker.add((time) => lenis.raf(time * 1000));');
    lines.push('// gsap.ticker.lagSmoothing(0);');

    return lines.join('\n');
}

// ── Helper functions ──

function sanitize(name) {
    return name.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 30);
}

function escapeSelector(sel) {
    return sel.replace(/"/g, '\\"').substring(0, 80);
}

function parseCSS(cssText) {
    const props = {};
    if (!cssText) return props;

    cssText.split(';').forEach(decl => {
        const [prop, val] = decl.split(':').map(s => s?.trim());
        if (!prop || !val) return;

        const gsapProp = cssToGSAP(prop);
        if (gsapProp) {
            props[gsapProp] = isNaN(parseFloat(val)) ? val : parseFloat(val);
        }
    });
    return props;
}

function cssToGSAP(prop) {
    const map = {
        'opacity': 'opacity',
        'transform': 'transform',
        'background-color': 'backgroundColor',
        'color': 'color',
        'scale': 'scale',
        'rotate': 'rotation',
        'translate': 'translate',
        'clip-path': 'clipPath',
        'filter': 'filter',
        'width': 'width',
        'height': 'height',
        'border-radius': 'borderRadius',
        'box-shadow': 'boxShadow',
        'margin': 'margin',
        'padding': 'padding',
        'left': 'left',
        'top': 'top',
    };
    return map[prop] || null;
}

function parseOffset(offset) {
    if (offset === '0%' || offset === 'from') return 0;
    if (offset === '100%' || offset === 'to') return 1;
    return parseFloat(offset) / 100 || 0;
}

function extractDuration(transition) {
    const match = transition.match(/([\d.]+)s/);
    return match ? parseFloat(match[1]) : 0.3;
}

function extractEase(transition) {
    if (transition.includes('ease-out')) return 'power2.out';
    if (transition.includes('ease-in-out')) return 'power2.inOut';
    if (transition.includes('ease-in')) return 'power2.in';
    if (transition.includes('cubic-bezier')) {
        const match = transition.match(/cubic-bezier\(([\d., ]+)\)/);
        if (match) return `cubic-bezier(${match[1]})`;
    }
    return 'power1.out';
}
