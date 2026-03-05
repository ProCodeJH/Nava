/**
 * Upgrade 4: Design Token Export
 * Generates Tailwind config, CSS variables file, and Figma-compatible tokens
 */

import fs from 'fs/promises';
import path from 'path';

export async function exportTokens(tokens, outputDir) {
    const tokensDir = path.join(outputDir, 'tokens');
    await fs.mkdir(tokensDir, { recursive: true });

    const results = {};

    // ── 1. CSS Variables file ──
    results.cssVars = await generateCSSVars(tokens, tokensDir);

    // ── 2. Tailwind config ──
    results.tailwind = await generateTailwindConfig(tokens, tokensDir);

    // ── 3. Figma tokens (Design Tokens Community Group format) ──
    results.figma = await generateFigmaTokens(tokens, tokensDir);

    return results;
}

async function generateCSSVars(tokens, dir) {
    const lines = [
        '/* ═══════════════════════════════════════════════════ */',
        '/* AUTO-GENERATED CSS VARIABLES — design-dna v4.0     */',
        '/* ═══════════════════════════════════════════════════ */',
        '',
        ':root {',
    ];

    // Original variables
    if (tokens.variables) {
        lines.push('  /* ── Original Variables ── */');
        Object.entries(tokens.variables).forEach(([name, value]) => {
            lines.push(`  ${name}: ${value};`);
        });
        lines.push('');
    }

    // Extracted colors
    if (tokens.colors?.backgrounds) {
        lines.push('  /* ── Background Colors ── */');
        let i = 0;
        Object.keys(tokens.colors.backgrounds).slice(0, 20).forEach(color => {
            const hex = rgbToHex(color);
            lines.push(`  --dna-bg-${i++}: ${hex || color};`);
        });
        lines.push('');
    }

    if (tokens.colors?.texts) {
        lines.push('  /* ── Text Colors ── */');
        let i = 0;
        Object.keys(tokens.colors.texts).slice(0, 10).forEach(color => {
            const hex = rgbToHex(color);
            lines.push(`  --dna-text-${i++}: ${hex || color};`);
        });
        lines.push('');
    }

    // Typography
    if (tokens.typography?.fonts?.length) {
        lines.push('  /* ── Fonts ── */');
        lines.push(`  --dna-font-primary: "${tokens.typography.fonts[0]}", sans-serif;`);
        if (tokens.typography.fonts[1]) {
            lines.push(`  --dna-font-secondary: "${tokens.typography.fonts[1]}", sans-serif;`);
        }
        if (tokens.typography.fonts[2]) {
            lines.push(`  --dna-font-accent: "${tokens.typography.fonts[2]}", serif;`);
        }
        lines.push('');
    }

    // Font sizes (top 10 by frequency)
    if (tokens.typography?.fontSizes) {
        lines.push('  /* ── Font Sizes ── */');
        const sizes = Object.keys(tokens.typography.fontSizes).slice(0, 10);
        const sizeNames = ['xs', 'sm', 'base', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'];
        sizes.sort((a, b) => parseInt(a) - parseInt(b)).forEach((size, i) => {
            lines.push(`  --dna-text-${sizeNames[i] || i}: ${size};`);
        });
        lines.push('');
    }

    // Spacing
    if (tokens.spacing?.gaps) {
        lines.push('  /* ── Spacing ── */');
        let i = 0;
        Object.keys(tokens.spacing.gaps).slice(0, 10).forEach(gap => {
            lines.push(`  --dna-gap-${i++}: ${gap};`);
        });
    }

    lines.push('}');

    const filePath = path.join(dir, 'variables.css');
    await fs.writeFile(filePath, lines.join('\n'));
    return filePath;
}

async function generateTailwindConfig(tokens, dir) {
    const config = {
        theme: {
            extend: {
                colors: {},
                fontFamily: {},
                fontSize: {},
            },
        },
    };

    // Colors
    if (tokens.colors?.backgrounds) {
        let i = 0;
        Object.keys(tokens.colors.backgrounds).slice(0, 15).forEach(color => {
            const hex = rgbToHex(color);
            if (hex) config.theme.extend.colors[`dna-${i++}`] = hex;
        });
    }

    // Fonts
    if (tokens.typography?.fonts?.length) {
        config.theme.extend.fontFamily.primary = [tokens.typography.fonts[0], 'sans-serif'];
        if (tokens.typography.fonts[1]) {
            config.theme.extend.fontFamily.secondary = [tokens.typography.fonts[1], 'sans-serif'];
        }
    }

    // Font sizes
    if (tokens.typography?.fontSizes) {
        Object.keys(tokens.typography.fontSizes).slice(0, 10).forEach(size => {
            config.theme.extend.fontSize[size] = size;
        });
    }

    const content = `/** @type {import('tailwindcss').Config} */
// AUTO-GENERATED — design-dna v4.0
export default ${JSON.stringify(config, null, 2)};
`;

    const filePath = path.join(dir, 'tailwind.config.js');
    await fs.writeFile(filePath, content);
    return filePath;
}

async function generateFigmaTokens(tokens, dir) {
    const figmaTokens = {
        color: {},
        typography: {},
        spacing: {},
    };

    // Colors in Figma DTCG format
    if (tokens.colors?.backgrounds) {
        let i = 0;
        Object.keys(tokens.colors.backgrounds).slice(0, 15).forEach(color => {
            const hex = rgbToHex(color);
            figmaTokens.color[`background-${i++}`] = {
                $value: hex || color,
                $type: 'color',
            };
        });
    }

    if (tokens.colors?.texts) {
        let i = 0;
        Object.keys(tokens.colors.texts).slice(0, 10).forEach(color => {
            const hex = rgbToHex(color);
            figmaTokens.color[`text-${i++}`] = {
                $value: hex || color,
                $type: 'color',
            };
        });
    }

    // Typography
    if (tokens.typography?.fonts?.length) {
        tokens.typography.fonts.slice(0, 5).forEach((font, i) => {
            figmaTokens.typography[`font-${i}`] = {
                $value: { fontFamily: font },
                $type: 'typography',
            };
        });
    }

    const filePath = path.join(dir, 'figma-tokens.json');
    await fs.writeFile(filePath, JSON.stringify(figmaTokens, null, 2));
    return filePath;
}

function rgbToHex(rgb) {
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return null;
    const [, r, g, b] = match.map(Number);
    return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}
