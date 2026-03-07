/**
 * CloneEngine — Utilities
 * Shared helpers used by crawl, analyze, generate, build stages
 */

import fs from 'fs';
import path from 'path';

export const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// CSS properties to extract from computed styles
export const CSS_PROPERTIES = [
    'display', 'position', 'top', 'right', 'bottom', 'left',
    'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
    'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'background-color', 'background-image', 'background-size', 'background-position',
    'background-repeat', 'background-attachment',
    'color', 'font-family', 'font-size', 'font-weight', 'font-style',
    'line-height', 'letter-spacing', 'text-align', 'text-decoration', 'text-transform',
    'white-space', 'word-break', 'overflow-wrap',
    'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
    'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
    'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
    'border-top-left-radius', 'border-top-right-radius',
    'border-bottom-right-radius', 'border-bottom-left-radius',
    'box-shadow', 'text-shadow', 'opacity',
    'overflow', 'overflow-x', 'overflow-y', 'z-index',
    'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-self',
    'flex-grow', 'flex-shrink', 'flex-basis', 'gap', 'order',
    'grid-template-columns', 'grid-template-rows', 'grid-column', 'grid-row',
    'transform', 'transform-origin', 'perspective',
    'transition-property', 'transition-duration', 'transition-timing-function',
    'animation-name', 'animation-duration', 'animation-delay',
    'animation-timing-function', 'animation-iteration-count',
    'filter', 'backdrop-filter', 'mix-blend-mode', 'clip-path',
    'cursor', 'pointer-events', 'user-select',
    'object-fit', 'object-position', 'aspect-ratio',
    'will-change', 'contain', 'isolation',
];

// Auto-scroll to trigger lazy-loaded content
export async function autoScroll(page, delay = 150) {
    await page.evaluate(async (scrollDelay) => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 300;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, scrollDelay);
        });
    }, delay);
}

// kebab-case to camelCase
export function cssToCamel(prop) {
    return prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

// camelCase to kebab-case
export function camelToCSS(prop) {
    if (prop.includes('-')) return prop;
    return prop.replace(/([A-Z])/g, '-$1').toLowerCase();
}

// Escape for HTML attributes
export function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Escape for JSX text content
export function escJSX(str) {
    if (!str) return '';
    return String(str).replace(/[{}<>]/g, (c) => {
        const map = { '{': '&#123;', '}': '&#125;', '<': '&lt;', '>': '&gt;' };
        return map[c] || c;
    });
}

// Rewrite asset URLs using urlMap
export function rewriteUrls(styles, urlMap) {
    if (!urlMap || !styles) return styles;
    const result = {};
    for (const [prop, val] of Object.entries(styles)) {
        if (typeof val === 'string' && val.includes('url(')) {
            result[prop] = val.replace(/url\(["']?([^"')]+)["']?\)/g, (m, u) => {
                const local = urlMap[u];
                return local ? `url('${local}')` : m;
            });
        } else {
            result[prop] = val;
        }
    }
    return result;
}

// Copy directory recursively
export function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}
