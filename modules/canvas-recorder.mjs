/**
 * v5.0 Module: Canvas Recorder — Frame-by-frame capture of canvas/WebGL animations
 *
 * Captures:
 *  - 2D Canvas animation frames via toDataURL
 *  - WebGL canvas frames
 *  - Canvas rendering stats (fps estimation)
 *  - Per-canvas isolated capture
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Capture frames from all canvas elements on the page
 */
export async function recordCanvasFrames(page, outputDir, options = {}) {
    const {
        fps = 10,         // Capture FPS
        duration = 3000,  // Capture duration in ms
        maxFrames = 60,   // Max frames per canvas
    } = options;

    const canvasDir = path.join(outputDir, 'canvas-captures');
    await fs.mkdir(canvasDir, { recursive: true });

    // Discover all visible canvas elements
    const canvasInfo = await page.evaluate(() => {
        const results = [];
        document.querySelectorAll('canvas').forEach((c, i) => {
            const rect = c.getBoundingClientRect();
            if (rect.width > 10 && rect.height > 10 && rect.bottom > 0) {
                results.push({
                    index: i,
                    id: c.id || null,
                    className: c.className?.toString()?.substring(0, 80) || null,
                    width: c.width,
                    height: c.height,
                    displayWidth: Math.round(rect.width),
                    displayHeight: Math.round(rect.height),
                    position: { x: Math.round(rect.x), y: Math.round(rect.y + window.scrollY) },
                    contextType: (() => {
                        // Try to determine context type without creating a new one
                        try {
                            if (c.getContext('webgl2')) return 'webgl2';
                            if (c.getContext('webgl')) return 'webgl';
                            return '2d';
                        } catch (e) { return 'unknown'; }
                    })(),
                });
            }
        });
        return results;
    });

    if (canvasInfo.length === 0) {
        return { canvases: [], totalFrames: 0, totalCanvases: 0, message: 'No visible canvas elements found' };
    }

    const results = [];
    const interval = Math.round(1000 / fps);
    const frameCount = Math.min(maxFrames, Math.round(duration / interval));

    for (const canvas of canvasInfo) {
        const canvasSubDir = path.join(canvasDir, `canvas-${canvas.index}`);
        await fs.mkdir(canvasSubDir, { recursive: true });

        const frames = [];

        for (let f = 0; f < frameCount; f++) {
            try {
                const dataUrl = await page.evaluate((idx) => {
                    const c = document.querySelectorAll('canvas')[idx];
                    if (!c) return null;

                    try {
                        // For WebGL canvases, need to capture during render
                        const gl = c.getContext('webgl2') || c.getContext('webgl');
                        if (gl) {
                            // WebGL preserveDrawingBuffer might be false
                            // Use readPixels as fallback
                            try {
                                return c.toDataURL('image/png');
                            } catch (e) {
                                // Create offscreen canvas and draw
                                const offscreen = document.createElement('canvas');
                                offscreen.width = c.width;
                                offscreen.height = c.height;
                                const ctx2d = offscreen.getContext('2d');
                                ctx2d.drawImage(c, 0, 0);
                                return offscreen.toDataURL('image/png');
                            }
                        }

                        // 2D canvas
                        return c.toDataURL('image/png');
                    } catch (e) {
                        return null; // Tainted canvas
                    }
                }, canvas.index);

                if (dataUrl && dataUrl.startsWith('data:image')) {
                    const base64 = dataUrl.split(',')[1];
                    const framePath = path.join(canvasSubDir, `frame-${String(f).padStart(4, '0')}.png`);
                    await fs.writeFile(framePath, Buffer.from(base64, 'base64'));
                    frames.push({
                        index: f,
                        path: path.basename(framePath),
                        timestamp: f * interval,
                    });
                }
            } catch (e) { /* skip frame */ }

            // Wait for next frame
            await new Promise(r => setTimeout(r, interval));
        }

        results.push({
            canvasIndex: canvas.index,
            id: canvas.id,
            contextType: canvas.contextType,
            size: { width: canvas.width, height: canvas.height },
            displaySize: { width: canvas.displayWidth, height: canvas.displayHeight },
            position: canvas.position,
            framesCapitured: frames.length,
            directory: canvasSubDir,
            frames,
        });
    }

    // Estimate FPS by checking if canvas content actually changes
    for (const canvasResult of results) {
        if (canvasResult.framesCapitured >= 2) {
            const uniqueFrames = await countUniqueFrames(canvasResult.directory, canvasResult.frames.length);
            canvasResult.isAnimated = uniqueFrames > 1;
            canvasResult.uniqueFrames = uniqueFrames;
            canvasResult.estimatedFPS = canvasResult.isAnimated
                ? Math.round(uniqueFrames / (duration / 1000))
                : 0;
        }
    }

    return {
        canvases: results,
        totalFrames: results.reduce((sum, r) => sum + r.framesCapitured, 0),
        totalCanvases: results.length,
    };
}

/**
 * Quick check how many frames are different (basic animation detection)
 */
async function countUniqueFrames(dir, totalFrames) {
    if (totalFrames < 2) return totalFrames;

    try {
        const firstFrame = await fs.readFile(path.join(dir, 'frame-0000.png'));
        let unique = 1;

        // Sample a few frames to check if they differ
        const checkIndices = [
            Math.floor(totalFrames * 0.25),
            Math.floor(totalFrames * 0.5),
            Math.floor(totalFrames * 0.75),
            totalFrames - 1,
        ];

        for (const idx of checkIndices) {
            try {
                const frame = await fs.readFile(path.join(dir, `frame-${String(idx).padStart(4, '0')}.png`));
                if (!firstFrame.equals(frame)) unique++;
            } catch (e) { }
        }

        return unique;
    } catch (e) {
        return 0;
    }
}
