import fs from 'fs';
import { scoreDesignQuality } from './modules/ai-design-scorer.mjs';
import { classifyLayoutPatterns } from './modules/ai-layout-classifier.mjs';
import { analyzeTypography } from './modules/ai-typography-analyzer.mjs';

const d = JSON.parse(fs.readFileSync('./test-v6-ai/dna-report.json', 'utf8'));

console.log('--- Testing aiDesignScore ---');
try {
    const r = scoreDesignQuality(d);
    console.log('OK:', r.grade, r.overallScore);
} catch (e) {
    console.log('ERROR:', e.message);
    console.log(e.stack);
}

console.log('');
console.log('--- Testing aiLayoutPatterns ---');
try {
    const r = classifyLayoutPatterns(d);
    console.log('OK:', r.layoutArchetype, r.patterns?.length);
} catch (e) {
    console.log('ERROR:', e.message);
    console.log(e.stack);
}

console.log('');
console.log('--- Testing aiTypography ---');
try {
    const r = analyzeTypography(d);
    console.log('OK:', r.pairing?.type, r.typeScale?.name);
} catch (e) {
    console.log('ERROR:', e.message);
    console.log(e.stack);
}
