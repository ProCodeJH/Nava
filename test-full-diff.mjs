import puppeteer from 'puppeteer';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import fs from 'fs';

const OUT = 'C:/Users/louis/.gemini/antigravity/brain/c8c604e9-df36-47b2-9524-85e90f403b18';
const POSITIONS = 5;
const VIEWPORT = { width: 1440, height: 900 };

async function capturePositions(page, url) {
    await page.setViewport(VIEWPORT);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 4000));

    const totalH = await page.evaluate(() => document.body.scrollHeight);
    const step = Math.floor(totalH / POSITIONS);
    const shots = [];

    for (let i = 0; i < POSITIONS; i++) {
        const y = i * step;
        await page.evaluate(scrollY => window.scrollTo(0, scrollY), y);
        await new Promise(r => setTimeout(r, 1000));
        const buf = await page.screenshot({ type: 'png', fullPage: false });
        shots.push({ scrollY: y, buf });
    }
    return shots;
}

function crop(img, tw, th) {
    if (img.width === tw && img.height === th) return img.data;
    const out = Buffer.alloc(tw * th * 4);
    for (let y = 0; y < th; y++) {
        img.data.copy(out, y * tw * 4, y * img.width * 4, y * img.width * 4 + tw * 4);
    }
    return out;
}

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });

console.log('Capturing original (teamevople.kr)...');
const p1 = await browser.newPage();
const origShots = await capturePositions(p1, 'https://teamevople.kr');
await p1.close();

console.log('Capturing clone (localhost:3020)...');
const p2 = await browser.newPage();
const cloneShots = await capturePositions(p2, 'http://localhost:3020');
await p2.close();
await browser.close();

console.log('\n=== PIXELMATCH RESULTS ===\n');

let totalDiff = 0;
let totalPixels = 0;

for (let i = 0; i < POSITIONS; i++) {
    const origPng = PNG.sync.read(origShots[i].buf);
    const clonePng = PNG.sync.read(cloneShots[i].buf);

    const w = Math.min(origPng.width, clonePng.width);
    const h = Math.min(origPng.height, clonePng.height);

    const diffImg = new PNG({ width: w, height: h });
    const numDiff = pixelmatch(
        crop(origPng, w, h), crop(clonePng, w, h),
        diffImg.data, w, h, { threshold: 0.1 }
    );

    const pct = ((numDiff / (w * h)) * 100).toFixed(2);
    const status = numDiff / (w * h) < 0.02 ? '✅' : numDiff / (w * h) < 0.1 ? '⚠️' : '❌';

    console.log(`Position ${i} (scrollY=${origShots[i].scrollY}): ${pct}% diff ${status}`);

    // Save screenshots and diff
    fs.writeFileSync(`${OUT}/full_orig_${i}.png`, origShots[i].buf);
    fs.writeFileSync(`${OUT}/full_clone_${i}.png`, cloneShots[i].buf);
    fs.writeFileSync(`${OUT}/full_diff_${i}.png`, PNG.sync.write(diffImg));

    totalDiff += numDiff;
    totalPixels += w * h;
}

const avgPct = ((totalDiff / totalPixels) * 100).toFixed(2);
console.log(`\n=== OVERALL: ${avgPct}% average pixel diff ===`);
console.log(`Total: ${totalDiff.toLocaleString()} diff / ${totalPixels.toLocaleString()} pixels`);
console.log(`Clone fidelity: ${(100 - parseFloat(avgPct)).toFixed(2)}%`);
