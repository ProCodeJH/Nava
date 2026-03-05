import fs from 'fs';

const base = './test-v8';
const r = [];
r.push('=== DESIGN-DNA v8.0 VERIFICATION ===\n');

// Clone files
r.push('--- CLONE FILES ---');
const cloneFiles = fs.readdirSync(base + '/clone');
cloneFiles.forEach(f => {
    const s = fs.statSync(base + '/clone/' + f);
    r.push(`  ${f}: ${Math.round(s.size / 1024)}KB`);
});

// design-tokens.css content
r.push('\n--- DESIGN TOKENS CSS ---');
try {
    const tokens = fs.readFileSync(base + '/clone/design-tokens.css', 'utf8');
    const varCount = (tokens.match(/--/g) || []).length;
    r.push(`  Size: ${tokens.length} bytes`);
    r.push(`  Variables: ${varCount}`);
    r.push(`  Preview: ${tokens.substring(0, 200)}...`);
} catch (e) { r.push(`  ERROR: ${e.message}`); }

// HTML enhancements
r.push('\n--- HTML ENHANCEMENTS ---');
try {
    const html = fs.readFileSync(base + '/clone/index.html', 'utf8');
    r.push(`  loading="lazy": ${(html.match(/loading="lazy"/g) || []).length} images`);
    r.push(`  decoding="async": ${(html.match(/decoding="async"/g) || []).length} images`);
    r.push(`  design-tokens.css link: ${html.includes('design-tokens.css') ? 'YES ✅' : 'NO ❌'}`);
    const scripts = html.match(/<script[^>]*>/g) || [];
    r.push(`  CDN scripts: ${scripts.length}`);
    scripts.forEach(s => r.push(`    ${s.substring(0, 100)}`));
} catch (e) { r.push(`  ERROR: ${e.message}`); }

// Animations.js
r.push('\n--- ANIMATIONS.JS ---');
try {
    const anim = fs.readFileSync(base + '/clone/animations.js', 'utf8');
    r.push(`  Size: ${Math.round(anim.length / 1024)}KB`);
    r.push(`  Lines: ${anim.split('\n').length}`);
    r.push(`  GSAP: ${anim.includes('gsap.registerPlugin') ? '✅' : '❌'}`);
    r.push(`  ScrollTrigger: ${anim.includes('ScrollTrigger') ? '✅' : '❌'}`);
    r.push(`  Draggable: ${anim.includes('Draggable') ? '✅' : '❌'}`);
    r.push(`  Framer precision: ${anim.includes('Precise Framer') ? '✅ PRECISION' : '❌'}`);
    r.push(`  IO precision: ${anim.includes('Precise Scroll') || anim.includes('captured observers') ? '✅ PRECISION' : '❌'}`);
    r.push(`  FLIP layout: ${anim.includes('FLIP') || anim.includes('Layout') ? '✅' : '❌'}`);
    r.push(`  Lottie player: ${anim.includes('lottie.loadAnimation') ? '✅' : '❌'}`);
} catch (e) { r.push(`  ERROR: ${e.message}`); }

// Assets
r.push('\n--- ASSETS ---');
['images', 'svg', 'fonts', 'lottie'].forEach(d => {
    try { r.push(`  ${d}: ${fs.readdirSync(base + '/assets/' + d).length} files`); }
    catch { r.push(`  ${d}: N/A`); }
});

// Fidelity in report
r.push('\n--- FIDELITY SCORE ---');
try {
    const report = JSON.parse(fs.readFileSync(base + '/dna-report.json', 'utf8'));
    if (report.cloneFidelity) {
        const f = report.cloneFidelity;
        r.push(`  Grade: ${f.grade} (${f.overall}/100)`);
        r.push(`  DOM: ${f.domStructure}/100`);
        r.push(`  CSS: ${f.cssCoverage}/100`);
        r.push(`  Assets: ${f.assetCompleteness}/100`);
        r.push(`  Animation: ${f.animationCoverage}/100`);
    } else {
        r.push(`  Not in report`);
    }
} catch (e) { r.push(`  Report error: ${e.message}`); }

// Pipeline stats
r.push('\n--- META ---');
try {
    const report = JSON.parse(fs.readFileSync(base + '/dna-report.json', 'utf8'));
    r.push(`  Engine: ${report.meta?.engine}`);
    r.push(`  Mode: ${report.meta?.mode}`);
} catch { }

const out = r.join('\n');
fs.writeFileSync('./v8-verify.txt', out, 'utf8');
console.log(out);
