/**
 * v7.0 Lottie Animation Downloader
 * 
 * Captures and downloads actual Lottie JSON animation data:
 *  - Intercepts lottie.loadAnimation() calls to get JSON URLs
 *  - Downloads .json files locally
 *  - Captures inline Lottie data from script tags
 *  - Generates lottie-web player code for clone
 */

import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import http from 'http';

/**
 * Script to inject before page load to intercept Lottie
 */
export function getLottieCaptureScript() {
    return `
    (function() {
        window.__LOTTIE_CAPTURE__ = {
            animations: [],
            inlineData: [],
            riveFiles: [],
        };
        const LC = window.__LOTTIE_CAPTURE__;

        // Intercept lottie.loadAnimation
        const waitForLottie = setInterval(() => {
            if (window.lottie || window.bodymovin) {
                clearInterval(waitForLottie);
                const lib = window.lottie || window.bodymovin;
                
                const origLoad = lib.loadAnimation.bind(lib);
                lib.loadAnimation = function(params) {
                    const record = {
                        path: params.path || null,
                        animationData: null,
                        container: params.container ? (params.container.id || params.container.className || 'unknown') : null,
                        renderer: params.renderer || 'svg',
                        loop: params.loop !== undefined ? params.loop : true,
                        autoplay: params.autoplay !== undefined ? params.autoplay : true,
                        name: params.name || null,
                    };

                    // Capture inline animation data
                    if (params.animationData) {
                        try {
                            record.animationData = JSON.stringify(params.animationData);
                            record.hasInlineData = true;
                        } catch(e) {
                            record.hasInlineData = false;
                        }
                    }

                    LC.animations.push(record);
                    return origLoad(params);
                };
            }
        }, 100);
        setTimeout(() => clearInterval(waitForLottie), 15000);

        // Intercept Rive
        const waitForRive = setInterval(() => {
            if (window.rive || window.RiveCanvas) {
                clearInterval(waitForRive);
                LC.riveDetected = true;
            }
        }, 200);
        setTimeout(() => clearInterval(waitForRive), 15000);

        // Detect Lottie/dotLottie JSON in network
        if (window.PerformanceObserver) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.name.match(/\\.json$|\\.lottie$|lottie|bodymovin/i)) {
                        LC.animations.push({
                            path: entry.name,
                            detectedVia: 'network',
                            size: entry.transferSize || 0,
                        });
                    }
                }
            });
            try { observer.observe({ type: 'resource', buffered: true }); } catch(e) {}
        }
    })();
    `;
}

/**
 * Extract captured Lottie data and download JSON files
 */
export async function extractAndDownloadLotties(page, outputDir) {
    const assetsDir = path.join(outputDir, 'assets', 'lottie');

    const capturedData = await page.evaluate(() => {
        return window.__LOTTIE_CAPTURE__ || null;
    });

    if (!capturedData || capturedData.animations.length === 0) {
        return { animations: [], downloaded: 0, totalSize: 0 };
    }

    await fs.mkdir(assetsDir, { recursive: true });

    const results = [];
    let downloaded = 0;
    let totalSize = 0;

    for (const anim of capturedData.animations) {
        const record = {
            original: anim.path,
            container: anim.container,
            renderer: anim.renderer,
            loop: anim.loop,
            autoplay: anim.autoplay,
            name: anim.name,
            local: null,
        };

        // Download JSON from URL
        if (anim.path && !anim.hasInlineData) {
            try {
                const filename = `lottie-${downloaded}.json`;
                const localPath = path.join(assetsDir, filename);
                const data = await downloadJSON(anim.path);
                await fs.writeFile(localPath, data, 'utf8');
                record.local = `assets/lottie/${filename}`;
                record.size = data.length;
                totalSize += data.length;
                downloaded++;
            } catch (e) {
                record.error = e.message;
            }
        }

        // Save inline animation data
        if (anim.hasInlineData && anim.animationData) {
            try {
                const filename = `lottie-inline-${downloaded}.json`;
                const localPath = path.join(assetsDir, filename);
                await fs.writeFile(localPath, anim.animationData, 'utf8');
                record.local = `assets/lottie/${filename}`;
                record.size = anim.animationData.length;
                totalSize += anim.animationData.length;
                downloaded++;
            } catch (e) {
                record.error = e.message;
            }
        }

        results.push(record);
    }

    return {
        animations: results,
        downloaded,
        totalSize,
        riveDetected: capturedData.riveDetected || false,
    };
}

function downloadJSON(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const req = client.get(url, { timeout: 15000 }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                downloadJSON(res.headers.location).then(resolve).catch(reject);
                return;
            }
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
            res.on('error', reject);
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
}
