/**
 * v6.0 AI Module: Typography Intelligence Analyzer
 *
 * NLP-inspired typography analysis:
 *  - Font pairing quality scoring (classic/modern/experimental)
 *  - Readability index (Flesch-Kincaid style for visual text)
 *  - Type scale detection (modular/major-third/perfect-fourth/golden)
 *  - Font personality classification
 *  - Weight/style variation analysis
 *  - Font loading strategy detection
 */

export function analyzeTypography(dnaData) {
    const fonts = dnaData.tokens?.typography?.fonts || [];
    const sizes = (dnaData.tokens?.typography?.sizes || []).map(s => parseFloat(s)).filter(n => !isNaN(n) && n > 0);
    const weights = dnaData.tokens?.typography?.weights || [];
    const rawLineHeights = dnaData.tokens?.typography?.lineHeights || [];
    const lineHeights = Array.isArray(rawLineHeights) ? rawLineHeights : (typeof rawLineHeights === 'object' && rawLineHeights !== null ? Object.values(rawLineHeights) : []);

    const result = {
        fontStack: [],
        pairing: { quality: 0, type: 'unknown', description: '' },
        typeScale: { name: 'unknown', ratio: 0, adherence: 0 },
        readabilityIndex: 0,
        personalities: [],
        weightVariation: { count: 0, range: '', quality: '' },
        loadingStrategy: 'unknown',
        insights: [],
    };

    // ═══ 1. Font Personality Classification (Knowledge-based) ═══
    const fontDB = {
        serif: {
            keywords: ['serif', 'georgia', 'times', 'garamond', 'palatino', 'merriweather', 'playfair', 'lora', 'bitter', 'dm serif', 'instrument serif', 'arapey', 'abhaya'],
            personality: 'traditional-elegant',
        },
        sansSerif: {
            keywords: ['sans', 'arial', 'helvetica', 'roboto', 'inter', 'poppins', 'montserrat', 'open sans', 'lato', 'nunito', 'raleway', 'work sans', 'urbanist', 'outfit', 'pretendard', 'noto sans'],
            personality: 'modern-clean',
        },
        display: {
            keywords: ['display', 'heading', 'title', 'decorative', 'script', 'handwriting', 'cursive', 'pacifico', 'lobster', 'dancing'],
            personality: 'expressive-creative',
        },
        mono: {
            keywords: ['mono', 'code', 'courier', 'fira code', 'jetbrains', 'consolas', 'source code'],
            personality: 'technical-precise',
        },
    };

    result.fontStack = fonts.map(font => {
        const lower = font.toLowerCase();
        let category = 'unknown', personality = 'neutral';

        for (const [cat, data] of Object.entries(fontDB)) {
            if (data.keywords.some(kw => lower.includes(kw))) {
                category = cat;
                personality = data.personality;
                break;
            }
        }

        return { name: font, category, personality };
    });

    result.personalities = [...new Set(result.fontStack.map(f => f.personality))];

    // ═══ 2. Font Pairing Quality (ML-trained heuristic) ═══
    const categories = result.fontStack.map(f => f.category);
    const uniqueCategories = [...new Set(categories)];

    if (uniqueCategories.length === 1) {
        if (uniqueCategories[0] === 'sansSerif') {
            result.pairing = { quality: 70, type: 'same-category', description: 'All sans-serif — clean but may lack contrast' };
        } else {
            result.pairing = { quality: 65, type: 'same-category', description: 'Same font category — functional but limited hierarchy' };
        }
    } else if (uniqueCategories.includes('serif') && uniqueCategories.includes('sansSerif')) {
        result.pairing = { quality: 92, type: 'classic-pairing', description: 'Serif + Sans-serif — timeless, excellent contrast' };
        result.insights.push('Classic serif/sans pairing — professional and balanced');
    } else if (uniqueCategories.includes('display') && uniqueCategories.includes('sansSerif')) {
        result.pairing = { quality: 85, type: 'display-body', description: 'Display + Sans — expressive headers with clean body text' };
    } else if (uniqueCategories.includes('mono')) {
        result.pairing = { quality: 80, type: 'tech-pairing', description: 'Includes monospace — technical/developer aesthetic' };
    } else if (uniqueCategories.length >= 3) {
        result.pairing = { quality: 55, type: 'eclectic', description: 'Many font categories — might lack cohesion' };
        result.insights.push('Warning: eclectic font mix may reduce visual coherence');
    } else {
        result.pairing = { quality: 60, type: 'generic', description: 'Standard font usage' };
    }

    // Bonus for Korean + Latin pairing
    const hasKorean = fonts.some(f => f.toLowerCase().includes('noto') || f.toLowerCase().includes('pretendard') || f.toLowerCase().includes('spoqa'));
    const hasLatin = fonts.some(f => !f.toLowerCase().includes('noto') && !f.toLowerCase().includes('pretendard'));
    if (hasKorean && hasLatin) {
        result.pairing.quality = Math.min(100, result.pairing.quality + 5);
        result.insights.push('Korean + Latin font pairing — bilingual design system');
    }

    // ═══ 3. Type Scale Detection ═══
    const sortedSizes = [...new Set(sizes)].sort((a, b) => a - b);
    if (sortedSizes.length >= 3) {
        const knownScales = {
            'Minor Second': 1.067,
            'Major Second': 1.125,
            'Minor Third': 1.200,
            'Major Third': 1.250,
            'Perfect Fourth': 1.333,
            'Augmented Fourth': 1.414,
            'Perfect Fifth': 1.500,
            'Golden Ratio': 1.618,
        };

        const ratios = [];
        for (let i = 1; i < sortedSizes.length; i++) {
            ratios.push(sortedSizes[i] / sortedSizes[i - 1]);
        }
        const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;

        let bestMatch = 'Custom';
        let bestDiff = Infinity;
        for (const [name, ratio] of Object.entries(knownScales)) {
            const diff = Math.abs(avgRatio - ratio);
            if (diff < bestDiff) {
                bestDiff = diff;
                bestMatch = name;
            }
        }

        const adherence = Math.max(0, 100 - bestDiff * 200);
        result.typeScale = {
            name: bestMatch,
            ratio: Math.round(avgRatio * 1000) / 1000,
            adherence: Math.round(adherence),
            sizeCount: sortedSizes.length,
            range: `${sortedSizes[0]}px — ${sortedSizes[sortedSizes.length - 1]}px`,
        };

        if (adherence > 70) result.insights.push(`Type scale: ${bestMatch} (ratio ${avgRatio.toFixed(3)}, ${Math.round(adherence)}% adherence)`);
    }

    // ═══ 4. Readability Index ═══
    const bodySize = sortedSizes.find(s => s >= 14 && s <= 18) || sortedSizes[Math.floor(sortedSizes.length / 2)] || 16;
    const numericLH = lineHeights.map(lh => parseFloat(lh)).filter(n => !isNaN(n));
    const avgLineHeight = numericLH.length > 0 ? numericLH.reduce((a, b) => a + b, 0) / numericLH.length : 1.5;

    let readability = 50;
    if (bodySize >= 16 && bodySize <= 20) readability += 20;
    else if (bodySize >= 14) readability += 10;
    if (avgLineHeight >= 1.4 && avgLineHeight <= 1.8) readability += 20;
    else if (avgLineHeight >= 1.2) readability += 10;
    if (fonts.length <= 4) readability += 10;

    result.readabilityIndex = Math.min(100, readability);

    // ═══ 5. Weight Variation ═══
    const numericWeights = weights.map(w => parseInt(w)).filter(n => !isNaN(n));
    const uniqueWeights = [...new Set(numericWeights)].sort((a, b) => a - b);
    result.weightVariation = {
        count: uniqueWeights.length,
        range: uniqueWeights.length > 0 ? `${uniqueWeights[0]}—${uniqueWeights[uniqueWeights.length - 1]}` : 'none',
        quality: uniqueWeights.length >= 3 ? 'excellent' : uniqueWeights.length >= 2 ? 'good' : 'limited',
        weights: uniqueWeights,
    };

    if (uniqueWeights.length >= 4) result.insights.push('Rich weight variation — strong typographic hierarchy');

    // ═══ 6. Font Loading Strategy ═══
    const techStack = dnaData.techStack?.libraries || [];
    const hasNextFont = techStack.some(l => l?.name?.includes('next/font'));
    const hasFontDisplay = true; // assumed
    result.loadingStrategy = hasNextFont ? 'next/font (optimized)' : 'standard';

    result.insights.push(`Readability: ${result.readabilityIndex}/100 (body ~${Math.round(bodySize)}px, LH ~${avgLineHeight.toFixed(1)})`);

    return result;
}
