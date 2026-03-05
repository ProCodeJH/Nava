/**
 * Phase 6: Tech Stack — Library detection, framework identification, bundle analysis
 */

const LIBRARY_PATTERNS = [
    { name: 'Three.js', patterns: ['three.js', 'THREE.', 'three.min.js', 'three.module.js'] },
    { name: 'Spline', patterns: ['spline', '@splinetool', 'spline-viewer'] },
    { name: 'GSAP', patterns: ['gsap', 'TweenMax', 'TweenLite', 'ScrollTrigger', 'ScrollSmoother'] },
    { name: 'Framer Motion', patterns: ['framer-motion', 'motion.div', '__framer_importFromPackage'] },
    { name: 'Framer', patterns: ['framer.com', 'framerusercontent', '__FRAMER_PAGE_DATA__'] },
    { name: 'Lottie', patterns: ['lottie', 'lottie-web', 'lottie-player', 'bodymovin'] },
    { name: 'Anime.js', patterns: ['anime.js', 'anime.min.js'] },
    { name: 'PixiJS', patterns: ['pixi.js', 'PIXI.'] },
    { name: 'Babylon.js', patterns: ['babylon.js', 'BABYLON.'] },
    { name: 'A-Frame', patterns: ['aframe', 'a-scene', 'a-entity'] },
    { name: 'Model Viewer', patterns: ['model-viewer'] },
    { name: 'Lenis', patterns: ['lenis', '@studio-freight/lenis', 'html.lenis'] },
    { name: 'SplitType', patterns: ['split-type', 'SplitType'] },
    { name: 'Locomotive Scroll', patterns: ['locomotive-scroll', 'data-scroll-container'] },
    { name: 'React Three Fiber', patterns: ['@react-three/fiber', 'react-three-fiber'] },
    { name: 'Rive', patterns: ['rive-app', '@rive-app', 'rive.wasm'] },
    { name: 'Barba.js', patterns: ['barba.js', 'data-barba'] },
    { name: 'Swiper', patterns: ['swiper', 'swiper-container', 'swiper-slide'] },
    { name: 'AOS', patterns: ['aos', 'data-aos'] },
    { name: 'React Spring', patterns: ['react-spring', '@react-spring'] },
    { name: 'Tailwind CSS', patterns: ['tailwindcss', 'tw-'] },
    { name: 'Bootstrap', patterns: ['bootstrap', 'btn-primary', 'container-fluid'] },
    { name: 'Material UI', patterns: ['@mui', 'MuiButton', 'makeStyles'] },
    { name: 'Chakra UI', patterns: ['@chakra-ui', 'chakra-'] },
    { name: 'Radix UI', patterns: ['@radix-ui', 'radix-'] },
];

const FRAMEWORK_PATTERNS = [
    { name: 'Next.js', detect: () => !!window.__NEXT_DATA__ || !!document.querySelector('#__next') },
    { name: 'Nuxt', detect: () => !!window.__NUXT__ || !!document.querySelector('#__nuxt') },
    { name: 'Remix', detect: () => !!window.__remixContext },
    { name: 'Astro', detect: () => !!document.querySelector('[data-astro-cid]') || !!document.querySelector('astro-island') },
    { name: 'Framer', detect: () => !!window.__FRAMER_PAGE_DATA__ || !!document.querySelector('[data-framer-name]') },
    { name: 'Gatsby', detect: () => !!document.querySelector('#___gatsby') },
    { name: 'SvelteKit', detect: () => !!document.querySelector('[data-sveltekit-hydrate]') },
    { name: 'WordPress', detect: () => !!document.querySelector('meta[name="generator"][content*="WordPress"]') },
    { name: 'Webflow', detect: () => !!document.querySelector('html[data-wf-site]') },
    { name: 'Shopify', detect: () => !!window.Shopify },
    { name: 'Vite', detect: () => !!document.querySelector('script[type="module"][src*="/@vite"]') },
    { name: 'React', detect: () => !!document.querySelector('[data-reactroot]') || !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__ },
    { name: 'Vue', detect: () => !!document.querySelector('[data-v-]') || !!window.__VUE__ },
    { name: 'Angular', detect: () => !!document.querySelector('[ng-version]') || !!window.ng },
];

