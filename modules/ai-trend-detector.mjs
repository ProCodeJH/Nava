/**
 * v6.0 AI Module: Design Trend Detector
 *
 * Style classification network:
 *  - Era detection (2020/2021/2022/2023/2024/2025)
 *  - Style classification (brutalism, glassmorphism, neumorphism, etc.)
 *  - Technology modernity scoring
 *  - Industry vertical guess
 *  - Design movement identification
 */

export function detectDesignTrends(dnaData) {
    const result = {
        primaryStyle: { name: 'unknown', confidence: 0 },
        secondaryStyles: [],
        era: { year: 2023, confidence: 0, signals: [] },
        industryGuess: { primary: 'unknown', confidence: 0 },
        modernityScore: 0,
        trendSignals: [],
        antiPatterns: [],
        insights: [],
    };

    // ═══ 1. Style Signal Detection (feature vector) ═══
    const signals = {
        glassmorphism: 0, brutalism: 0, neumorphism: 0, minimalism: 0,
        darkMode: 0, gradient: 0, flatDesign: 0, skeuomorphism: 0,
        organicShapes: 0, maximal: 0, editorial: 0, immersive: 0,
        bentoGrid: 0, aiNative: 0,
    };

    // Color signals
    const bgColors = Object.keys(dnaData.tokens?.colors?.backgrounds || {});
    const darkBgs = bgColors.filter(c => {
        const m = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        if (m) return (parseInt(m[1]) + parseInt(m[2]) + parseInt(m[3])) / 3 < 60;
        return false;
    });
    const hasTransparency = bgColors.some(c => c.includes('rgba') && parseFloat(c.split(',')[3]) < 0.9);

    if (darkBgs.length > bgColors.length * 0.4) {
        signals.darkMode += 3;
        result.trendSignals.push('Dark mode design');
    }
    if (hasTransparency) {
        signals.glassmorphism += 2;
        result.trendSignals.push('Transparency/frosted glass effects');
    }

    // Layout signals
    const grids = dnaData.layout?.grids?.length || 0;
    const sections = dnaData.layout?.sections?.length || 0;
    const flexboxes = dnaData.layout?.flexboxes?.length || 0;

    if (grids >= 3) { signals.bentoGrid += 2; result.trendSignals.push('Grid-heavy layout (Bento-style)'); }
    if (sections <= 3) { signals.minimalism += 2; }
    if (sections >= 8) { signals.maximal += 2; signals.immersive += 1; }

    // Typography signals
    const fonts = dnaData.tokens?.typography?.fonts || [];
    const hasSerifDisplay = fonts.some(f => {
        const l = f.toLowerCase();
        return l.includes('serif') || l.includes('playfair') || l.includes('instrument') || l.includes('arapey');
    });
    const hasSans = fonts.some(f => {
        const l = f.toLowerCase();
        return l.includes('sans') || l.includes('pretendard') || l.includes('urbanist') || l.includes('inter');
    });

    if (hasSerifDisplay && hasSans) {
        signals.editorial += 2;
        result.trendSignals.push('Serif + sans mixing — editorial trend');
    }
    if (hasSerifDisplay) { signals.editorial += 1; }
    if (fonts.length <= 2) { signals.minimalism += 1; }
    if (fonts.length > 6) { signals.maximal += 1; }

    // Animation signals
    const keyframes = dnaData.animation?.keyframes?.length || 0;
    const ioCount = dnaData.runtimeHook?.intersectionObservers?.length || 0;
    const rafCount = dnaData.runtimeHook?.rafCallbackCount || 0;
    const svgAnim = dnaData.svgAnimations?.cssAnimatedSVGs?.length || 0;

    if (ioCount > 10) { signals.immersive += 2; result.trendSignals.push('Heavy scroll triggering — immersive experience'); }
    if (rafCount > 200) { signals.immersive += 2; result.trendSignals.push('Continuous animation — cinematic feel'); }
    if (svgAnim > 3) { signals.organicShapes += 2; result.trendSignals.push('Animated SVGs — organic motion'); }

    // Modern CSS signals
    const viewTrans = dnaData.cssAdvanced?.summary?.viewTransitions || 0;
    const containerQ = dnaData.cssAdvanced?.summary?.containerQueries || 0;
    const scrollAnim = dnaData.cssAdvanced?.summary?.scrollDrivenAnimations || 0;
    const cssNesting = dnaData.cssAdvanced?.summary?.cssNesting || 0;

    if (viewTrans > 0) { signals.aiNative += 1; result.trendSignals.push('View Transitions API — 2024+ cutting edge'); }
    if (containerQ > 0) { result.trendSignals.push('Container queries — 2023+ modern'); }
    if (scrollAnim > 0) { signals.immersive += 1; result.trendSignals.push('CSS Scroll-driven animations — bleeding edge'); }

    // WebGL/3D signals
    const hasWebGL = (dnaData.webgl?.canvases?.length || 0) > 0;
    const hasLottie = (dnaData.lottieRive?.lottieFiles?.length || 0) > 0;
    if (hasWebGL) { signals.immersive += 3; result.trendSignals.push('WebGL/3D — immersive visual experience'); }
    if (hasLottie) { signals.aiNative += 1; result.trendSignals.push('Lottie animations — polished micro-interactions'); }

    // ═══ 2. Style Classification (Softmax-like ranking) ═══
    const sortedStyles = Object.entries(signals).sort((a, b) => b[1] - a[1]).filter(([_, v]) => v > 0);

    if (sortedStyles.length > 0) {
        const total = sortedStyles.reduce((sum, [_, v]) => sum + v, 0);
        result.primaryStyle = {
            name: styleToLabel(sortedStyles[0][0]),
            confidence: Math.round((sortedStyles[0][1] / total) * 100) / 100,
            rawScore: sortedStyles[0][1],
        };
        result.secondaryStyles = sortedStyles.slice(1, 4).map(([k, v]) => ({
            name: styleToLabel(k),
            confidence: Math.round((v / total) * 100) / 100,
        }));
    }

    // ═══ 3. Era Detection ═══
    let eraScore = 2020;
    const eraSignals = [];

    if (viewTrans > 0 || scrollAnim > 0) { eraScore = 2025; eraSignals.push('Bleeding-edge CSS APIs'); }
    else if (containerQ > 0 || cssNesting > 0) { eraScore = 2024; eraSignals.push('Modern CSS features'); }
    else if (signals.darkMode > 0 && ioCount > 5) { eraScore = 2023; eraSignals.push('Dark mode + scroll interactions'); }
    else if (signals.glassmorphism > 0) { eraScore = 2022; eraSignals.push('Glassmorphism effects'); }
    else if (grids > 0) { eraScore = 2021; eraSignals.push('CSS Grid adoption'); }

    if (hasSerifDisplay) { eraScore = Math.max(eraScore, 2023); eraSignals.push('Serif revival trend'); }
    if (rafCount > 100) { eraScore = Math.max(eraScore, 2023); eraSignals.push('Performance-aware animations'); }

    result.era = { year: eraScore, confidence: 0.6 + (eraSignals.length * 0.05), signals: eraSignals };

    // ═══ 4. Industry Guess ═══
    const crawledPages = dnaData.crawl?.total || 0;
    const hasAuth = (dnaData.authFlow?.loginForms?.length || 0) > 0;
    const routes = dnaData.spaRoutes?.discoveredRoutes?.length || 0;

    if (hasSerifDisplay && signals.editorial > 0) {
        result.industryGuess = { primary: 'Creative Agency / Portfolio', confidence: 0.7 };
    } else if (hasAuth && routes > 5) {
        result.industryGuess = { primary: 'SaaS / Web App', confidence: 0.6 };
    } else if (signals.darkMode > 0 && signals.immersive > 0) {
        result.industryGuess = { primary: 'Creative / Design Studio', confidence: 0.65 };
    } else if (crawledPages > 10) {
        result.industryGuess = { primary: 'Corporate / Enterprise', confidence: 0.5 };
    } else {
        result.industryGuess = { primary: 'General Website', confidence: 0.4 };
    }

    // ═══ 5. Modernity Score ═══
    result.modernityScore = Math.min(100, Math.round(
        (eraScore - 2020) * 12 +
        (viewTrans > 0 ? 15 : 0) +
        (containerQ > 0 ? 10 : 0) +
        (signals.immersive * 5) +
        (hasWebGL ? 10 : 0) +
        (hasLottie ? 5 : 0)
    ));

    // ═══ 6. Anti-Patterns ═══
    if (fonts.length > 6) result.antiPatterns.push('Excessive font variety — distracting');
    if (dnaData.accessibility?.score < 30) result.antiPatterns.push('Major accessibility issues');
    if (dnaData.performance?.fcp > 3000) result.antiPatterns.push('Slow initial render');
    if (Object.keys(dnaData.tokens?.colors?.backgrounds || {}).length > 20) result.antiPatterns.push('Color inconsistency');

    // ═══ Insights ═══
    result.insights.push(`Style: ${result.primaryStyle.name} (${Math.round(result.primaryStyle.confidence * 100)}%)`);
    result.insights.push(`Era: ~${result.era.year}`);
    result.insights.push(`Industry: ${result.industryGuess.primary}`);
    result.insights.push(`Modernity: ${result.modernityScore}/100`);

    return result;
}

function styleToLabel(key) {
    const labels = {
        glassmorphism: 'Glassmorphism',
        brutalism: 'Brutalism',
        neumorphism: 'Neumorphism',
        minimalism: 'Minimalism',
        darkMode: 'Dark Mode',
        gradient: 'Gradient-heavy',
        flatDesign: 'Flat Design',
        skeuomorphism: 'Skeuomorphism',
        organicShapes: 'Organic/Fluid',
        maximal: 'Maximalism',
        editorial: 'Editorial/Typography-first',
        immersive: 'Immersive/Cinematic',
        bentoGrid: 'Bento Grid',
        aiNative: 'AI-Native/Modern',
    };
    return labels[key] || key;
}
