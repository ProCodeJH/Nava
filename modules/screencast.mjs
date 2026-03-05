/**
 * Upgrade 3: CDP Screencast — Frame-by-frame scroll video capture
 */

import fs from 'fs/promises';
import path from 'path';

export async function captureScreencast(page, cdp, outputDir) {
    const framesDir = path.join(outputDir, 'screencast-frames');
    await fs.mkdir(framesDir, { recursive: true });

    const frames = [];
    let frameIndex = 0;

    // Enable CDP Page.screencastFrame
    cdp.on('Page.screencastFrame', async (event) => {
        const { data, metadata, sessionId } = event;
        const framePath = path.join(framesDir, `frame-${String(frameIndex).padStart(4, '0')}.png`);

        try {
            await fs.writeFile(framePath, Buffer.from(data, 'base64'));
            frames.push({
                index: frameIndex,
                path: framePath,
                timestamp: metadata.timestamp,
                offsetTop: metadata.offsetTop,
                pageScaleFactor: metadata.pageScaleFactor,
                scrollY: metadata.scrollOffsetY ?? null,
            });
        } catch (e) { /* write error */ }

        frameIndex++;
        // Acknowledge the frame so CDP sends the next one
        try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch (e) { }
    });

    // Start screencast
    await cdp.send('Page.startScreencast', {
        format: 'png',
        quality: 80,
        maxWidth: 1920,
        maxHeight: 1080,
        everyNthFrame: 3, // Every 3rd frame to reduce volume
    });

    // Scroll through the page
    const totalHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const viewportHeight = 1080;
    const scrollStep = 100;
    const scrollDelay = 80;

    for (let y = 0; y <= totalHeight; y += scrollStep) {
        await page.evaluate((sy) => window.scrollTo({ top: sy, behavior: 'instant' }), y);
        await new Promise(r => setTimeout(r, scrollDelay));
    }

    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 500));

    // Stop screencast
    await cdp.send('Page.stopScreencast');

    // Generate frame manifest
    const manifest = {
        totalFrames: frames.length,
        totalHeight,
        framesDir,
        fps: Math.round(1000 / (scrollDelay * 3)), // approximate
        frames: frames.map(f => ({
            index: f.index,
            path: path.basename(f.path),
            timestamp: f.timestamp,
        })),
    };

    await fs.writeFile(path.join(outputDir, 'screencast-manifest.json'), JSON.stringify(manifest, null, 2));

    return {
        totalFrames: frames.length,
        framesDir,
        manifestPath: path.join(outputDir, 'screencast-manifest.json'),
    };
}
