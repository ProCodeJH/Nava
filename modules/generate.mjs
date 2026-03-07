/**
 * ═══════════════════════════════════════════════════════════════
 *  CLONE ENGINE — STAGE 3: GENERATE
 *  analysis.json → React components + CSS
 *
 *  Wraps react-generator.mjs with analysis-aware enhancements
 * ═══════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';
import { getLogger } from './logger.mjs';
import { generate as legacyGenerate } from './react-generator.mjs';

export async function generateProject(analysisPath, projectDir, options = {}) {
    const log = getLogger();
    log.phaseStart('STAGE 3: GENERATE', `-> ${projectDir}`);

    const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));
    const mode = options.mode || 'react';

    log.progress('Generating React components via core engine...');

    // Transform analysis.json into extract-result format for the generator
    const extractResult = {
        meta: analysis.meta,
        sections: analysis.sections.map(s => ({
            index: s.index,
            id: s.id,
            tag: s.tag,
            rect: s.rect,
            dom: s.dom,
        })),
        fonts: analysis.fonts,
        fontFaces: analysis.fonts,
        cssVariables: analysis.cssVariables,
        keyframes: analysis.keyframes,
        assets: analysis.assets,
        urlMap: analysis.urlMap,
        framerDynamics: analysis.globalAnimations || {},
        animationPatterns: analysis.globalAnimations || {},
    };

    const tempDir = path.join(projectDir, '.clone-temp');
    fs.mkdirSync(tempDir, { recursive: true });
    const tempPath = path.join(tempDir, 'extract-result.json');
    fs.writeFileSync(tempPath, JSON.stringify(extractResult, null, 2));

    await legacyGenerate(tempPath, projectDir, {
        mode,
        url: analysis.meta?.url || '',
    });

    log.progress('Applying section classifications...');
    const componentsDir = path.join(projectDir, 'src', 'components');

    if (fs.existsSync(componentsDir)) {
        const sectionMap = analysis.sections.map(s => ({
            index: s.index,
            originalFile: `Section${String(s.index).padStart(2, '0')}.tsx`,
            suggestedName: s.componentName,
            type: s.type,
            subType: s.subType,
            confidence: s.confidence,
            animations: s.animations?.map(a => a.type) || [],
            layout: s.layout,
        }));

        fs.writeFileSync(
            path.join(projectDir, 'section-map.json'),
            JSON.stringify(sectionMap, null, 2)
        );
        log.success('Section map written -> section-map.json');
    }

    try {
        fs.rmSync(tempDir, { recursive: true });
    } catch {}

    log.success(`Generation complete -> ${projectDir}`);
    log.phaseEnd();

    return { projectDir, sections: analysis.sections.length };
}
