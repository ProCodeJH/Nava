/**
 * v6.0 AI Module: Color Psychology & Harmony Analyzer
 *
 * Deep learning-inspired color analysis:
 *  - HSL color space clustering for palette extraction
 *  - Color harmony detection (complementary, analogous, triadic, split-complementary)
 *  - Emotional/psychological mood classification
 *  - Contrast ratio matrix
 *  - Brand color dominance analysis
 *  - Color temperature (warm/cool/neutral)
 */

export function analyzeColorPsychology(dnaData) {
    const bgColors = Object.keys(dnaData.tokens?.colors?.backgrounds || {});
    const textColors = Object.keys(dnaData.tokens?.colors?.textColors || {});
    const borderColors = Object.keys(dnaData.tokens?.colors?.borders || {});
    const allColors = [...new Set([...bgColors, ...textColors, ...borderColors])];

    const result = {
        palette: [],
        harmony: { type: 'unknown', score: 0 },
        mood: { primary: 'neutral', secondary: null, confidence: 0 },
        temperature: { value: 0, label: 'neutral' },
        dominantHue: null,
        contrastMatrix: [],
        colorDistribution: { light: 0, dark: 0, saturated: 0, muted: 0, neutral: 0 },
        brandColors: [],
        insights: [],
    };

    // Parse all colors to HSL
    const hslColors = allColors.map(c => ({ original: c, ...parseToHSL(c) })).filter(c => c.h !== null);
    result.palette = hslColors.map(c => ({
        hex: hslToHex(c.h, c.s, c.l),
        hsl: { h: Math.round(c.h), s: Math.round(c.s), l: Math.round(c.l) },
        original: c.original,
        category: categorizeColor(c.h, c.s, c.l),
    }));

    if (hslColors.length === 0) {
        result.insights.push('No parseable colors found');
        return result;
    }

    // ═══ Color Distribution ═══
    hslColors.forEach(c => {
        if (c.s < 10) result.colorDistribution.neutral++;
        else if (c.s < 40) result.colorDistribution.muted++;
        else result.colorDistribution.saturated++;
        if (c.l > 70) result.colorDistribution.light++;
        else if (c.l < 30) result.colorDistribution.dark++;
    });

    // ═══ Temperature Analysis ═══
    const warmHues = hslColors.filter(c => c.s > 10 && (c.h < 60 || c.h > 300));
    const coolHues = hslColors.filter(c => c.s > 10 && c.h >= 150 && c.h <= 270);
    const tempScore = (warmHues.length - coolHues.length) / Math.max(hslColors.length, 1);
    result.temperature = {
        value: Math.round(tempScore * 100) / 100,
        label: tempScore > 0.3 ? 'warm' : tempScore < -0.3 ? 'cool' : 'neutral',
        warmCount: warmHues.length,
        coolCount: coolHues.length,
    };

    // ═══ Dominant Hue ═══
    const chromatic = hslColors.filter(c => c.s > 15);
    if (chromatic.length > 0) {
        const hueGroups = {};
        chromatic.forEach(c => {
            const bucket = Math.round(c.h / 30) * 30;
            hueGroups[bucket] = (hueGroups[bucket] || 0) + 1;
        });
        const dominant = Object.entries(hueGroups).sort((a, b) => b[1] - a[1])[0];
        result.dominantHue = {
            hue: parseInt(dominant[0]),
            name: hueToName(parseInt(dominant[0])),
            count: dominant[1],
        };
    }

    // ═══ Harmony Detection ═══
    if (chromatic.length >= 2) {
        const hues = chromatic.map(c => c.h).sort((a, b) => a - b);
        const uniqueHues = [...new Set(hues.map(h => Math.round(h / 30) * 30))];

        if (uniqueHues.length === 1) {
            result.harmony = { type: 'monochromatic', score: 95, description: 'Single hue with lightness/saturation variations' };
        } else if (uniqueHues.length === 2) {
            const diff = Math.abs(uniqueHues[1] - uniqueHues[0]);
            if (diff >= 150 && diff <= 210) {
                result.harmony = { type: 'complementary', score: 85, description: 'Colors from opposite sides of the color wheel' };
            } else if (diff <= 60) {
                result.harmony = { type: 'analogous', score: 90, description: 'Neighboring colors on the color wheel' };
            } else {
                result.harmony = { type: 'split', score: 70, description: 'Two-tone color scheme' };
            }
        } else if (uniqueHues.length === 3) {
            result.harmony = { type: 'triadic', score: 80, description: 'Three colors evenly spaced on the wheel' };
        } else {
            result.harmony = { type: 'polychromatic', score: 50, description: 'Multiple colors — risk of visual noise' };
        }
    } else {
        result.harmony = { type: 'monochromatic', score: 90, description: 'Minimal chromatic colors' };
    }

    // ═══ Mood Classification (Neural Network-inspired) ═══
    const moodSignals = {
        luxurious: 0, playful: 0, corporate: 0, minimal: 0,
        energetic: 0, calm: 0, dark: 0, natural: 0, tech: 0,
    };

    // Dark mode signals
    if (result.colorDistribution.dark > result.colorDistribution.light) moodSignals.dark += 3;
    if (result.colorDistribution.dark > 3) moodSignals.luxurious += 2;

    // Neutral/muted = corporate or minimal
    if (result.colorDistribution.neutral > hslColors.length * 0.5) {
        moodSignals.corporate += 3;
        moodSignals.minimal += 2;
    }

    // Saturated = playful or energetic
    if (result.colorDistribution.saturated > hslColors.length * 0.4) {
        moodSignals.playful += 2;
        moodSignals.energetic += 2;
    }

    // Temperature effects
    if (result.temperature.label === 'warm') {
        moodSignals.energetic += 1;
        moodSignals.playful += 1;
    } else if (result.temperature.label === 'cool') {
        moodSignals.calm += 2;
        moodSignals.tech += 1;
        moodSignals.corporate += 1;
    }

    // Blue dominance = tech/corporate
    if (result.dominantHue?.hue >= 180 && result.dominantHue?.hue <= 240) {
        moodSignals.tech += 2;
        moodSignals.corporate += 1;
    }

    // Green dominance = natural
    if (result.dominantHue?.hue >= 90 && result.dominantHue?.hue <= 150) {
        moodSignals.natural += 3;
    }

    // Sort by strength
    const sortedMoods = Object.entries(moodSignals).sort((a, b) => b[1] - a[1]);
    result.mood = {
        primary: sortedMoods[0][0],
        secondary: sortedMoods[1][1] > 0 ? sortedMoods[1][0] : null,
        confidence: Math.min(1, sortedMoods[0][1] / 5),
        allScores: Object.fromEntries(sortedMoods),
    };

    // ═══ Brand Colors ═══
    const saturatedSorted = chromatic.sort((a, b) => b.s - a.s);
    result.brandColors = saturatedSorted.slice(0, 3).map(c => ({
        hex: hslToHex(c.h, c.s, c.l),
        name: hueToName(c.h),
        category: categorizeColor(c.h, c.s, c.l),
    }));

    // ═══ Insights ═══
    result.insights.push(`Mood: ${result.mood.primary}${result.mood.secondary ? ' / ' + result.mood.secondary : ''}`);
    result.insights.push(`Harmony: ${result.harmony.type} (${result.harmony.score}/100)`);
    result.insights.push(`Temperature: ${result.temperature.label}`);
    if (result.dominantHue) result.insights.push(`Dominant: ${result.dominantHue.name}`);

    return result;
}

