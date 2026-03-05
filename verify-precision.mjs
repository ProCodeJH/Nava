import fs from 'fs';

const html = fs.readFileSync('./test-v7-precision/clone/index.html', 'utf8');
const animJS = fs.readFileSync('./test-v7-precision/clone/animations.js', 'utf8');

const r = [];
r.push('=== PRECISION CLONE VERIFICATION ===\n');

// CDN check
r.push('--- CDN SCRIPT TAGS ---');
const scripts = html.match(/<script[^>]*>/g) || [];
scripts.forEach(s => r.push('  ' + s));
r.push(`  Total: ${scripts.length}\n`);

r.push('--- CDN VERIFICATION ---');
r.push('  GSAP core: ' + (html.includes('gsap.min.js') ? 'YES ✅' : 'NO ❌'));
r.push('  ScrollTrigger: ' + (html.includes('ScrollTrigger.min.js') ? 'YES ✅' : 'NO ❌'));
r.push('  Draggable: ' + (html.includes('Draggable.min.js') ? 'YES ✅' : 'N/A'));
r.push('  Three.js: ' + (html.includes('three.min.js') ? 'YES ✅' : 'N/A'));
r.push('  Lottie: ' + (html.includes('lottie.min.js') ? 'YES ✅' : 'N/A'));
r.push('');

r.push('--- ANIMATIONS.JS PRECISION FEATURES ---');
r.push('  Size: ' + Math.round(animJS.length / 1024) + 'KB');
r.push('  Lines: ' + animJS.split('\n').length);
r.push('');

// Precision features
r.push('  [GSAP Setup]');
r.push('    registerPlugin: ' + (animJS.includes('gsap.registerPlugin') ? '✅' : '❌'));
r.push('    Draggable plugin: ' + (animJS.includes('Draggable') ? '✅' : '❌'));
r.push('');
r.push('  [Framer Precision]');
r.push('    Precise variants: ' + (animJS.includes('Precise Framer') ? '✅ PRECISION' : '✅ APPROX'));
r.push('    appear-id: ' + (animJS.includes('data-framer-appear-id') ? '✅' : '❌'));
r.push('    Stagger children: ' + (animJS.includes('stagger') || animJS.includes('delay: i') ? '✅' : '❌'));
r.push('    Spring hover: ' + (animJS.includes('elastic.out') ? '✅' : '❌'));
r.push('    whileHover: ' + (animJS.includes('whileHover') || animJS.includes('mouseenter') ? '✅' : '❌'));
r.push('    whileTap: ' + (animJS.includes('whileTap') || animJS.includes('mousedown') ? '✅' : '❌'));
r.push('');
r.push('  [Scroll Animations]');
r.push('    ScrollTrigger usage: ' + (animJS.includes('ScrollTrigger') ? '✅' : '❌'));
r.push('    Precise IO replay: ' + (animJS.includes('Precise Scroll') || animJS.includes('captured observers') ? '✅ PRECISION' : '✅ APPROX'));
r.push('    Section reveal: ' + (animJS.includes('visibility') ? '✅' : '❌'));
r.push('    Heading reveal: ' + (animJS.includes('h1, h2, h3') || animJS.includes('h1') ? '✅' : '❌'));
r.push('');
r.push('  [GSAP Timeline Replay]');
r.push('    Timeline replay: ' + (animJS.includes('GSAP Timeline Replay') ? '✅' : 'N/A (no GSAP on page)'));
r.push('    gsap.to replay: ' + (animJS.includes('gsap.to(') ? '✅' : '❌'));
r.push('    gsap.from replay: ' + (animJS.includes('gsap.from(') ? '✅' : '❌'));
r.push('');
r.push('  [Layout Animations]');
r.push('    FLIP system: ' + (animJS.includes('Layout Animations') || animJS.includes('FLIP') ? '✅' : 'N/A'));
r.push('    ResizeObserver: ' + (animJS.includes('ResizeObserver') ? '✅' : 'N/A'));
r.push('');
r.push('  [Drag Interactions]');
r.push('    Draggable.create: ' + (animJS.includes('Draggable.create') ? '✅' : 'N/A'));
r.push('    Snap back spring: ' + (animJS.includes('elastic.out') ? '✅' : '❌'));
r.push('');
r.push('  [CSS Animations]');
r.push('    Web Animations API: ' + (animJS.includes('.animate(') ? '✅ PRECISION' : '✅ APPROX'));
r.push('    Pause/resume: ' + (animJS.includes('animationPlayState') ? '✅' : '❌'));
r.push('    Counter: ' + (animJS.includes('counter') ? '✅' : '❌'));
r.push('');
r.push('  [Interactions]');
r.push('    Magnetic buttons: ' + (animJS.includes('mousemove') ? '✅' : '❌'));
r.push('    Card 3D tilt: ' + (animJS.includes('rotateX') ? '✅' : '❌'));
r.push('    Image zoom: ' + (animJS.includes('scale: 1.05') ? '✅' : '❌'));
r.push('');
r.push('  [Smooth Scroll]');
r.push('    Parallax: ' + (animJS.includes('scrub') ? '✅' : '❌'));
r.push('    Progress bar: ' + (animJS.includes('progressBar') || animJS.includes('scaleX') ? '✅' : '❌'));
r.push('    Navbar blur: ' + (animJS.includes('backdropFilter') ? '✅' : '❌'));
r.push('    Horizontal scroll: ' + (animJS.includes('scrollLeft') ? '✅' : '❌'));
r.push('');
r.push('  [Three.js]');
r.push('    Scene reconstruction: ' + (animJS.includes('THREE.Scene') ? '✅' : 'N/A'));
r.push('    Captured shaders: ' + (animJS.includes('shaders reconstructed') ? '✅ PRECISION' : '✅ FALLBACK'));
r.push('');
r.push('  [Lottie]');
r.push('    Lottie player: ' + (animJS.includes('lottie.loadAnimation') ? '✅' : 'N/A'));

// File sizes
r.push('\n--- FILE SIZES ---');
['animations.js', 'index.html', 'styles.css'].forEach(f => {
    try {
        const s = fs.statSync('./test-v7-precision/clone/' + f);
        r.push(`  ${f}: ${Math.round(s.size / 1024)}KB`);
    } catch { }
});

// Assets
r.push('\n--- ASSETS ---');
['images', 'svg', 'fonts', 'lottie'].forEach(d => {
    try { r.push(`  ${d}: ${fs.readdirSync('./test-v7-precision/assets/' + d).length} files`); }
    catch { r.push(`  ${d}: N/A`); }
});

// dna-report.json deep capture
r.push('\n--- DEEP CAPTURE IN REPORT ---');
try {
    const report = JSON.parse(fs.readFileSync('./test-v7-precision/dna-report.json', 'utf8'));
    const dc = report.deepCapture;
    if (dc) {
        r.push('  Framer stats: ' + JSON.stringify(dc.framer));
        r.push('  WebGL stats: ' + JSON.stringify(dc.webgl));
        r.push('  Lottie: ' + JSON.stringify(dc.lottie));
    } else {
        r.push('  Not found in report');
    }
} catch (e) { r.push('  Report not available: ' + e.message); }

const out = r.join('\n');
fs.writeFileSync('./precision-verify.txt', out, 'utf8');
console.log(out);
