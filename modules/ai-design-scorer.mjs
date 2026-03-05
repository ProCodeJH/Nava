/**
 * v6.0 AI Module: Design Quality Scorer
 * 
 * ML-inspired scoring using weighted heuristic neural network approach:
 *  - Visual Consistency Score (color coherence, spacing regularity)
 *  - Complexity Score (information density, cognitive load estimation)
 *  - Polish Score (micro-interactions, smooth transitions, refinement signals)
 *  - Overall Design Quality Index (0-100)
 */

/**
 * Score the overall design quality from extracted DNA data
 * @param {object} dnaData - Full design-dna extraction result
 * @returns {object} Multi-dimensional quality scores
 */
export function scoreDesignQuality(dnaData) {
    const scores = {
        visualConsistency: 0,
        colorCoherence: 0,
        typographySystem: 0,
        spacingRhythm: 0,
        animationPolish: 0,
        interactionRichness: 0,
        performanceHealth: 0,
        accessibilityGrade: 0,
        modernTechStack: 0,
        responsiveMaturity: 0,
        overallScore: 0,
        grade: 'F',
        insights: [],
        penalties: [],
        bonuses: [],
    };

    const weights = {
        visualConsistency: 0.15,
        colorCoherence: 0.12,
        typographySystem: 0.12,
        spacingRhythm: 0.08,
        animationPolish: 0.13,
        interactionRichness: 0.10,
        performanceHealth: 0.10,
        accessibilityGrade: 0.08,
        modernTechStack: 0.07,
        responsiveMaturity: 0.05,
    };

    // ═══ 1. Visual Consistency ═══
    const bgColors = Object.keys(dnaData.tokens?.colors?.backgrounds || {});
    const textColors = Object.keys(dnaData.tokens?.colors?.textColors || {});
    const totalUniqueColors = new Set([...bgColors, ...textColors]).size;

    // 3-7 colors = ideal palette, too many = inconsistent
    if (totalUniqueColors >= 3 && totalUniqueColors <= 7) {
        scores.visualConsistency = 95;
        scores.bonuses.push('Tight color palette (' + totalUniqueColors + ' colors)');
    } else if (totalUniqueColors <= 12) {
        scores.visualConsistency = 80;
    } else if (totalUniqueColors <= 20) {
        scores.visualConsistency = 60;
        scores.penalties.push('Too many unique colors (' + totalUniqueColors + ') — suggests inconsistency');
    } else {
        scores.visualConsistency = 40;
        scores.penalties.push('Color explosion (' + totalUniqueColors + ' colors) — design system likely missing');
    }

    // ═══ 2. Color Coherence ═══
    const cssVars = dnaData.tokens?.variables || {};
    const hasDesignTokens = Object.keys(cssVars).length > 5;
    scores.colorCoherence = hasDesignTokens ? 90 : 55;
    if (hasDesignTokens) scores.bonuses.push('CSS custom properties used (' + Object.keys(cssVars).length + ' vars)');
    else scores.insights.push('No CSS custom properties — consider a design token system');

    // ═══ 3. Typography System ═══
    const fonts = dnaData.tokens?.typography?.fonts || [];
    const fontSizes = dnaData.tokens?.typography?.sizes || [];

    if (fonts.length >= 2 && fonts.length <= 4) {
        scores.typographySystem = 85;
        scores.bonuses.push('Clean font stack (' + fonts.length + ' typefaces)');
    } else if (fonts.length === 1) {
        scores.typographySystem = 70;
        scores.insights.push('Single font — functional but limited expressiveness');
    } else if (fonts.length > 6) {
        scores.typographySystem = 45;
        scores.penalties.push('Too many fonts (' + fonts.length + ') — hurts loading and consistency');
    } else {
        scores.typographySystem = 65;
    }

    // Type scale analysis: check for modular scale pattern
    const numericSizes = fontSizes.map(s => parseFloat(s)).filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b);
    if (numericSizes.length >= 4) {
        const ratios = [];
        for (let i = 1; i < numericSizes.length; i++) {
            ratios.push(numericSizes[i] / numericSizes[i - 1]);
        }
        const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
        const ratioVariance = ratios.reduce((sum, r) => sum + Math.pow(r - avgRatio, 2), 0) / ratios.length;

        if (ratioVariance < 0.05) {
            scores.typographySystem = Math.min(100, scores.typographySystem + 10);
            scores.bonuses.push('Modular type scale detected (ratio ~' + avgRatio.toFixed(2) + ')');
        }
    }

    // ═══ 4. Spacing Rhythm ═══
    const rawPaddings = dnaData.tokens?.spacing?.paddings || [];
    const rawMargins = dnaData.tokens?.spacing?.margins || [];
    const toArray = v => Array.isArray(v) ? v : (typeof v === 'object' && v !== null ? Object.values(v) : []);
    const spacingValues = [...new Set([...toArray(rawPaddings), ...toArray(rawMargins)].map(s => parseFloat(s)).filter(n => !isNaN(n) && n > 0))].sort((a, b) => a - b);

    // Check for 4px/8px grid system
    const onGrid = spacingValues.filter(v => v % 4 === 0 || v % 8 === 0);
    const gridRatio = spacingValues.length > 0 ? onGrid.length / spacingValues.length : 0;
    scores.spacingRhythm = Math.round(40 + gridRatio * 60);
    if (gridRatio > 0.7) scores.bonuses.push('4/8px grid system detected (' + Math.round(gridRatio * 100) + '% adherence)');

    // ═══ 5. Animation Polish ═══
    const keyframes = dnaData.animation?.keyframes?.length || 0;
    const transitions = dnaData.animation?.transitions?.length || 0;
    const hovers = dnaData.interaction?.hovers?.length || 0;
    const ioCount = dnaData.runtimeHook?.intersectionObservers?.length || 0;
    const rafCount = dnaData.runtimeHook?.rafCallbackCount || 0;
    const svgAnimCount = dnaData.svgAnimations?.cssAnimatedSVGs?.length || 0;

    const animationSignals = keyframes + transitions + hovers + Math.min(ioCount, 10) + svgAnimCount;
    if (animationSignals >= 20) {
        scores.animationPolish = 95;
        scores.bonuses.push('Rich animation layer (' + animationSignals + ' signals)');
    } else if (animationSignals >= 10) {
        scores.animationPolish = 80;
    } else if (animationSignals >= 3) {
        scores.animationPolish = 55;
    } else {
        scores.animationPolish = 25;
        scores.penalties.push('Almost no animations — feels static');
    }

    if (rafCount > 100) {
        scores.animationPolish = Math.min(100, scores.animationPolish + 5);
        scores.bonuses.push('Heavy rAF usage (' + rafCount + ' callbacks) — continuous animation');
    }

    // ═══ 6. Interaction Richness ═══
    const modals = dnaData.interactions?.modals?.length || 0;
    const tabs = dnaData.interactions?.tabs?.length || 0;
    const dropdowns = dnaData.interactions?.dropdowns?.length || 0;
    const tooltips = dnaData.interactions?.tooltips?.length || 0;
    const customCursors = dnaData.interaction?.customCursors?.length || 0;

    const interactionSignals = hovers + modals + tabs + dropdowns + tooltips + customCursors;
    scores.interactionRichness = Math.min(100, 30 + interactionSignals * 4);
    if (customCursors > 0) scores.bonuses.push('Custom cursor detected — premium feel');
    if (interactionSignals > 15) scores.bonuses.push('Rich interactive layer (' + interactionSignals + ' patterns)');

    // ═══ 7. Performance Health ═══
    const fcp = dnaData.performance?.fcp || 5000;
    const cls = dnaData.performance?.cls || 1;
    const lhPerf = dnaData.lighthouse?.scores?.performance || 0;

    scores.performanceHealth = Math.round(lhPerf * 0.6 + (fcp < 1000 ? 40 : fcp < 2000 ? 30 : fcp < 3000 ? 20 : 10) + (cls < 0.01 ? 10 : cls < 0.1 ? 5 : 0));
    scores.performanceHealth = Math.min(100, scores.performanceHealth);
    if (lhPerf >= 90) scores.bonuses.push('Lighthouse performance ' + lhPerf + '/100');
    if (fcp < 800) scores.bonuses.push('Blazing fast FCP: ' + fcp + 'ms');

    // ═══ 8. Accessibility Grade ═══
    const a11yScore = dnaData.accessibility?.score || 0;
    const lhA11y = dnaData.lighthouse?.scores?.accessibility || 0;
    scores.accessibilityGrade = Math.round((a11yScore + lhA11y) / 2);
    if (scores.accessibilityGrade < 50) {
        scores.penalties.push('Poor accessibility (score: ' + scores.accessibilityGrade + ')');
    }

    // ═══ 9. Modern Tech Stack ═══
    const viewTransitions = dnaData.cssAdvanced?.summary?.viewTransitions || 0;
    const containerQueries = dnaData.cssAdvanced?.summary?.containerQueries || 0;
    const cssNesting = dnaData.cssAdvanced?.summary?.cssNesting || 0;
    const hasSelector = dnaData.cssAdvanced?.summary?.hasSelector || 0;
    const supportsCount = dnaData.cssAdvanced?.summary?.supportsConditions || 0;

    const modernSignals = viewTransitions + containerQueries + cssNesting + (hasSelector > 0 ? 1 : 0) + (supportsCount > 10 ? 1 : 0);
    scores.modernTechStack = Math.min(100, 40 + modernSignals * 12);
    if (viewTransitions > 0) scores.bonuses.push('View Transitions API — cutting edge');
    if (containerQueries > 0) scores.bonuses.push('Container Queries — modern responsive');

    // ═══ 10. Responsive Maturity ═══
    const breakpoints = dnaData.responsive?.breakpoints || [];
    const routes = dnaData.spaRoutes?.discoveredRoutes?.length || 0;

    scores.responsiveMaturity = Math.min(100, 30 + breakpoints.length * 15 + (routes > 3 ? 10 : 0));
    if (breakpoints.length >= 4) scores.bonuses.push('Full responsive breakpoint coverage (' + breakpoints.length + ')');

    // ═══ WEIGHTED OVERALL SCORE ═══
    let totalScore = 0;
    for (const [key, weight] of Object.entries(weights)) {
        totalScore += scores[key] * weight;
    }
    scores.overallScore = Math.round(totalScore);

    // Grade
    if (scores.overallScore >= 90) scores.grade = 'A+';
    else if (scores.overallScore >= 85) scores.grade = 'A';
    else if (scores.overallScore >= 80) scores.grade = 'A-';
    else if (scores.overallScore >= 75) scores.grade = 'B+';
    else if (scores.overallScore >= 70) scores.grade = 'B';
    else if (scores.overallScore >= 65) scores.grade = 'B-';
    else if (scores.overallScore >= 60) scores.grade = 'C+';
    else if (scores.overallScore >= 55) scores.grade = 'C';
    else if (scores.overallScore >= 50) scores.grade = 'C-';
    else if (scores.overallScore >= 40) scores.grade = 'D';
    else scores.grade = 'F';

    // Summary insights
    scores.insights.push(
        `Design Quality Grade: ${scores.grade} (${scores.overallScore}/100)`,
        `Strongest: ${getStrongest(scores, weights)}`,
        `Weakest: ${getWeakest(scores, weights)}`,
    );

    return scores;
}

function getStrongest(scores, weights) {
    const dims = Object.keys(weights);
    dims.sort((a, b) => scores[b] - scores[a]);
    return dims[0].replace(/([A-Z])/g, ' $1').trim() + ' (' + scores[dims[0]] + ')';
}

function getWeakest(scores, weights) {
    const dims = Object.keys(weights);
    dims.sort((a, b) => scores[a] - scores[b]);
    return dims[0].replace(/([A-Z])/g, ' $1').trim() + ' (' + scores[dims[0]] + ')';
}
