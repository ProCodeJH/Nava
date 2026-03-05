/**
 * v6.0 AI Module: Layout Pattern Classifier
 *
 * CNN-inspired layout pattern recognition:
 *  - Identifies common layout archetypes (hero, card grid, masonry, split, etc.)
 *  - Section purpose classification
 *  - Visual weight distribution scoring
 *  - Whitespace analysis
 *  - Z-pattern and F-pattern detection
 */

export function classifyLayoutPatterns(dnaData) {
    const sections = dnaData.layout?.sections || [];
    const grids = dnaData.layout?.grids || [];
    const flexboxes = dnaData.layout?.flexboxes || [];

    const result = {
        patterns: [],
        layoutArchetype: 'unknown',
        sectionClassifications: [],
        whitespaceScore: 0,
        readingPattern: null,
        densityMap: [],
        gridSystemDetected: false,
        symmetryScore: 0,
        insights: [],
    };

    // ═══ 1. Section Classification (Neural pattern matching) ═══
    sections.forEach((section, index) => {
        const classification = classifySection(section, index, sections.length);
        result.sectionClassifications.push(classification);
        if (!result.patterns.includes(classification.pattern)) {
            result.patterns.push(classification.pattern);
        }
    });

    // ═══ 2. Layout Archetype (Decision tree classifier) ═══
    const hasHero = result.sectionClassifications.some(s => s.pattern === 'hero');
    const cardGridCount = result.sectionClassifications.filter(s => s.pattern === 'card-grid').length;
    const splitCount = result.sectionClassifications.filter(s => s.pattern === 'split-content').length;
    const totalSections = sections.length;

    if (hasHero && cardGridCount >= 1) {
        result.layoutArchetype = 'landing-page';
    } else if (hasHero && splitCount >= 2) {
        result.layoutArchetype = 'portfolio';
    } else if (cardGridCount >= 3) {
        result.layoutArchetype = 'dashboard';
    } else if (totalSections <= 2 && hasHero) {
        result.layoutArchetype = 'single-page';
    } else if (totalSections >= 6) {
        result.layoutArchetype = 'long-scroll';
    } else if (splitCount >= 2) {
        result.layoutArchetype = 'editorial';
    } else {
        result.layoutArchetype = 'standard';
    }

    // ═══ 3. Grid System Detection ═══
    if (grids.length > 0) {
        result.gridSystemDetected = true;
        const columns = grids.map(g => {
            const cols = g.templateColumns || '';
            const match = cols.match(/repeat\((\d+)/);
            return match ? parseInt(match[1]) : cols.split(' ').filter(Boolean).length;
        });
        result.gridColumns = [...new Set(columns)];
    }

    // ═══ 4. Whitespace Analysis ═══
    const rawSpacings = dnaData.tokens?.spacing?.paddings || [];
    const spacings = Array.isArray(rawSpacings) ? rawSpacings : (typeof rawSpacings === 'object' && rawSpacings !== null ? Object.values(rawSpacings) : []);
    const numericSpacings = spacings.map(s => parseFloat(s)).filter(n => !isNaN(n));
    const avgSpacing = numericSpacings.length > 0 ? numericSpacings.reduce((a, b) => a + b, 0) / numericSpacings.length : 0;

    if (avgSpacing > 40) {
        result.whitespaceScore = 90;
        result.insights.push('Generous whitespace — premium, breathable feel');
    } else if (avgSpacing > 20) {
        result.whitespaceScore = 70;
        result.insights.push('Balanced whitespace — good readability');
    } else {
        result.whitespaceScore = 40;
        result.insights.push('Tight spacing — information-dense layout');
    }

    // ═══ 5. Reading Pattern Detection ═══
    const firstSection = result.sectionClassifications[0];
    if (firstSection) {
        if (firstSection.pattern === 'hero' || firstSection.pattern === 'full-hero') {
            result.readingPattern = 'Z-pattern';
            result.insights.push('Z-pattern reading flow — eye moves across hero, then diagonally down');
        } else if (firstSection.hasTextBlock) {
            result.readingPattern = 'F-pattern';
            result.insights.push('F-pattern reading flow — users scan header then left side');
        } else {
            result.readingPattern = 'Scanning';
            result.insights.push('Scannable layout — visual elements guide the eye');
        }
    }

    // ═══ 6. Content Density Map ═══
    result.densityMap = result.sectionClassifications.map((s, i) => ({
        section: i,
        pattern: s.pattern,
        density: s.elementDensity || 'medium',
        estimatedViewportHeight: s.estimatedHeight || 'auto',
    }));

    // ═══ 7. Symmetry Analysis ═══
    const flexDirections = flexboxes.map(f => f.direction || 'row');
    const rowCount = flexDirections.filter(d => d === 'row').length;
    const colCount = flexDirections.filter(d => d === 'column').length;
    const centeredFlex = flexboxes.filter(f => f.alignItems === 'center' || f.justifyContent === 'center').length;
    const centerRatio = flexboxes.length > 0 ? centeredFlex / flexboxes.length : 0;

    result.symmetryScore = Math.round(centerRatio * 100);
    if (centerRatio > 0.5) result.insights.push('Highly centered layout (' + Math.round(centerRatio * 100) + '%) — structured and balanced');

    result.insights.push(`Layout archetype: ${result.layoutArchetype}`);
    result.insights.push(`${result.patterns.length} distinct layout patterns detected`);

    return result;
}

function classifySection(section, index, totalSections) {
    const classList = (section.className || '').toLowerCase();
    const tagName = (section.tagName || '').toLowerCase();
    const childCount = section.childCount || 0;
    const hasImage = section.hasImage || false;
    const hasVideo = section.hasVideo || false;
    const height = section.height || 0;

    const classification = {
        index,
        pattern: 'generic',
        purpose: 'unknown',
        confidence: 0.5,
        elementDensity: childCount > 20 ? 'high' : childCount > 5 ? 'medium' : 'low',
        estimatedHeight: height > 800 ? 'full-viewport' : height > 400 ? 'half-viewport' : 'compact',
        hasTextBlock: false,
    };

    // Hero section: first section, large, often has bg image
    if (index === 0 && (height > 500 || classList.includes('hero') || classList.includes('banner') || classList.includes('jumbotron'))) {
        classification.pattern = height > 800 ? 'full-hero' : 'hero';
        classification.purpose = 'primary-engagement';
        classification.confidence = 0.9;
    }
    // Footer
    else if (index === totalSections - 1 || tagName === 'footer' || classList.includes('footer')) {
        classification.pattern = 'footer';
        classification.purpose = 'navigation-and-info';
        classification.confidence = 0.95;
    }
    // Card grid
    else if (classList.includes('grid') || classList.includes('card') || classList.includes('portfolio') || classList.includes('project')) {
        classification.pattern = 'card-grid';
        classification.purpose = 'content-showcase';
        classification.confidence = 0.8;
    }
    // Testimonial / CTA
    else if (classList.includes('testimonial') || classList.includes('review') || classList.includes('client')) {
        classification.pattern = 'testimonial';
        classification.purpose = 'social-proof';
        classification.confidence = 0.85;
    }
    else if (classList.includes('cta') || classList.includes('action') || classList.includes('subscribe')) {
        classification.pattern = 'call-to-action';
        classification.purpose = 'conversion';
        classification.confidence = 0.85;
    }
    // Split content (image + text)
    else if (childCount <= 5 && hasImage) {
        classification.pattern = 'split-content';
        classification.purpose = 'feature-showcase';
        classification.confidence = 0.6;
    }
    // Text block sections
    else if (childCount > 10 && !hasImage) {
        classification.pattern = 'text-block';
        classification.purpose = 'information';
        classification.confidence = 0.55;
        classification.hasTextBlock = true;
    }

    return classification;
}
