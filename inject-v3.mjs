import fs from 'fs';
const FD = 'c:/Users/louis/.gemini/antigravity/scratch/design-dna/test-v12-live/freeze-dried/index.html';
let html = fs.readFileSync(FD, 'utf-8');
if (!html.includes('healing-patch-v3.css')) {
    html = html.replace('</head>', '<link rel="stylesheet" href="healing-patch-v3.css">\n</head>');
    fs.writeFileSync(FD, html, 'utf-8');
    console.log('v3 injected');
} else {
    console.log('v3 already present');
}
