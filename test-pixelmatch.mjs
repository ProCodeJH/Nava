import puppeteer from 'puppeteer';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import fs from 'fs';

const OUT = 'C:/Users/louis/.gemini/antigravity/brain/c8c604e9-df36-47b2-9524-85e90f403b18';

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });

// Capture original
console.log('Capturing original...');
const p1 = await browser.newPage();
await p1.setViewport({ width: 1440, height: 900 });
await p1.goto('https://teamevople.kr', { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise(r => setTimeout(r, 4000));
const origBuf = await p1.screenshot({ type: 'png', fullPage: false });
fs.writeFileSync(OUT + '/pm_original.png', origBuf);
await p1.close();

// Capture clone
console.log('Capturing clone...');
const p2 = await browser.newPage();
await p2.setViewport({ width: 1440, height: 900 });
await p2.goto('http://localhost:3020', { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise(r => setTimeout(r, 4000));
const cloneBuf = await p2.screenshot({ type: 'png', fullPage: false });
fs.writeFileSync(OUT + '/pm_clone.png', cloneBuf);
await p2.close();
await browser.close();

// Pixelmatch comparison
console.log('Running pixelmatch...');
const imgA = PNG.sync.read(origBuf);
const imgB = PNG.sync.read(cloneBuf);

console.log(`Original: ${imgA.width}x${imgA.height}`);
console.log(`Clone: ${imgB.width}x${imgB.height}`);

const w = Math.min(imgA.width, imgB.width);
const h = Math.min(imgA.height, imgB.height);

// Crop if needed
function crop(img, tw, th) {
    if (img.width === tw && img.height === th) return img.data;
    const out = Buffer.alloc(tw * th * 4);
    for (let y = 0; y < th; y++) {
        img.data.copy(out, y * tw * 4, y * img.width * 4, y * img.width * 4 + tw * 4);
    }
    return out;
}

const dataA = crop(imgA, w, h);
const dataB = crop(imgB, w, h);
const diffImg = new PNG({ width: w, height: h });

const numDiff = pixelmatch(dataA, dataB, diffImg.data, w, h, { threshold: 0.1 });
const total = w * h;
const pct = ((numDiff / total) * 100).toFixed(2);

console.log(`\nResult: ${numDiff} different pixels / ${total} total = ${pct}% diff`);

fs.writeFileSync(OUT + '/pm_diff.png', PNG.sync.write(diffImg));
console.log('Diff image saved to pm_diff.png');
