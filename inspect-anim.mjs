import fs from 'fs';
const d = JSON.parse(fs.readFileSync('./test-v7-clone/dna-report.json', 'utf8'));

const r = [];
r.push('=== ANIMATION DNA DATA ===');

// Keyframes
r.push('\n--- KEYFRAMES ---');
const kf = d.animation?.keyframes || [];
r.push('Count: ' + kf.length);
kf.slice(0, 5).forEach(k => r.push(JSON.stringify(k).substring(0, 200)));

// Transitions
r.push('\n--- TRANSITIONS ---');
const tr = d.animation?.transitions || [];
r.push('Count: ' + tr.length);
tr.slice(0, 5).forEach(t => r.push(JSON.stringify(t).substring(0, 200)));

// Observers
r.push('\n--- INTERSECTION OBSERVERS ---');
const obs = d.runtimeHook?.intersectionObservers;
r.push('Count: ' + (obs?.length || obs || 'N/A'));

// Scroll Events
r.push('\n--- SCROLL EVENTS ---');
const scrollEvts = d.runtimeHook?.scrollEvents || d.runtimeHook?.scrollListeners;
r.push(JSON.stringify(scrollEvts)?.substring(0, 300) || 'N/A');

// Interaction DNA
r.push('\n--- INTERACTION DNA ---');
const intDna = d.interaction;
r.push('Hover effects: ' + (intDna?.hoverEffects?.length || 0));
r.push('Scroll triggers: ' + (intDna?.scrollTriggers?.length || 0));
r.push('Click events: ' + (intDna?.clickEvents?.length || 0));

// Runtime Hook full keys
r.push('\n--- RUNTIME HOOK KEYS ---');
r.push(JSON.stringify(Object.keys(d.runtimeHook || {})));

// Animation full keys
r.push('\n--- ANIMATION KEYS ---');
r.push(JSON.stringify(Object.keys(d.animation || {})));

// Interaction full keys
r.push('\n--- INTERACTION KEYS ---');
r.push(JSON.stringify(Object.keys(d.interaction || {})));

// Layout sections
r.push('\n--- LAYOUT SECTIONS ---');
const secs = d.layout?.sections || [];
r.push('Count: ' + secs.length);
secs.slice(0, 3).forEach(s => r.push(JSON.stringify(s).substring(0, 300)));

// CSS advanced - view transitions
r.push('\n--- CSS ADVANCED ---');
r.push('viewTransitions: ' + d.cssAdvanced?.viewTransitions);
r.push('supportsConditions: ' + (d.cssAdvanced?.supportsConditions?.length || 0));

// Tech stack - framer detection
r.push('\n--- TECH STACK ---');
r.push(JSON.stringify(Object.keys(d.techStack || {})));
r.push('frameworks: ' + JSON.stringify(d.techStack?.frameworks));

fs.writeFileSync('./dna-anim-data.txt', r.join('\n'), 'utf8');
console.log('Done');
