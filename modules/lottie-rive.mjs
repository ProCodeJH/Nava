/**
 * v5.0 Module: Lottie / Rive / Spine Animation Extractor
 *
 * Extracts:
 *  - Lottie JSON files intercepted from network requests
 *  - Lottie player element metadata (duration, layers, markers)
 *  - DotLottie player detection
 *  - Rive .riv file sources and state machines
 *  - Spine animation data
 *  - CSS-animated SVG sprites
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Must be called BEFORE page.goto() to set up network interception
 */
export async function setupLottieInterception(page) {
    // Store intercepted Lottie data
    await page.evaluateOnNewDocument(`
        window.__DNA_LOTTIE__ = {
            files: [],
            players: [],
        };
    `);

    // Intercept network requests for Lottie JSON and Rive files
    page.on('response', async (response) => {
        try {
            const url = response.url();
            const contentType = response.headers()['content-type'] || '';

            // Detect Lottie JSON
            if (url.endsWith('.json') || url.includes('lottie') || url.includes('bodymovin')) {
                if (contentType.includes('json') || contentType.includes('application/json')) {
                    const body = await response.text().catch(() => null);
                    if (body && body.includes('"v"') && (body.includes('"layers"') || body.includes('"assets"'))) {
                        try {
                            const lottieData = JSON.parse(body);
                            if (lottieData.v && lottieData.layers) {
                                await page.evaluate((data) => {
                                    window.__DNA_LOTTIE__.files.push(data);
                                }, {
                                    url,
                                    version: lottieData.v,
                                    name: lottieData.nm || null,
                                    width: lottieData.w,
                                    height: lottieData.h,
                                    framerate: lottieData.fr,
                                    inPoint: lottieData.ip,
                                    outPoint: lottieData.op,
                                    duration: lottieData.op && lottieData.fr ? ((lottieData.op - lottieData.ip) / lottieData.fr).toFixed(2) : null,
                                    layerCount: lottieData.layers?.length || 0,
                                    layerTypes: lottieData.layers?.map(l => l.ty) || [],
                                    assetCount: lottieData.assets?.length || 0,
                                    markers: lottieData.markers?.map(m => ({
                                        comment: m.cm,
                                        time: m.tm,
                                        duration: m.dr,
                                    })) || [],
                                    has3D: lottieData.ddd === 1,
                                    dataSize: body.length,
                                });
                            }
                        } catch (e) { /* not valid Lottie */ }
                    }
                }
            }

            // Detect Rive files
            if (url.endsWith('.riv') || url.includes('rive')) {
                await page.evaluate((riveUrl) => {
                    if (!window.__DNA_LOTTIE__.riveFiles) window.__DNA_LOTTIE__.riveFiles = [];
                    window.__DNA_LOTTIE__.riveFiles.push({ url: riveUrl });
                }, url);
            }
        } catch (e) { /* ignore */ }
    });
}

/**
 * Extract all Lottie/Rive data post-render
 */
export async function extractLottieRive(page, outputDir) {
    const result = {
        lottieFiles: [],
        lottiePlayers: [],
        dotLottiePlayers: [],
        rivePlayers: [],
        spineAnimations: [],
    };

    // 1. Get intercepted Lottie files
    const intercepted = await page.evaluate(() => window.__DNA_LOTTIE__ || { files: [], riveFiles: [] });
    result.lottieFiles = intercepted.files || [];

    // 2. Scan for Lottie player elements
    const playerData = await page.evaluate(() => {
        const players = [];

        // <lottie-player>
        document.querySelectorAll('lottie-player').forEach(el => {
            const rect = el.getBoundingClientRect();
            players.push({
                type: 'lottie-player',
                src: el.getAttribute('src') || null,
                autoplay: el.hasAttribute('autoplay'),
                loop: el.hasAttribute('loop'),
                mode: el.getAttribute('mode') || 'normal',
                speed: el.getAttribute('speed') || '1',
                background: el.getAttribute('background') || null,
                size: { width: Math.round(rect.width), height: Math.round(rect.height) },
                position: { x: Math.round(rect.x), y: Math.round(rect.y + window.scrollY) },
            });
        });

        // <dotlottie-player>
        document.querySelectorAll('dotlottie-player').forEach(el => {
            const rect = el.getBoundingClientRect();
            players.push({
                type: 'dotlottie-player',
                src: el.getAttribute('src') || null,
                autoplay: el.hasAttribute('autoplay'),
                loop: el.hasAttribute('loop'),
                speed: el.getAttribute('speed') || '1',
                size: { width: Math.round(rect.width), height: Math.round(rect.height) },
                position: { x: Math.round(rect.x), y: Math.round(rect.y + window.scrollY) },
            });
        });

        // Bodymovin containers
        document.querySelectorAll('[data-bm-renderer], [data-animation-path], .bodymovin').forEach(el => {
            const rect = el.getBoundingClientRect();
            players.push({
                type: 'bodymovin',
                renderer: el.getAttribute('data-bm-renderer') || 'svg',
                animationPath: el.getAttribute('data-animation-path') || null,
                size: { width: Math.round(rect.width), height: Math.round(rect.height) },
                position: { x: Math.round(rect.x), y: Math.round(rect.y + window.scrollY) },
            });
        });

        return players;
    });
    result.lottiePlayers = playerData;

    // 3. Rive canvas detection
    const riveData = await page.evaluate(() => {
        const rivePlayers = [];

        // Rive canvas elements (typically marked with data attributes)
        document.querySelectorAll('canvas[data-rive], canvas.rive-canvas, [data-rive-src]').forEach(el => {
            const rect = el.getBoundingClientRect();
            rivePlayers.push({
                src: el.getAttribute('data-rive-src') || el.getAttribute('data-rive') || null,
                size: { width: Math.round(rect.width), height: Math.round(rect.height) },
                position: { x: Math.round(rect.x), y: Math.round(rect.y + window.scrollY) },
            });
        });

        // Check for Rive runtime
        if (window.rive || document.querySelector('script[src*="rive"]')) {
            rivePlayers.push({
                runtimeDetected: true,
                version: window.rive?.VERSION || null,
            });
        }

        return rivePlayers;
    });
    result.rivePlayers = riveData;
    if (intercepted.riveFiles) {
        result.rivePlayers.push(...intercepted.riveFiles);
    }

    // 4. Spine.js detection
    const spineData = await page.evaluate(() => {
        const spine = [];
        if (window.spine) {
            spine.push({ detected: true, version: window.spine.version || '?' });
        }
        // Spine canvas through PIXI
        if (window.PIXI?.spine) {
            spine.push({ pixiSpine: true });
        }
        return spine;
    });
    result.spineAnimations = spineData;

    // 5. Save intercepted Lottie JSONs to disk
    if (outputDir && result.lottieFiles.length > 0) {
        const lottieDir = path.join(outputDir, 'lottie-data');
        await fs.mkdir(lottieDir, { recursive: true });
        for (let i = 0; i < result.lottieFiles.length; i++) {
            const file = result.lottieFiles[i];
            const filename = `lottie-${i}-${file.name || 'unnamed'}.json`;
            await fs.writeFile(path.join(lottieDir, filename), JSON.stringify(file, null, 2));
        }
    }

    return result;
}
