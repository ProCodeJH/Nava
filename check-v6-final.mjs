import fs from 'fs';
const d = JSON.parse(fs.readFileSync('./test-v6-final/dna-report.json', 'utf8'));
const r = [];

r.push('=== DESIGN-DNA v6.0 FINAL VERIFICATION ===');
r.push('KEYS: ' + Object.keys(d).length + ' | SIZE: ' + Math.round(fs.statSync('./test-v6-final/dna-report.json').size / 1024) + 'KB');
r.push('');

const checks = [
    ['runtimeHook', d.runtimeHook],
    ['svgAnimations', d.svgAnimations],
    ['cssAdvanced', d.cssAdvanced],
    ['webgl', d.webgl],
    ['lottieRive', d.lottieRive],
    ['authFlow', d.authFlow],
    ['apiIntelligence', d.apiIntelligence],
    ['interactions', d.interactions],
    ['canvasCapture', d.canvasCapture],
    ['spaRoutes', d.spaRoutes],
    ['webflow', d.webflow],
    ['aiDesignScore', d.aiDesignScore],
    ['aiColorPsychology', d.aiColorPsychology],
    ['aiLayoutPatterns', d.aiLayoutPatterns],
    ['aiTypography', d.aiTypography],
    ['aiUXPrediction', d.aiUXPrediction],
    ['aiComponents', d.aiComponents],
    ['aiVisualHierarchy', d.aiVisualHierarchy],
    ['aiTrends', d.aiTrends],
];

let pass = 0, fail = 0;
checks.forEach(([name, val]) => {
    const ok = !!val;
    r.push((ok ? 'OK' : 'MISSING') + ' ' + name);
    if (ok) pass++; else fail++;
});

r.push('');
r.push(pass + '/' + checks.length + ' PASS | ' + fail + ' FAIL');

if (d.aiDesignScore) {
    r.push('');
    r.push('=== teamevople.kr AI REPORT CARD ===');
    r.push('Design Grade: ' + d.aiDesignScore.grade + ' (' + d.aiDesignScore.overallScore + '/100)');
    r.push('Color Mood: ' + d.aiColorPsychology?.mood?.primary + ' | Harmony: ' + d.aiColorPsychology?.harmony?.type);
    r.push('Layout: ' + d.aiLayoutPatterns?.layoutArchetype + ' | Reading: ' + d.aiLayoutPatterns?.readingPattern);
    r.push('Typography: ' + d.aiTypography?.pairing?.type + ' (' + d.aiTypography?.pairing?.quality + '/100)');
    r.push('UX Score: ' + d.aiUXPrediction?.overallUX + '/100 | Engagement: ' + d.aiUXPrediction?.engagementScore?.score + '/100');
    r.push('Components: ' + d.aiComponents?.detectedComponents?.length + ' | DS Maturity: ' + d.aiComponents?.designSystemMaturity?.level);
    r.push('Visual Hierarchy: ' + d.aiVisualHierarchy?.hierarchyScore + '/100 | Flow: ' + d.aiVisualHierarchy?.visualFlow);
    r.push('Style: ' + d.aiTrends?.primaryStyle?.name + ' | Era: ~' + d.aiTrends?.era?.year + ' | Industry: ' + d.aiTrends?.industryGuess?.primary);
}

fs.writeFileSync('./v6-final-check.txt', r.join('\n'), 'utf8');
console.log('Done');