export async function analyzeTechStack(page) {
    // Detect from HTML source and JS globals
    const detected = await page.evaluate((libPatterns, fwPatterns) => {
        const result = {
            libraries: [],
            framework: null,
            meta: {},
            scripts: [],
            bundleInfo: { totalScripts: 0, totalStyles: 0 },
        };

        const html = document.documentElement.outerHTML;

        // ── Library detection ──
        for (const lib of libPatterns) {
            const found = lib.patterns.some(p => html.includes(p));
            if (found) {
                result.libraries.push(lib.name);
            }
        }

        // ── Window global checks ──
        if (window.gsap) result.libraries.push('GSAP (confirmed via window.gsap)');
        if (window.THREE) result.libraries.push('Three.js (confirmed via window.THREE)');
        if (window.ScrollTrigger) result.libraries.push('GSAP ScrollTrigger (confirmed)');

        // Deduplicate
        result.libraries = [...new Set(result.libraries)];

        // ── Framework detection ──
        for (const fw of fwPatterns) {
            try {
                // fw.detect is serialized, we need to eval-like approach
                // Instead, do inline checks:
            } catch (e) { }
        }

        // Framework checks (inline)
        if (window.__NEXT_DATA__ || document.querySelector('#__next')) result.framework = 'Next.js';
        else if (window.__NUXT__ || document.querySelector('#__nuxt')) result.framework = 'Nuxt';
        else if (window.__remixContext) result.framework = 'Remix';
        else if (document.querySelector('[data-astro-cid]') || document.querySelector('astro-island')) result.framework = 'Astro';
        else if (window.__FRAMER_PAGE_DATA__ || document.querySelector('[data-framer-name]')) result.framework = 'Framer';
        else if (document.querySelector('#___gatsby')) result.framework = 'Gatsby';
        else if (document.querySelector('html[data-wf-site]')) result.framework = 'Webflow';
        else if (window.Shopify) result.framework = 'Shopify';
        else if (document.querySelector('[data-reactroot]') || window.__REACT_DEVTOOLS_GLOBAL_HOOK__) result.framework = 'React (SPA)';
        else if (document.querySelector('[data-v-]') || window.__VUE__) result.framework = 'Vue';
        else if (document.querySelector('[ng-version]') || window.ng) result.framework = 'Angular';

        // ── Meta tags ──
        const generator = document.querySelector('meta[name="generator"]');
        if (generator) result.meta.generator = generator.content;

        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) result.meta.viewport = viewport.content;

        const charset = document.querySelector('meta[charset]');
        if (charset) result.meta.charset = charset.getAttribute('charset');

        // ── Script / Style counts ──
        result.bundleInfo.totalScripts = document.querySelectorAll('script[src]').length;
        result.bundleInfo.totalStyles = document.querySelectorAll('link[rel="stylesheet"]').length;
        result.bundleInfo.inlineScripts = document.querySelectorAll('script:not([src])').length;
        result.bundleInfo.inlineStyles = document.querySelectorAll('style').length;

        // External scripts
        document.querySelectorAll('script[src]').forEach(s => {
            const src = s.src;
            if (src) result.scripts.push(src.substring(0, 200));
        });
        result.scripts = result.scripts.slice(0, 30);

        return result;
    }, LIBRARY_PATTERNS, FRAMEWORK_PATTERNS);

    // ── Network resource analysis (bundle sizes) ──
    try {
        const resources = await page.evaluate(() => {
            return performance.getEntriesByType('resource').map(r => ({
                name: r.name.substring(0, 200),
                type: r.initiatorType,
                size: r.transferSize,
                duration: Math.round(r.duration),
            })).filter(r => r.size > 0);
        });

        const jsSize = resources.filter(r => r.name.endsWith('.js') || r.type === 'script').reduce((sum, r) => sum + r.size, 0);
        const cssSize = resources.filter(r => r.name.endsWith('.css') || r.type === 'link').reduce((sum, r) => sum + r.size, 0);
        const imgSize = resources.filter(r => ['img', 'image'].includes(r.type)).reduce((sum, r) => sum + r.size, 0);

        detected.bundleInfo.jsBundleSize = `${(jsSize / 1024).toFixed(1)}KB`;
        detected.bundleInfo.cssBundleSize = `${(cssSize / 1024).toFixed(1)}KB`;
        detected.bundleInfo.imageTotalSize = `${(imgSize / 1024).toFixed(1)}KB`;
        detected.bundleInfo.totalTransferSize = `${((jsSize + cssSize + imgSize) / 1024).toFixed(1)}KB`;
    } catch (e) {
        detected.bundleInfo.error = e.message;
    }

    return detected;
}
