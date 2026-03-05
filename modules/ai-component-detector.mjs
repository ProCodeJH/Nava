/**
 * v6.0 AI Module: UI Component Pattern Detector
 *
 * Object detection-inspired component classification:
 *  - Identifies named UI patterns (navbar, hero, card, CTA, pricing, footer, etc.)
 *  - Component interaction model classification
 *  - Design system maturity assessment
 *  - Reusability scoring
 */

export function detectComponents(dnaData) {
    const sections = dnaData.layout?.sections || [];
    const flexboxes = dnaData.layout?.flexboxes || [];
    const grids = dnaData.layout?.grids || [];
    const hovers = dnaData.interaction?.hovers || [];
    const spaRoutes = dnaData.spaRoutes?.analyzedRoutes || [];

    const result = {
        detectedComponents: [],
        componentCounts: {},
        designSystemMaturity: { score: 0, level: 'none', factors: [] },
        reusabilityScore: 0,
        componentTree: [],
        insights: [],
    };

    // ═══ 1. Component Detection (Pattern matching classifier) ═══
    const detectors = [
        {
            name: 'Navigation Bar',
            category: 'navigation',
            detect: () => {
                const sticky = dnaData.layout?.sticky || [];
                const hasStickyNav = sticky.some(s => s.tagName === 'nav' || s.tagName === 'header' || (s.className || '').toLowerCase().includes('nav'));
                return hasStickyNav ? { found: true, confidence: 0.95 } : { found: sections.length > 0, confidence: 0.7 };
            },
        },
        {
            name: 'Hero Section',
            category: 'content',
            detect: () => {
                const first = sections[0];
                if (!first) return { found: false };
                const isHero = (first.height || 0) > 400 || (first.className || '').toLowerCase().includes('hero');
                return { found: isHero, confidence: isHero ? 0.85 : 0 };
            },
        },
        {
            name: 'Card Grid',
            category: 'content',
            detect: () => {
                const hasGrid = grids.length > 0 || flexboxes.filter(f => f.wrap === 'wrap').length > 0;
                return { found: hasGrid, confidence: hasGrid ? 0.75 : 0 };
            },
        },
        {
            name: 'Image Gallery',
            category: 'media',
            detect: () => {
                const svgCount = dnaData.svgAnimations?.totalSVGCount || 0;
                return { found: svgCount > 10, confidence: svgCount > 10 ? 0.6 : 0 };
            },
        },
        {
            name: 'Form/Input',
            category: 'interaction',
            detect: () => {
                const forms = dnaData.authFlow?.loginForms?.length || 0;
                return { found: forms > 0, confidence: forms > 0 ? 0.9 : 0 };
            },
        },
        {
            name: 'Modal/Dialog',
            category: 'interaction',
            detect: () => {
                const modals = dnaData.interactions?.modals?.length || 0;
                return { found: modals > 0, confidence: modals > 0 ? 0.85 : 0 };
            },
        },
        {
            name: 'Tab System',
            category: 'interaction',
            detect: () => {
                const tabs = dnaData.interactions?.tabs?.length || 0;
                return { found: tabs > 0, confidence: tabs > 0 ? 0.9 : 0 };
            },
        },
        {
            name: 'Accordion',
            category: 'interaction',
            detect: () => {
                const accordions = dnaData.interactions?.accordions?.length || 0;
                return { found: accordions > 0, confidence: accordions > 0 ? 0.9 : 0 };
            },
        },
        {
            name: 'Dropdown Menu',
            category: 'navigation',
            detect: () => {
                const dd = dnaData.interactions?.dropdowns?.length || 0;
                return { found: dd > 0, confidence: dd > 0 ? 0.85 : 0 };
            },
        },
        {
            name: 'Tooltip',
            category: 'feedback',
            detect: () => {
                const tt = dnaData.interactions?.tooltips?.length || 0;
                return { found: tt > 0, confidence: tt > 0 ? 0.8 : 0 };
            },
        },
        {
            name: 'Scroll Animation',
            category: 'animation',
            detect: () => {
                const io = dnaData.runtimeHook?.intersectionObservers?.length || 0;
                return { found: io > 3, confidence: io > 3 ? 0.8 : 0 };
            },
        },
        {
            name: 'Sticky Element',
            category: 'navigation',
            detect: () => {
                const sticky = dnaData.layout?.sticky?.length || 0;
                return { found: sticky > 0, confidence: sticky > 0 ? 0.9 : 0 };
            },
        },
        {
            name: 'Footer',
            category: 'navigation',
            detect: () => {
                const lastSection = sections[sections.length - 1];
                if (!lastSection) return { found: false };
                const isFooter = (lastSection.tagName || '').toLowerCase() === 'footer' || (lastSection.className || '').includes('footer');
                return { found: true, confidence: isFooter ? 0.95 : 0.6 };
            },
        },
        {
            name: 'Animated SVG',
            category: 'media',
            detect: () => {
                const anim = dnaData.svgAnimations?.cssAnimatedSVGs?.length || 0;
                return { found: anim > 0, confidence: anim > 0 ? 0.85 : 0 };
            },
        },
        {
            name: 'Cookie Banner / Consent',
            category: 'compliance',
            detect: () => {
                const cookies = dnaData.apiIntelligence?.cookies?.length || 0;
                return { found: cookies > 0, confidence: cookies > 0 ? 0.5 : 0 };
            },
        },
    ];

    detectors.forEach(detector => {
        const detection = detector.detect();
        if (detection.found && detection.confidence > 0.4) {
            result.detectedComponents.push({
                name: detector.name,
                category: detector.category,
                confidence: detection.confidence,
            });
        }
    });

    // Component counts by category
    result.detectedComponents.forEach(c => {
        result.componentCounts[c.category] = (result.componentCounts[c.category] || 0) + 1;
    });

    // ═══ 2. Design System Maturity ═══
    const factors = [];
    let maturityScore = 0;

    const cssVars = Object.keys(dnaData.tokens?.variables || {}).length;
    if (cssVars > 20) { maturityScore += 25; factors.push('Rich CSS custom properties (' + cssVars + ')'); }
    else if (cssVars > 5) { maturityScore += 15; factors.push('Some CSS  variables (' + cssVars + ')'); }

    const fontCount = dnaData.tokens?.typography?.fonts?.length || 0;
    if (fontCount >= 2 && fontCount <= 4) { maturityScore += 15; factors.push('Controlled font stack'); }

    const componentVariety = result.detectedComponents.length;
    if (componentVariety >= 8) { maturityScore += 20; factors.push('Rich component library (' + componentVariety + ' types)'); }
    else if (componentVariety >= 4) { maturityScore += 10; factors.push('Basic component set'); }

    const lhBP = dnaData.lighthouse?.scores?.bestPractices || 0;
    if (lhBP >= 90) { maturityScore += 15; factors.push('Best practices compliance'); }

    const consistentAnimations = (dnaData.animation?.easings || []).length;
    if (consistentAnimations > 0 && consistentAnimations <= 3) { maturityScore += 10; factors.push('Consistent easing patterns'); }

    maturityScore = Math.min(100, maturityScore);
    result.designSystemMaturity = {
        score: maturityScore,
        level: maturityScore >= 80 ? 'advanced' : maturityScore >= 50 ? 'intermediate' : maturityScore >= 25 ? 'basic' : 'none',
        factors,
    };

    // ═══ 3. Reusability Score ═══
    // Higher = more reusable components detected
    result.reusabilityScore = Math.min(100, Math.round(
        (componentVariety / 15) * 40 +
        (cssVars > 10 ? 30 : cssVars > 3 ? 15 : 0) +
        (maturityScore / 100) * 30
    ));

    // ═══ Insights ═══
    result.insights.push(`${result.detectedComponents.length} UI components detected`);
    result.insights.push(`Design system: ${result.designSystemMaturity.level} (${maturityScore}/100)`);
    result.insights.push(`Reusability: ${result.reusabilityScore}/100`);

    return result;
}
