import fs from 'fs';

const html = fs.readFileSync('./test-v7-full/clone/index.html', 'utf8');
const animJS = fs.readFileSync('./test-v7-full/clone/animations.js', 'utf8');

const r = [];
r.push('=== FULL-EFFECT CLONE VERIFICATION ===\n');

// Check CDN links
r.push('--- CDN SCRIPT TAGS ---');
const scriptMatches = html.match(/<script[^>]*>/g) || [];
scriptMatches.forEach(s => r.push('  ' + s));
r.push(`  Total: ${scriptMatches.length} script tags\n`);

// Check specific CDNs
r.push('--- CDN VERIFICATION ---');
r.push('  GSAP core: ' + (html.includes('gsap.min.js') ? 'YES ✅' : 'NO ❌'));
r.push('  ScrollTrigger: ' + (html.includes('ScrollTrigger.min.js') ? 'YES ✅' : 'NO ❌'));
r.push('  Three.js: ' + (html.includes('three.min.js') ? 'YES (3D detected)' : 'N/A (no WebGL)'));
r.push('  Lottie: ' + (html.includes('lottie.min.js') ? 'YES' : 'N/A (no Lottie)'));
r.push('  animations.js: ' + (html.includes('animations.js') ? 'YES ✅' : 'NO ❌'));
r.push('');

// Check animations.js content
r.push('--- ANIMATIONS.JS FEATURES ---');
r.push('  Size: ' + Math.round(animJS.length / 1024) + 'KB');
r.push('  Lines: ' + animJS.split('\n').length);
r.push('  GSAP Setup: ' + (animJS.includes('gsap.registerPlugin') ? 'YES ✅' : 'NO ❌'));
r.push('  ScrollTrigger: ' + (animJS.includes('ScrollTrigger') ? 'YES ✅' : 'NO ❌'));
r.push('  Framer appear-id: ' + (animJS.includes('data-framer-appear-id') ? 'YES ✅' : 'NO ❌'));
r.push('  Stagger animation: ' + (animJS.includes('stagger') ? 'YES ✅' : 'NO ❌'));
r.push('  Hover spring: ' + (animJS.includes('elastic.out') ? 'YES ✅' : 'NO ❌'));
r.push('  Magnetic buttons: ' + (animJS.includes('mousemove') ? 'YES ✅' : 'NO ❌'));
r.push('  Card tilt 3D: ' + (animJS.includes('rotateX') ? 'YES ✅' : 'NO ❌'));
r.push('  Image zoom: ' + (animJS.includes('scale: 1.05') ? 'YES ✅' : 'NO ❌'));
r.push('  Parallax: ' + (animJS.includes('scrub') ? 'YES ✅' : 'NO ❌'));
r.push('  Progress bar: ' + (animJS.includes('progressBar') ? 'YES ✅' : 'NO ❌'));
r.push('  Navbar blur: ' + (animJS.includes('backdropFilter') ? 'YES ✅' : 'NO ❌'));
r.push('  Counter anim: ' + (animJS.includes('counter') ? 'YES ✅' : 'NO ❌'));
r.push('  Horizontal scroll: ' + (animJS.includes('scrollLeft') ? 'YES ✅' : 'NO ❌'));
r.push('  Clip-path reveal: ' + (animJS.includes('clipPath') ? 'YES ✅' : 'NO ❌'));
r.push('');

// Clone file sizes
r.push('--- CLONE FILE SIZES ---');
const files = fs.readdirSync('./test-v7-full/clone');
files.forEach(f => {
    const stat = fs.statSync('./test-v7-full/clone/' + f);
    r.push(`  ${f}: ${Math.round(stat.size / 1024)}KB`);
});
r.push('');

// Asset counts
r.push('--- ASSETS ---');
const assetDirs = ['images', 'svg', 'fonts'];
assetDirs.forEach(d => {
    try {
        const count = fs.readdirSync('./test-v7-full/assets/' + d).length;
        r.push(`  ${d}: ${count} files`);
    } catch { r.push(`  ${d}: N/A`); }
});

const output = r.join('\n');
fs.writeFileSync('./clone-verify.txt', output, 'utf8');
console.log(output);