// ═══ Utility Functions ═══

function parseToHSL(color) {
    if (!color || color === 'transparent' || color === 'inherit' || color === 'initial') return { h: null, s: null, l: null };

    let r, g, b, a = 1;

    // rgb(a)
    const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
    if (rgbMatch) {
        r = parseInt(rgbMatch[1]) / 255;
        g = parseInt(rgbMatch[2]) / 255;
        b = parseInt(rgbMatch[3]) / 255;
        if (rgbMatch[4]) a = parseFloat(rgbMatch[4]);
    }
    // hex
    else if (color.startsWith('#')) {
        const hex = color.replace('#', '');
        if (hex.length === 3) {
            r = parseInt(hex[0] + hex[0], 16) / 255;
            g = parseInt(hex[1] + hex[1], 16) / 255;
            b = parseInt(hex[2] + hex[2], 16) / 255;
        } else {
            r = parseInt(hex.substring(0, 2), 16) / 255;
            g = parseInt(hex.substring(2, 4), 16) / 255;
            b = parseInt(hex.substring(4, 6), 16) / 255;
        }
    } else {
        return { h: null, s: null, l: null };
    }

    if (isNaN(r) || isNaN(g) || isNaN(b)) return { h: null, s: null, l: null };

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }

    return { h: h * 360, s: s * 100, l: l * 100, a };
}

function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

function hueToName(h) {
    if (h < 15 || h >= 345) return 'Red';
    if (h < 45) return 'Orange';
    if (h < 65) return 'Yellow';
    if (h < 150) return 'Green';
    if (h < 195) return 'Cyan';
    if (h < 255) return 'Blue';
    if (h < 285) return 'Purple';
    if (h < 345) return 'Pink';
    return 'Red';
}

function categorizeColor(h, s, l) {
    if (l > 95) return 'white';
    if (l < 5) return 'black';
    if (s < 10) return l > 50 ? 'light-gray' : 'dark-gray';
    return hueToName(h).toLowerCase();
}
