/**
 * ═══════════════════════════════════════════════════════════════
 *  CLONE ENGINE — React Code Generator (Core)
 *  DOM tree → React components + CSS files
 *
 *  - nodeToJSX: DOM node → JSX with stable CSS class names
 *  - Section deduplication (remove nested/wrapper sections)
 *  - Smart CSS filtering (defaults removal)
 *  - Global CSS generation (variables, keyframes, fonts)
 *  - HTML mode support
 * ═══════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';
import { getBrowserPool } from './browser-pool.mjs';
import { esc, escJSX, rewriteUrls, copyDir } from './utils.mjs';
import { getLogger } from './logger.mjs';

let _framerGenerateAvailable = false;
let generateFramerMotionCode = null;
try {
    const mod = await import('./framer-generate.mjs');
    generateFramerMotionCode = mod.generateFramerMotionCode || mod.default;
    _framerGenerateAvailable = !!generateFramerMotionCode;
} catch {}

export async function generate(inputPath, outputDir, options = {}) {
    const log = getLogger();
    log.phaseStart('GENERATE', options.mode || 'react');

    const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
    const mode = options.mode || 'react';

    fs.mkdirSync(outputDir, { recursive: true });

    if (mode === 'html') {
        await generateHTML(data, outputDir, options.url);
    } else {
        await generateReact(data, outputDir);
    }

    if (_framerGenerateAvailable && data.framerDynamics && Object.keys(data.framerDynamics).length > 0) {
        try {
            generateFramerMotionCode(data.framerDynamics, outputDir, data.animationPatterns);
        } catch (e) {
            log.warn('Framer motion code generation failed: ' + e.message);
        }
    }

    log.phaseEnd();
}


async function generateReact(data, outputDir) {
    const log = getLogger();
    const { sections, meta, cssVariables, keyframes, urlMap, fonts } = data;
    const srcDir = path.join(outputDir, 'src');
    const compDir = path.join(srcDir, 'components');
    const stylesDir = path.join(srcDir, 'styles');

    fs.mkdirSync(compDir, { recursive: true });
    fs.mkdirSync(stylesDir, { recursive: true });

    const existing = fs.readdirSync(compDir).filter(f => f.startsWith('Section') && f.endsWith('.tsx'));
    for (const f of existing) fs.unlinkSync(path.join(compDir, f));

    const extractAssets = path.resolve('clone-output', 'assets');
    const projectAssets = path.join(outputDir, 'public', 'assets');
    if (fs.existsSync(extractAssets)) {
        copyDir(extractAssets, projectAssets);
        log.info('Assets copied to public/assets/');
    }

    const origWidth = meta?.viewport?.w || meta?.width || 1920;

    let globalCss = `/* CloneEngine — Generated CSS */

html {
  scroll-behavior: smooth;
  overflow-x: hidden;
}
body {
  margin: 0;
  padding: 0;
  min-height: 100vh;
  overflow-x: hidden;
  width: 100%;
  max-width: ${origWidth}px;
  margin-left: auto;
  margin-right: auto;
}
*, *::before, *::after {
  box-sizing: border-box;
}
.clone-wrapper {
  width: 100%;
  max-width: ${origWidth}px;
  margin: 0 auto;
  overflow-x: hidden;
}
img { display: block; }
a { text-decoration: none; color: inherit; }

