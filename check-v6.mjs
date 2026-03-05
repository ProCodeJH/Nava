import fs from 'fs';
const d = JSON.parse(fs.readFileSync('./test-v6-ai/dna-report.json', 'utf8'));
const r = [];

r.push('=== DESIGN-DNA v6.0 AI VERIFICATION ===');
r.push('TOTAL KEYS: ' + Object.keys(d).length);
r.push('FILE SIZE: ' + Math.round(fs.statSync('./test-v6-ai/dna-report.json').size / 1024) + 'KB');
r.push('');

// v5.0 modules
r.push('--- v5.0 MODULES ---');
r.push('runtimeHook: ' + (d.runtimeHook ? 'YES' : 'MISSING'));
r.push('svgAnimations: ' + (d.svgAnimations ? 'YES' : 'MISSING'));
r.push('cssAdvanced: ' + (d.cssAdvanced ? 'YES' : 'MISSING'));
r.push('webgl: ' + (d.webgl ? 'YES' : 'MISSING'));
r.push('lottieRive: ' + (d.lottieRive ? 'YES' : 'MISSING'));
r.push('authFlow: ' + (d.authFlow ? 'YES' : 'MISSING'));
r.push('apiIntelligence: ' + (d.apiIntelligence ? 'YES' : 'MISSING'));
r.push('interactions: ' + (d.interactions ? 'YES' : 'MISSING'));
r.push('canvasCapture: ' + (d.canvasCapture ? 'YES' : 'MISSING'));
r.push('spaRoutes: ' + (d.spaRoutes ? 'YES' : 'MISSING'));
r.push('webflow: ' + (d.webflow ? 'YES' : 'MISSING'));

r.push('');
r.push('--- v6.0 AI MODULES ---');
r.push('aiDesignScore: ' + (d.aiDesignScore ? 'YES grade=' + d.aiDesignScore.grade + ' score=' + d.aiDesignScore.overallScore : 'MISSING'));
r.push('aiColorPsychology: ' + (d.aiColorPsychology ? 'YES mood=' + d.aiColorPsychology.mood?.primary + ' harmony=' + d.aiColorPsychology.harmony?.type + ' temp=' + d.aiColorPsychology.temperature?.label : 'MISSING'));
r.push('aiLayoutPatterns: ' + (d.aiLayoutPatterns ? 'YES archetype=' + d.aiLayoutPatterns.layoutArchetype + ' patterns=' + d.aiLayoutPatterns.patterns?.length + ' flow=' + d.aiLayoutPatterns.readingPattern : 'MISSING'));
r.push('aiTypography: ' + (d.aiTypography ? 'YES pairing=' + d.aiTypography.pairing?.type + '(' + d.aiTypography.pairing?.quality + ') scale=' + d.aiTypography.typeScale?.name : 'MISSING'));
r.push('aiUXPrediction: ' + (d.aiUXPrediction ? 'YES ux=' + d.aiUXPrediction.overallUX + ' engagement=' + d.aiUXPrediction.engagementScore?.score + ' conversion=' + d.aiUXPrediction.conversionProbability?.score : 'MISSING'));
r.push('aiComponents: ' + (d.aiComponents ? 'YES count=' + d.aiComponents.detectedComponents?.length + ' dsMaturity=' + d.aiComponents.designSystemMaturity?.level : 'MISSING'));
r.push('aiVisualHierarchy: ' + (d.aiVisualHierarchy ? 'YES score=' + d.aiVisualHierarchy.hierarchyScore + ' flow=' + d.aiVisualHierarchy.visualFlow + ' focal=' + d.aiVisualHierarchy.focalPoints?.length : 'MISSING'));
r.push('aiTrends: ' + (d.aiTrends ? 'YES style=' + d.aiTrends.primaryStyle?.name + ' era=' + d.aiTrends.era?.year + ' industry=' + d.aiTrends.industryGuess?.primary : 'MISSING'));

r.push('');
r.push('--- AI INSIGHTS SUMMARY ---');
if (d.aiDesignScore?.insights) r.push('SCORE: ' + d.aiDesignScore.insights.join(' | '));
if (d.aiDesignScore?.bonuses) r.push('BONUSES: ' + d.aiDesignScore.bonuses.join(' | '));
if (d.aiDesignScore?.penalties) r.push('PENALTIES: ' + d.aiDesignScore.penalties.join(' | '));
if (d.aiTrends?.trendSignals) r.push('TRENDS: ' + d.aiTrends.trendSignals.join(' | '));
if (d.aiUXPrediction?.recommendations) r.push('UX RECS: ' + d.aiUXPrediction.recommendations.join(' | '));

fs.writeFileSync('./v6-ai-check.txt', r.join('\n'), 'utf8');
console.log('Done');
