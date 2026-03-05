/**
 * v6.0 AI Module: Visual Hierarchy Analyzer
 *
 * Computer vision-inspired visual weight & hierarchy scoring:
 *  - Element visual weight estimation (size, color, contrast, position)
 *  - Information hierarchy assessment
 *  - Focal point detection
 *  - Visual flow direction analysis
 *  - Content-to-chrome ratio
 *  - Above/below-the-fold analysis
 */

export function analyzeVisualHierarchy(dnaData) {
    const sections = dnaData.layout?.sections || [];
    const fonts = dnaData.tokens?.typography?.fonts || [];
    const sizes = (dnaData.tokens?.typography?.sizes || []).map(s => parseFloat(s)).filter(n => !isNaN(n) && n > 0);

    const result = {
        hierarchyScore: 0,
        focalPoints: [],
        visualFlow: 'top-down',
        contrastHierarchy: { levels: 0, quality: 'flat' },
        sizeHierarchy: { levels: 0, range: 0, quality: 'flat' },
        aboveTheFold: { estimatedElements: 0, hasCTA: false, hasH1: false, quality: 'unknown' },
        contentToChromeRatio: 0,
        visualWeight: { top: 0, middle: 0, bottom: 0 },
        insights: [],
    };

    // ═══ 1. Size Hierarchy (Font scale depth) ═══
    const sortedSizes = [...new Set(sizes)].sort((a, b) => a - b);
    if (sortedSizes.length > 0) {
        const range = sortedSizes[sortedSizes.length - 1] - sortedSizes[0];
        const levels = sortedSizes.length;

        result.sizeHierarchy = {
            levels,
            range: Math.round(range),
            min: sortedSizes[0],
            max: sortedSizes[sortedSizes.length - 1],
            quality: levels >= 5 ? 'excellent' : levels >= 3 ? 'good' : 'weak',
        };

        if (levels >= 5) result.insights.push('Strong type hierarchy (' + levels + ' distinct sizes)');
    }

    // ═══ 2. Contrast Hierarchy ═══
    const bgColors = Object.keys(dnaData.tokens?.colors?.backgrounds || {});
    const textColors = Object.keys(dnaData.tokens?.colors?.textColors || {});

    const contrastLevels = new Set();
    bgColors.forEach(bg => {
        const lum = estimateLuminance(bg);
        if (lum > 0.8) contrastLevels.add('light-bg');
        else if (lum < 0.2) contrastLevels.add('dark-bg');
        else contrastLevels.add('mid-bg');
    });

    result.contrastHierarchy = {
        levels: contrastLevels.size,
        quality: contrastLevels.size >= 2 ? 'layered' : 'flat',
        hasLightDark: contrastLevels.has('light-bg') && contrastLevels.has('dark-bg'),
    };

    if (result.contrastHierarchy.hasLightDark) {
        result.insights.push('Light/dark contrast sections — strong visual hierarchy');
    }

    // ═══ 3. Focal Point Detection ═══
    // Hero section is primary focal point
    if (sections.length > 0) {
        const first = sections[0];
        result.focalPoints.push({
            type: 'hero',
            position: 'top',
            weight: first.height > 500 ? 'heavy' : 'medium',
            elements: ['heading', 'cta'],
        });
    }

    // Images/videos as focal points
    const svgCount = dnaData.svgAnimations?.totalSVGCount || 0;
    if (svgCount > 5) {
        result.focalPoints.push({
            type: 'visual-media',
            position: 'distributed',
            weight: 'medium',
            count: svgCount,
        });
    }

    // Animation focal points
    const keyframes = dnaData.animation?.keyframes?.length || 0;
    if (keyframes > 3) {
        result.focalPoints.push({
            type: 'animation',
            position: 'distributed',
            weight: 'attention-grabbing',
            count: keyframes,
        });
    }

    // ═══ 4. Visual Flow Direction ═══
    const io = dnaData.runtimeHook?.intersectionObservers?.length || 0;
    const hasParallax = (dnaData.layout?.parallax?.length || 0) > 0;
    const scrollDriven = dnaData.cssAdvanced?.summary?.scrollDrivenAnimations || 0;

    if (io > 5 || hasParallax || scrollDriven > 0) {
        result.visualFlow = 'scroll-driven';
        result.insights.push('Scroll-driven visual flow — users are guided through content');
    } else if (sections.length > 5) {
        result.visualFlow = 'top-down-sectioned';
    } else {
        result.visualFlow = 'top-down';
    }

    // ═══ 5. Above-the-Fold Analysis ═══  
    const spaRoutes = dnaData.spaRoutes?.analyzedRoutes || [];
    const homeRoute = spaRoutes.find(r => r.route === '/' || r.route === '') || spaRoutes[0];

    result.aboveTheFold = {
        hasH1: !!homeRoute?.h1,
        h1Text: homeRoute?.h1 || null,
        hasCTA: (dnaData.authFlow?.loginForms?.length || 0) > 0,
        sectionCount: Math.min(sections.length, 2),
        quality: 'unknown',
    };

    if (result.aboveTheFold.hasH1) {
        result.aboveTheFold.quality = result.aboveTheFold.hasCTA ? 'excellent' : 'good';
    } else {
        result.aboveTheFold.quality = 'needs-improvement';
        result.insights.push('No clear H1 above the fold — may hurt SEO and first impression');
    }

    // ═══ 6. Visual Weight Distribution ═══
    const totalSections = sections.length;
    if (totalSections >= 3) {
        const topThird = sections.slice(0, Math.ceil(totalSections / 3));
        const midThird = sections.slice(Math.ceil(totalSections / 3), Math.ceil(2 * totalSections / 3));
        const bottomThird = sections.slice(Math.ceil(2 * totalSections / 3));

        const calcWeight = (group) => {
            let w = 0;
            group.forEach(s => {
                w += (s.height || 200) / 100;
                w += (s.childCount || 0) * 0.5;
            });
            return Math.round(w);
        };

        result.visualWeight = {
            top: calcWeight(topThird),
            middle: calcWeight(midThird),
            bottom: calcWeight(bottomThird),
        };

        const total = result.visualWeight.top + result.visualWeight.middle + result.visualWeight.bottom;
        if (total > 0) {
            const topPct = result.visualWeight.top / total;
            if (topPct > 0.5) result.insights.push('Top-heavy layout — most visual weight above middle');
            else if (topPct < 0.2) result.insights.push('Bottom-heavy — consider strengthening the hero/header');
        }
    }

    // ═══ 7. Content-to-Chrome Ratio ═══
    const sticky = dnaData.layout?.sticky?.length || 0;
    const contentSections = sections.length;
    const chromeElements = sticky + 1; // nav + sticky elements
    result.contentToChromeRatio = contentSections > 0
        ? Math.round((contentSections / (contentSections + chromeElements)) * 100)
        : 0;

    // ═══ Overall Hierarchy Score ═══
    let score = 30;
    if (result.sizeHierarchy.quality === 'excellent') score += 20;
    else if (result.sizeHierarchy.quality === 'good') score += 10;
    if (result.contrastHierarchy.quality === 'layered') score += 15;
    if (result.focalPoints.length >= 2) score += 15;
    if (result.aboveTheFold.quality === 'excellent') score += 10;
    else if (result.aboveTheFold.quality === 'good') score += 5;
    if (result.visualFlow === 'scroll-driven') score += 10;

    result.hierarchyScore = Math.min(100, score);
    result.insights.push(`Visual hierarchy: ${result.hierarchyScore}/100`);

    return result;
}

function estimateLuminance(color) {
    if (!color) return 0.5;
    const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (rgbMatch) {
        const r = parseInt(rgbMatch[1]) / 255;
        const g = parseInt(rgbMatch[2]) / 255;
        const b = parseInt(rgbMatch[3]) / 255;
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    if (color.startsWith('#')) {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    return 0.5;
}
