/**
 * Phase 7: Screenshots — Viewport, full-page, section bands
 */

import path from 'path';

export async function captureScreenshots(page, outputDir) {
    const screenshotsDir = path.join(outputDir, 'screenshots');
    let captured = 0;

    // ── 1. Viewport screenshot ──
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({
        path: path.join(screenshotsDir, 'viewport-desktop.png'),
        type: 'png',
    });
    captured++;

    // ── 2. Full-page screenshot ──
    await page.screenshot({
        path: path.join(screenshotsDir, 'full-page.png'),
        type: 'png',
        fullPage: true,
    });
    captured++;

    // ── 3. Section band screenshots ──
    const sections = await page.evaluate(() => {
        const results = [];
        const sectionEls = document.querySelectorAll('section, header, footer, main > div, [class*="section"]');
        let count = 0;

        sectionEls.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.height < 100 || rect.width < 300) return;
            if (count >= 20) return; // Max 20 bands

            const name = el.id || el.getAttribute('data-framer-name') ||
                el.className?.toString()?.split(' ')[0]?.substring(0, 30) || el.tagName;

            results.push({
                name: name.replace(/[^a-zA-Z0-9_-]/g, '_'),
                y: Math.round(rect.y + window.scrollY),
                height: Math.round(rect.height),
                width: Math.round(rect.width),
            });
            count++;
        });

        return results;
    });

    for (let i = 0; i < sections.length; i++) {
        const s = sections[i];
        try {
            await page.screenshot({
                path: path.join(screenshotsDir, `band-${String(i).padStart(2, '0')}-${s.name}.png`),
                type: 'png',
                clip: {
                    x: 0,
                    y: s.y,
                    width: Math.min(s.width, 1920),
                    height: Math.min(s.height, 5000),
                },
            });
            captured++;
        } catch (e) {
            // Some clips may be out of viewport bounds
        }
    }

    // ── 4. Mobile viewport ──
    await page.setViewport({ width: 375, height: 812 });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({
        path: path.join(screenshotsDir, 'viewport-mobile.png'),
        type: 'png',
    });
    captured++;

    // Reset to desktop
    await page.setViewport({ width: 1920, height: 1080 });

    return {
        captured,
        bands: sections.map(s => s.name),
    };
}
