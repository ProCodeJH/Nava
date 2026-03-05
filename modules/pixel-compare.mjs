/**
 * Upgrade 1: Pixelmatch Band Comparison
 * Pixel-accurate section-by-section comparison with % scores
 */

import fs from 'fs/promises';
import path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

/**
 * Compare two full-page screenshots band-by-band
 * @param {string} imgPathA - Path to reference screenshot
 * @param {string} imgPathB - Path to target screenshot
 * @param {Array} bands - Array of {name, y, height} band definitions
 * @param {string} outputDir - Where to save diff images
 */
export async function pixelCompare(imgPathA, imgPathB, bands, outputDir) {
    const diffDir = path.join(outputDir, 'pixel-diff');
    await fs.mkdir(diffDir, { recursive: true });

    const imgA = await readPNG(imgPathA);
    const imgB = await readPNG(imgPathB);

    const result = {
        overall: {},
        bands: [],
    };

    // ── Overall comparison ──
    const minWidth = Math.min(imgA.width, imgB.width);
    const minHeight = Math.min(imgA.height, imgB.height);

    if (minWidth > 0 && minHeight > 0) {
        const croppedA = cropPNG(imgA, 0, 0, minWidth, minHeight);
        const croppedB = cropPNG(imgB, 0, 0, minWidth, minHeight);
        const diffPNG = new PNG({ width: minWidth, height: minHeight });

        const badPixels = pixelmatch(
            croppedA.data, croppedB.data, diffPNG.data,
            minWidth, minHeight,
            { threshold: 0.1, alpha: 0.3, diffColor: [255, 0, 0] }
        );

        const totalPixels = minWidth * minHeight;
        const matchPercent = ((1 - badPixels / totalPixels) * 100).toFixed(2);

        result.overall = {
            widthA: imgA.width, heightA: imgA.height,
            widthB: imgB.width, heightB: imgB.height,
            comparedWidth: minWidth, comparedHeight: minHeight,
            badPixels,
            totalPixels,
            matchPercent: parseFloat(matchPercent),
        };

        // Save overall diff
        const diffPath = path.join(diffDir, 'overall-diff.png');
        await writePNG(diffPNG, diffPath);
        result.overall.diffImage = diffPath;
    }

    // ── Band-by-band comparison ──
    if (bands && bands.length > 0) {
        for (let i = 0; i < bands.length; i++) {
            const band = bands[i];
            const bandName = band.name || `band-${String(i).padStart(2, '0')}`;

            try {
                const bw = Math.min(imgA.width, imgB.width);
                const maxYA = Math.min(band.y + band.height, imgA.height);
                const maxYB = Math.min(band.y + band.height, imgB.height);
                const bh = Math.min(maxYA - band.y, maxYB - band.y);

                if (bw <= 0 || bh <= 0) {
                    result.bands.push({ name: bandName, skipped: true, reason: 'out of bounds' });
                    continue;
                }

                const bandA = cropPNG(imgA, 0, band.y, bw, bh);
                const bandB = cropPNG(imgB, 0, band.y, bw, bh);
                const bandDiff = new PNG({ width: bw, height: bh });

                const badPixels = pixelmatch(
                    bandA.data, bandB.data, bandDiff.data,
                    bw, bh,
                    { threshold: 0.1, alpha: 0.3, diffColor: [255, 56, 56] }
                );

                const totalPixels = bw * bh;
                const matchPercent = ((1 - badPixels / totalPixels) * 100).toFixed(2);

                const diffPath = path.join(diffDir, `band-${String(i).padStart(2, '0')}-${sanitize(bandName)}-diff.png`);
                await writePNG(bandDiff, diffPath);

                result.bands.push({
                    name: bandName,
                    y: band.y,
                    height: band.height,
                    badPixels,
                    totalPixels,
                    matchPercent: parseFloat(matchPercent),
                    diffImage: diffPath,
                    grade: gradeMatch(parseFloat(matchPercent)),
                });
            } catch (e) {
                result.bands.push({ name: bandName, error: e.message });
            }
        }

        // Calculate weighted average
        const validBands = result.bands.filter(b => b.matchPercent !== undefined);
        if (validBands.length > 0) {
            const totalPx = validBands.reduce((s, b) => s + b.totalPixels, 0);
            const weightedMatch = validBands.reduce((s, b) => s + (b.matchPercent * b.totalPixels / totalPx), 0);
            result.weightedAverage = parseFloat(weightedMatch.toFixed(2));
        }
    }

    // Save JSON report
    const reportPath = path.join(diffDir, 'pixel-comparison.json');
    await fs.writeFile(reportPath, JSON.stringify(result, null, 2));

    return result;
}

function gradeMatch(percent) {
    if (percent >= 99) return '🟢 Perfect';
    if (percent >= 95) return '🟡 Good';
    if (percent >= 85) return '🟠 Fair';
    return '🔴 Poor';
}

function sanitize(name) {
    return name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
}

async function readPNG(filePath) {
    const buffer = await fs.readFile(filePath);
    return new Promise((resolve, reject) => {
        const png = new PNG();
        png.parse(buffer, (err, data) => {
            if (err) reject(err);
            else resolve(data);
        });
    });
}

async function writePNG(png, filePath) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        png.pack()
            .on('data', chunk => chunks.push(chunk))
            .on('end', async () => {
                await fs.writeFile(filePath, Buffer.concat(chunks));
                resolve();
            })
            .on('error', reject);
    });
}

function cropPNG(src, x, y, w, h) {
    const dst = new PNG({ width: w, height: h });
    for (let row = 0; row < h; row++) {
        const srcOffset = ((y + row) * src.width + x) * 4;
        const dstOffset = (row * w) * 4;
        src.data.copy(dst.data, dstOffset, srcOffset, srcOffset + w * 4);
    }
    return dst;
}