`;

    if (Object.keys(cssVariables || {}).length > 0) {
        globalCss += ':root {\n';
        for (const [k, v] of Object.entries(cssVariables)) {
            globalCss += `  ${k}: ${v};\n`;
        }
        globalCss += '}\n\n';
    }

    if (keyframes && Object.keys(keyframes).length > 0) {
        for (const [name, frames] of Object.entries(keyframes)) {
            globalCss += `@keyframes ${name} {\n`;
            for (const [key, props] of Object.entries(frames)) {
                globalCss += `  ${key} {\n`;
                for (const [p, v] of Object.entries(props)) {
                    globalCss += `    ${p}: ${v};\n`;
                }
                globalCss += '  }\n';
            }
            globalCss += '}\n\n';
        }
    }

    if (fonts?.length > 0) {
        for (const f of fonts) {
            let src = f.src || '';
            if (urlMap) {
                src = src.replace(/url\(["']?([^"')]+)["']?\)/g, (m, u) => {
                    const local = urlMap[u];
                    return local ? `url('${local}')` : m;
                });
            }
            globalCss += `@font-face {\n  font-family: '${f.family}';\n  src: ${src};\n  font-weight: ${f.weight || 'normal'};\n  font-style: ${f.style || 'normal'};\n}\n\n`;
        }
    }

    if (data.originalCSS) {
        globalCss += `/* Original Stylesheet */\n${data.originalCSS}\n\n`;
    }

    fs.writeFileSync(path.join(stylesDir, 'global.css'), globalCss);

    const dedupedSections = deduplicateSections(sections);
    log.info(`Sections: ${sections.length} -> ${dedupedSections.length} after dedup`);

    const componentNames = [];
    let allSectionCss = '';

    for (let i = 0; i < dedupedSections.length; i++) {
        const section = dedupedSections[i];
        const sectionId = section.id || `section-${i}`;
        const compName = `Section${String(i).padStart(2, '0')}`;
        const compNameLC = compName.toLowerCase();
        const sectionLabel = section.framerName || sectionId;
        componentNames.push({ name: compName, id: sectionId, label: sectionLabel });

        let sectionCss = '';
        const cssClasses = new Map();
        _classCounterMap[compNameLC] = 0;

        const jsxContent = section.dom
            ? nodeToJSX(section.dom, urlMap, cssClasses, compNameLC, sectionId, 0, origWidth)
            : `<div className="${compNameLC}-root" />`;

        for (const [className, styleData] of cssClasses) {
            const { styles, rect } = styleData;
            if (!styles || Object.keys(styles).length === 0) continue;

            const rewritten = rewriteUrls(styles, urlMap);
            const filtered = smartFilterDefaults(rewritten);

            if (Object.keys(filtered).length === 0 && !(rect && className.endsWith('-root'))) continue;

            sectionCss += `.${className} {\n`;
            for (const [prop, val] of Object.entries(filtered)) {
                sectionCss += `  ${camelToCSS(prop)}: ${val};\n`;
            }

            if (rect && className.endsWith('-root')) {
                if (rect.w > 0) sectionCss += `  width: ${Math.min(rect.w, origWidth)}px;\n`;
                if (rect.h > 0) sectionCss += `  min-height: ${rect.h}px;\n`;
            }

            sectionCss += '}\n\n';
        }

        allSectionCss += `/* ${compName} — ${sectionLabel} */\n${sectionCss}\n`;

        const compCode = `import React from 'react';

const ${compName} = () => {
  return (
    ${jsxContent}
  );
};

export default ${compName};
`;
        fs.writeFileSync(path.join(compDir, `${compName}.tsx`), compCode);
    }

    fs.writeFileSync(path.join(stylesDir, 'sections.css'), allSectionCss);

    const imports = componentNames.map(c => `import ${c.name} from './components/${c.name}';`).join('\n');
    const renders = componentNames.map(c => `      <${c.name} />`).join('\n');

    fs.writeFileSync(path.join(srcDir, 'App.tsx'), `import React from 'react';
import './styles/global.css';
import './styles/sections.css';
${imports}

const App = () => {
  return (
    <div className="clone-wrapper">
${renders}
    </div>
  );
};

export default App;
`);

    fs.writeFileSync(path.join(srcDir, 'main.tsx'), `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`);

    fs.writeFileSync(path.join(outputDir, 'index.html'), `<!DOCTYPE html>
<html lang="${data.meta?.lang || 'en'}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=${origWidth}, initial-scale=1.0" />
  <title>${data.meta?.title || 'Clone'}</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
`);

    fs.writeFileSync(path.join(outputDir, 'vite.config.ts'), `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: false },
});
`);

    fs.writeFileSync(path.join(outputDir, 'tsconfig.json'), JSON.stringify({
        compilerOptions: {
            target: 'ES2020', useDefineForClassFields: true, lib: ['ES2020', 'DOM', 'DOM.Iterable'],
            module: 'ESNext', skipLibCheck: true, moduleResolution: 'bundler',
            allowImportingTsExtensions: true, resolveJsonModule: true, isolatedModules: true,
            noEmit: true, jsx: 'react-jsx', strict: false,
        },
        include: ['src'],
    }, null, 2));

    fs.writeFileSync(path.join(outputDir, 'package.json'), JSON.stringify({
        name: 'clone-project',
        private: true,
        version: '1.0.0',
        type: 'module',
        scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
        dependencies: {
            react: '^18.3.1', 'react-dom': '^18.3.1',
            gsap: '^3.12.0', '@gsap/react': '^2.0.0', 'framer-motion': '^11.0.0',
        },
        devDependencies: {
            '@types/react': '^18.3.0', '@types/react-dom': '^18.3.0',
            '@vitejs/plugin-react': '^4.3.0', typescript: '^5.4.0', vite: '^5.4.0',
        },
    }, null, 2));

    log.success(`Generated ${componentNames.length} React components + CSS`);
}


// ═══ nodeToJSX ═══
const _classCounterMap = {};

function nodeToJSX(node, urlMap, cssClasses, compPrefix, sectionId, depth = 0, origWidth = 1920, maxDepth = 25) {
    if (depth > maxDepth) return '';
    if (!node) return '';

    if (node.type === 'text' || (!node.tag && node.content)) {
        return escJSX(node.content || node.text || '');
    }

    const tag = (node.tag || 'div').toLowerCase();
    const pad = '    '.repeat(depth + 2);
    const selfClosing = ['img', 'br', 'hr', 'input', 'meta', 'link', 'wbr'].includes(tag);

    let classBase;
    if (depth === 0) {
        classBase = `${compPrefix}-root`;
    } else if (node.framerName) {
        classBase = `${compPrefix}-${sanitizeClassName(node.framerName)}`;
    } else if (node.id) {
        classBase = `${compPrefix}-${sanitizeClassName(node.id)}`;
    } else {
        const counter = _classCounterMap[compPrefix] || 0;
        _classCounterMap[compPrefix] = counter + 1;
        classBase = `${compPrefix}-${tag}-${counter}`;
    }
    const className = classBase;

    if (node.styles) {
        cssClasses.set(className, {
            styles: node.styles,
            rect: depth === 0 ? node.rect : null,
        });
    }

    const attrs = [];
    attrs.push(`className="${className}"`);

    if (node.id) attrs.push(`id="${node.id}"`);
    if (node.framerName) attrs.push(`data-framer-name="${esc(node.framerName)}"`);

    if (node.src) {
        const mappedSrc = urlMap?.[node.src] || node.src;
        attrs.push(`src="${esc(mappedSrc)}"`);
    }
    if (node.href) attrs.push(`href="${esc(node.href)}"`);
    if (node.alt) attrs.push(`alt="${esc(node.alt)}"`);
    if (node.poster) {
        const mappedPoster = urlMap?.[node.poster] || node.poster;
        attrs.push(`poster="${esc(mappedPoster)}"`);
    }
    if (tag === 'video') {
        attrs.push('autoPlay', 'muted', 'loop', 'playsInline');
    }

    const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';

    if (selfClosing) {
        return `${pad}<${tag}${attrStr} />`;
    }

    const children = [];
    if (node.text && (!node.children || node.children.length === 0)) {
        children.push(`${pad}  ${escJSX(node.text)}`);
    }
    if (node.children) {
        for (const child of node.children) {
            const jsx = nodeToJSX(child, urlMap, cssClasses, compPrefix, sectionId, depth + 1, origWidth, maxDepth);
            if (jsx) children.push(jsx);
        }
    }

    if (children.length === 0) {
        return `${pad}<${tag}${attrStr} />`;
    }

    return `${pad}<${tag}${attrStr}>\n${children.join('\n')}\n${pad}</${tag}>`;
}

function sanitizeClassName(name) {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '').substring(0, 40);
}


// ═══ Smart CSS filter ═══
function smartFilterDefaults(styles) {
    const filtered = {};
    const DEFAULT_VALUES = new Set([
        '', 'none', 'normal', 'auto', '0px', '0', '0%',
        'start', 'baseline', 'rgb(0, 0, 0)', 'rgba(0, 0, 0, 0)',
        '0px 0px', '0% 0%', 'repeat', 'scroll', 'border-box',
        'padding-box', 'visible', 'static', 'stretch', 'row',
        'nowrap', 'content-box', 'ease', 'running', 'both',
        'clip', 'ltr', 'horizontal-tb', 'separate',
    ]);

    const KEEP_DEFAULTS_FOR = new Set([
        'display', 'position', 'flex-direction', 'justify-content',
        'align-items', 'flex-wrap', 'overflow', 'overflow-x', 'overflow-y',
        'box-sizing', 'white-space', 'text-overflow',
    ]);

    const ZERO_IS_DEFAULT = new Set([
        'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
        'border-top-left-radius', 'border-top-right-radius',
        'border-bottom-right-radius', 'border-bottom-left-radius',
        'outline-width', 'outline-offset', 'text-indent',
        'word-spacing', 'letter-spacing', 'top', 'right', 'bottom', 'left',
    ]);

    const NONE_IS_DEFAULT = new Set([
        'background-image', 'text-decoration', 'text-transform', 'transform',
        'filter', 'backdrop-filter', 'clip-path', 'mask-image', 'will-change',
        'animation-name', 'perspective', 'mix-blend-mode',
        'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
        'outline-style', 'float', 'clear',
    ]);

    for (const [prop, val] of Object.entries(styles)) {
        if (!val || val === '') continue;

        if ((prop === 'transition-property' || prop === 'transition-duration' ||
            prop === 'animation-duration' || prop === 'animation-delay') &&
            (val === '0s' || val === 'all' || val === 'none')) continue;

        if (prop.includes('border') && prop.includes('color') &&
            (!styles[prop.replace('color', 'style')] ||
            styles[prop.replace('color', 'style')] === 'none')) continue;

        if (ZERO_IS_DEFAULT.has(prop) && (val === '0px' || val === '0' || val === '0%')) continue;
        if (NONE_IS_DEFAULT.has(prop) && val === 'none') continue;

        if (KEEP_DEFAULTS_FOR.has(prop)) {
            filtered[prop] = val;
            continue;
        }

        if (DEFAULT_VALUES.has(val) && !KEEP_DEFAULTS_FOR.has(prop)) continue;

        if (prop.includes('border') && prop.includes('color') && val === 'rgb(0, 0, 0)') continue;
        if (prop === 'background-color' && val === 'rgba(0, 0, 0, 0)') continue;
        if (prop === 'font-style' && val === 'normal') continue;
        if (prop === 'font-weight' && val === '400') continue;

        filtered[prop] = val;
    }

    return filtered;
}

function camelToCSS(prop) {
    if (prop.includes('-')) return prop;
    return prop.replace(/([A-Z])/g, '-$1').toLowerCase();
}


// ═══ Deduplication ═══
function deduplicateSections(sections) {
    if (sections.length <= 1) return sections;

    const sorted = sections.map((s, i) => ({ ...s, origIdx: i }))
        .filter(s => s.rect && s.rect.h > 0)
        .sort((a, b) => a.rect.y - b.rect.y || b.rect.h - a.rect.h);

    const pageHeight = Math.max(...sorted.map(s => s.rect.y + s.rect.h));
    const wrapperThreshold = pageHeight * 0.85;

    const wrappers = sorted.filter(s => s.rect.h >= wrapperThreshold && sorted.length > 3);
    const nonWrappers = sorted.filter(s => !(s.rect.h >= wrapperThreshold && sorted.length > 3));

    if (nonWrappers.length === 0) return sorted;

    for (const wrapper of wrappers) {
        if (!wrapper.dom?.children || wrapper.dom.children.length === 0) continue;
        const wrapperChildren = flattenFirstLevel(wrapper.dom);

        for (const wChild of wrapperChildren) {
            const matchingSec = nonWrappers.find(s => {
                if (wChild.id && s.id === wChild.id) return true;
                if (wChild.id && s.dom?.id === wChild.id) return true;
                if (wChild.framerName && s.dom?.framerName === wChild.framerName) return true;
                if (s.rect && wChild.rect) {
                    return Math.abs(s.rect.y - wChild.rect.y) < 50 &&
                        Math.abs(s.rect.h - wChild.rect.h) < 100;
                }
                return false;
            });

            if (matchingSec) {
                const secChildCount = matchingSec.dom?.children?.length || 0;
                const wChildCount = wChild.children?.length || 0;
                if (wChildCount > secChildCount) {
                    matchingSec.dom = wChild;
                }
            }
        }
    }

    const result = [];
    for (let i = 0; i < nonWrappers.length; i++) {
        const sec = nonWrappers[i];
        if (sec.rect.h < 100 && sec.rect.w < 400) continue;

        let isNested = false;
        for (const added of result) {
            const aTop = added.rect.y;
            const aBot = added.rect.y + added.rect.h;
            const sTop = sec.rect.y;
            const sBot = sec.rect.y + sec.rect.h;

            if (sTop >= aTop - 10 && sBot <= aBot + 10 && sec.rect.h < added.rect.h * 0.8) {
                isNested = true;
                break;
            }
        }

        if (!isNested) result.push(sec);
    }

    return result;
}

function flattenFirstLevel(dom) {
    const nodes = [];
    if (!dom.children) return nodes;

    for (const child of dom.children) {
        if (child.children && child.children.length > 0 && !child.framerName && !child.id) {
            for (const grandchild of child.children) {
                nodes.push(grandchild);
            }
        } else {
            nodes.push(child);
        }
    }
    return nodes;
}


// ═══ HTML MODE ═══
async function generateHTML(data, outputDir, targetUrl) {
    const log = getLogger();
    const pool = getBrowserPool();
    await pool.init();

    try {
        const page = await pool.navigateTo('generate-html', targetUrl || data.meta?.url, { timeout: 60000 });
        await new Promise(r => setTimeout(r, 2000));

        const liveHTML = await page.evaluate(() => {
            const clone = document.documentElement.cloneNode(true);
            clone.querySelectorAll('script').forEach(s => s.remove());
            clone.querySelectorAll('[onclick]').forEach(el => el.removeAttribute('onclick'));
            return clone.outerHTML;
        });

        const allCSS = await page.evaluate(() => {
            let css = '';
            for (const sheet of document.styleSheets) {
                try {
                    for (const rule of sheet.cssRules) {
                        css += rule.cssText + '\n';
                    }
                } catch {}
            }
            return css;
        });

        let html = liveHTML;
        let css = allCSS;
        if (data.urlMap) {
            for (const [orig, local] of Object.entries(data.urlMap)) {
                if (orig && local && local !== orig) {
                    html = html.split(orig).join(local);
                    css = css.split(orig).join(local);
                }
            }
        }

        fs.writeFileSync(path.join(outputDir, 'styles.css'), css);
        fs.writeFileSync(path.join(outputDir, 'index.html'), `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${data.meta?.title || 'Clone'}</title>
  <link rel="stylesheet" href="styles.css" />
</head>
${html.replace(/<html[^>]*>/, '').replace(/<\/html>/, '')}
</html>`);

        const extractAssets = path.resolve('clone-output', 'assets');
        if (fs.existsSync(extractAssets)) {
            copyDir(extractAssets, path.join(outputDir, 'assets'));
        }

        fs.writeFileSync(path.join(outputDir, 'package.json'), JSON.stringify({
            name: 'clone-html',
            private: true,
            scripts: { dev: 'npx serve . -p 5173' },
        }, null, 2));

        await pool.releasePage('generate-html');
        log.success('HTML clone generated');
    } catch (err) {
        log.error('HTML generation failed: ' + err.message);
        throw err;
    }
}
