/**
 * ═══════════════════════════════════════════════════════════════
 *  CLONE ENGINE — STAGE 2: ANALYZE
 *  site-snapshot.json → analysis.json
 *
 *  - Section classification (hero, grid, cards, marquee, etc.)
 *  - Animation pattern detection & GSAP/Motion mapping
 *  - Layout pattern recognition
 *  - Platform-specific feature detection (Framer, Webflow)
 * ═══════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';
import { getLogger } from './logger.mjs';
import { analyzeAnimationPatterns, PATTERN } from './animation-analyzer.mjs';

const __dirname = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1');

function loadPatternDB(name) {
    const p = path.join(__dirname, '..', 'patterns', `${name}.json`);
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
    catch { return {}; }
}

export async function analyze(snapshotPath, options = {}) {
    const log = getLogger();
    log.phaseStart('STAGE 2: ANALYZE', snapshotPath);

    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    const outputDir = options.outputDir || path.dirname(snapshotPath);
    const platform = snapshot.meta?.platform || 'generic';

    log.info(`Platform detected: ${platform}`);
    log.info(`Sections: ${snapshot.sections?.length || 0}`);

    const patternDB = {
        framer: loadPatternDB('framer'),
        webflow: loadPatternDB('webflow'),
        css: loadPatternDB('css'),
    };

    log.progress('Classifying sections...');
    const classifiedSections = snapshot.sections.map((section, i) => {
        const classification = classifySection(section, snapshot);
        return {
            index: i,
            id: section.id || `section-${i}`,
            tag: section.tag || 'div',
            rect: section.rect,
            framerName: section.framerName || null,
            type: classification.type,
            subType: classification.subType,
            confidence: classification.confidence,
            componentName: generateComponentName(classification.type, i),
            features: classification.features,
            dom: section.dom,
        };
    });

    log.progress('Analyzing animation patterns...');
    let animationPatterns = { patterns: [], summary: {} };
    if (snapshot.dynamics && Object.keys(snapshot.dynamics).length > 0) {
        try {
            animationPatterns = analyzeAnimationPatterns(snapshot.dynamics);
        } catch (e) {
            log.warn('Animation analysis partial: ' + e.message);
        }
    }

    log.progress('Mapping animations to sections...');
    const sectionAnimations = mapAnimationsToSections(
        classifiedSections, animationPatterns, snapshot.dynamics
    );

    log.progress('Detecting layout patterns...');
    const layoutPatterns = classifiedSections.map(section => ({
        sectionIndex: section.index,
        componentName: section.componentName,
        layout: detectLayoutPattern(section),
    }));

    const analysis = {
        meta: {
            ...snapshot.meta,
            analyzedAt: new Date().toISOString(),
            totalSections: classifiedSections.length,
        },
        platform,
        patternDB,
        sections: classifiedSections.map((section, i) => ({
            ...section,
            dom: section.dom,
            animations: sectionAnimations[i] || [],
            layout: layoutPatterns[i]?.layout || 'stack',
        })),
        globalAnimations: animationPatterns,
        fonts: snapshot.fonts || [],
        cssVariables: snapshot.cssVariables || {},
        keyframes: snapshot.keyframes || {},
        assets: snapshot.assets || {},
        urlMap: snapshot.urlMap || {},
    };

    const analysisPath = path.join(outputDir, 'analysis.json');
    fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));
    log.success(`Analysis saved -> ${analysisPath}`);

    const typeCounts = {};
    for (const s of classifiedSections) {
        typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
    }
    log.info('Section types: ' + Object.entries(typeCounts).map(([k, v]) => `${k}(${v})`).join(', '));
    log.info(`Animation patterns: ${animationPatterns.patterns?.length || 0}`);
    log.phaseEnd();

    return analysis;
}


// ═══ SECTION CLASSIFIER ═══
function classifySection(section, snapshot) {
    const dom = section.dom;
    if (!dom) return { type: 'generic', subType: null, confidence: 0.3, features: [] };

    const features = [];
    const rect = section.rect || {};
    const pageHeight = snapshot.meta?.height || 30000;

    const isFirst = rect.y < 200;
    const isLast = (rect.y + rect.h) > pageHeight - 300;
    const isNearTop = rect.y < pageHeight * 0.15;

    const textContent = collectText(dom);
    const imageCount = countTag(dom, 'img');
    const videoCount = countTag(dom, 'video');
    const linkCount = countTag(dom, 'a');
    const inputCount = countTag(dom, 'input') + countTag(dom, 'textarea');
    const heading = findFirstHeading(dom);
    const hasForm = countTag(dom, 'form') > 0 || inputCount > 1;
    const framerName = section.framerName?.toLowerCase() || '';

    if (section.tag === 'nav' || section.tag === 'header' ||
        framerName.includes('nav') || framerName.includes('header')) {
        features.push('navigation');
        return { type: 'header', subType: 'navigation', confidence: 0.95, features };
    }

    if (section.tag === 'footer' || isLast || framerName.includes('footer')) {
        if (linkCount > 3 || textContent.includes('\u00A9') || textContent.includes('copyright')) {
            features.push('footer-links', 'copyright');
            return { type: 'footer', subType: 'links', confidence: 0.9, features };
        }
    }

    if (isFirst || isNearTop) {
        if (videoCount > 0 || imageCount > 2 || (heading && heading.length > 3)) {
            features.push('hero-content');
            if (videoCount > 0) features.push('hero-video');
            if (imageCount > 3) features.push('hero-gallery');
            return { type: 'hero', subType: videoCount > 0 ? 'video' : 'standard', confidence: 0.85, features };
        }
    }

    if (hasForm || framerName.includes('contact') || framerName.includes('form')) {
        features.push('form', 'contact');
        return { type: 'contact', subType: 'form', confidence: 0.85, features };
    }

    if (rect.h < 500 && rect.h > 50) {
        if (hasTransformRotation(dom)) {
            features.push('marquee', 'rotation');
            return { type: 'marquee', subType: 'rotated', confidence: 0.8, features };
        }
    }

    const childCount = dom.children?.length || 0;
    if (childCount >= 3 && imageCount >= 3) {
        features.push('card-grid', 'images');
        return { type: 'cards', subType: 'image-grid', confidence: 0.75, features };
    }

    if (imageCount >= 2 && textContent.length > 100 &&
        (framerName.includes('project') || textContent.toLowerCase().includes('project'))) {
        features.push('projects');
        return { type: 'projects', subType: 'showcase', confidence: 0.8, features };
    }

    const numberCount = (textContent.match(/\d{2,}/g) || []).length;
    if (numberCount >= 3) {
        features.push('statistics', 'numbers');
        return { type: 'stats', subType: 'counters', confidence: 0.7, features };
    }

    if (textContent.includes('\u201C') || textContent.includes('\u201D') ||
        framerName.includes('testimonial') || framerName.includes('review')) {
        features.push('testimonial');
        return { type: 'testimonial', subType: 'quote', confidence: 0.65, features };
    }

    if (textContent.length > 200 && imageCount <= 2) {
        features.push('text-content');
        return { type: 'content', subType: 'text', confidence: 0.6, features };
    }

    if (imageCount >= 1 && textContent.length > 100) {
        features.push('mixed-content');
        return { type: 'content', subType: 'mixed', confidence: 0.55, features };
    }

    return { type: 'generic', subType: null, confidence: 0.3, features };
}


// ═══ LAYOUT PATTERN DETECTOR ═══
function detectLayoutPattern(section) {
    const dom = section.dom;
    if (!dom) return 'stack';

    const styles = dom.styles || {};
    const display = styles.display || '';
    const flexDirection = styles['flex-direction'] || styles.flexDirection || '';
    const gridTemplate = styles['grid-template-columns'] || styles.gridTemplateColumns || '';

    if (gridTemplate && gridTemplate !== 'none') return 'grid';
    if (display === 'flex' || display === 'inline-flex') {
        return flexDirection === 'row' || flexDirection === 'row-reverse' ? 'horizontal' : 'vertical';
    }
    if (display === 'grid' || display === 'inline-grid') return 'grid';

    return 'stack';
}


// ═══ ANIMATION → SECTION MAPPER ═══
function mapAnimationsToSections(sections, animationPatterns, dynamics) {
    const result = {};
    if (!animationPatterns?.patterns) return result;

    for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const sectionAnims = [];

        for (const pattern of animationPatterns.patterns) {
            if (pattern.scrollRange) {
                const { start, end } = pattern.scrollRange;
                const sTop = section.rect?.y || 0;
                const sBottom = sTop + (section.rect?.h || 0);

                if (start < sBottom && end > sTop) {
                    sectionAnims.push({
                        type: pattern.type,
                        motion: pattern.motionCode || null,
                        gsap: pattern.gsapCode || null,
                        confidence: pattern.confidence || 0.5,
                        scrollRange: pattern.scrollRange,
                    });
                }
            } else {
                sectionAnims.push({
                    type: pattern.type,
                    motion: pattern.motionCode || null,
                    confidence: pattern.confidence || 0.5,
                });
            }
        }

        result[i] = sectionAnims;
    }

    return result;
}


// ═══ HELPERS ═══
function collectText(node, maxLen = 2000) {
    if (!node) return '';
    let text = '';
    if (node.text) text += node.text + ' ';
    if (node.content) text += node.content + ' ';
    if (node.children) {
        for (const child of node.children) {
            text += collectText(child, maxLen - text.length);
            if (text.length >= maxLen) break;
        }
    }
    return text.substring(0, maxLen);
}

function countTag(node, tag) {
    if (!node) return 0;
    let count = node.tag === tag ? 1 : 0;
    if (node.children) {
        for (const child of node.children) count += countTag(child, tag);
    }
    return count;
}

function findFirstHeading(node) {
    if (!node) return null;
    if (['h1', 'h2', 'h3'].includes(node.tag)) return node.text || '';
    if (node.children) {
        for (const child of node.children) {
            const h = findFirstHeading(child);
            if (h) return h;
        }
    }
    return null;
}

function hasTransformRotation(node) {
    if (!node) return false;
    const transform = node.styles?.transform || '';
    if (transform.includes('rotate') || transform.includes('matrix')) {
        const m = transform.match(/matrix\(([^)]+)\)/);
        if (m) {
            const vals = m[1].split(',').map(v => parseFloat(v.trim()));
            if (vals.length >= 4 && (Math.abs(vals[1]) > 0.01 || Math.abs(vals[2]) > 0.01)) {
                return true;
            }
        }
    }
    if (node.children) {
        for (const child of node.children) {
            if (hasTransformRotation(child)) return true;
        }
    }
    return false;
}

function generateComponentName(type, index) {
    const nameMap = {
        header: 'Header',
        hero: 'Hero',
        content: `Content${index}`,
        cards: `Cards${index}`,
        projects: 'Projects',
        marquee: 'Marquee',
        stats: 'Stats',
        testimonial: 'Testimonials',
        contact: 'Contact',
        footer: 'Footer',
        generic: `Section${index}`,
    };
    return nameMap[type] || `Section${index}`;
}
