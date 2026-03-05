import puppeteer from 'puppeteer';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import fs from 'fs';

const OUT = 'C:/Users/louis/.gemini/antigravity/brain/c8c604e9-df36-47b2-9524-85e90f403b18';

async function capture(url, filename) {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 4000));
    await page.screenshot({ path: filename, type: 'png' });
    console.log(`Saved: ${filename}`);
    await browser.close();
}

// Step 1: Capture both
await capture('https://teamevople.kr', `${OUT}/cmp_original.png`);
await capture('http://localhost:4040', `${OUT}/cmp_freezedry.png`);

// Step 2: Compare from files
console.log('\nComparing...');
const imgA = PNG.sync.read(fs.readFileSync(`${OUT}/cmp_original.png`));
const imgB = PNG.sync.read(fs.readFileSync(`${OUT}/cmp_freezedry.png`));

console.log(`Original: ${imgA.width}x${imgA.height}`);
console.log(`FreezeDry: ${imgB.width}x${imgB.height}`);

const w = Math.min(imgA.width, imgB.width);
const h = Math.min(imgA.height, imgB.height);

function crop(img, tw, th) {
    if (img.width === tw && img.height === th) return img.data;
    const out = Buffer.alloc(tw * th * 4);
    for (let y = 0; y < th; y++) {
        img.data.copy(out, y * tw * 4, y * img.width * 4, y * img.width * 4 + tw * 4);
    }
    return out;
}

const diffImg = new PNG({ width: w, height: h });
const numDiff = pixelmatch(crop(imgA, w, h), crop(imgB, w, h), diffImg.data, w, h, { threshold: 0.1 });
const pct = ((numDiff / (w * h)) * 100).toFixed(2);

console.log(`\n=== RESULT ===`);
console.log(`Diff pixels: ${numDiff.toLocaleString()} / ${(w * h).toLocaleString()}`);
console.log(`Diff: ${pct}%`);
console.log(`Fidelity: ${(100 - parseFloat(pct)).toFixed(2)}%`);

fs.writeFileSync(`${OUT}/cmp_diff_fd.png`, PNG.sync.write(diffImg));
console.log('Diff image saved!');
