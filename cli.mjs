#!/usr/bin/env node
/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║   DESIGN-DNA v10.0 — Ultimate Clone Engine                  ║
 * ║                                                               ║
 * ║  Commands:                                                    ║
 * ║   analyze <url>   — Full design DNA extraction + clone        ║
 * ║   serve <dir>     — Live preview server + comparison          ║
 * ║   run <dir>       — Run full-stack clone (API+WS+Auth+Site)   ║
 * ║   compare <a> <b> — Side-by-side comparison of two sites      ║
 * ║   diff <ref> --target <local> — Reference vs local diff       ║
 * ║   watch <ref> --target <local> — Live diff monitoring         ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Core 9 Phases
import { analyzeDesignTokens } from './modules/phase1-design-tokens.mjs';
import { analyzeLayout } from './modules/phase2-layout-spatial.mjs';
import { analyzeAnimationDNA } from './modules/phase3-animation-dna.mjs';
import { analyzeResponsive } from './modules/phase4-responsive.mjs';
import { analyzeInteraction } from './modules/phase5-interaction.mjs';
import { analyzeTechStack } from './modules/phase6-tech-stack.mjs';
import { captureScreenshots } from './modules/phase7-screenshots.mjs';
import { analyzePerformance } from './modules/phase8-performance.mjs';
import { analyzeAccessibility } from './modules/phase9-accessibility.mjs';

// v4.5 Upgrade Modules
import { generateGSAPCode } from './modules/gsap-codegen.mjs';
import { captureScreencast } from './modules/screencast.mjs';
import { exportTokens } from './modules/token-export.mjs';
import { discoverPages } from './modules/multi-page.mjs';
import { runLighthouse } from './modules/lighthouse.mjs';
import { captureScrollTimeline } from './modules/scroll-timeline.mjs';
import { generateReactComponents } from './modules/react-codegen.mjs';
import { startWatchMode } from './modules/watch-mode.mjs';

// v5.0 New Modules
import { injectRuntimeHooks, extractRuntimeData } from './modules/runtime-hook.mjs';
import { getWebGLInjectionScript, inspectWebGL } from './modules/webgl-inspector.mjs';
import { setupLottieInterception, extractLottieRive } from './modules/lottie-rive.mjs';
import { recordCanvasFrames } from './modules/canvas-recorder.mjs';
import { extractWebflowIX2 } from './modules/webflow-ix2.mjs';
import { analyzeSVGAnimations } from './modules/svg-animation.mjs';
import { navigateSPA } from './modules/spa-navigator.mjs';
import { simulateInteractions } from './modules/interaction-sim.mjs';
import { analyzeCSSAdvanced } from './modules/css-advanced.mjs';
import { analyzeAPIs } from './modules/api-intelligence.mjs';
import { analyzeAuthFlow, injectAuth } from './modules/auth-flow.mjs';

// v6.0 AI/ML Intelligence Modules
import { scoreDesignQuality } from './modules/ai-design-scorer.mjs';
import { analyzeColorPsychology } from './modules/ai-color-psychology.mjs';
import { classifyLayoutPatterns } from './modules/ai-layout-classifier.mjs';
import { analyzeTypography } from './modules/ai-typography-analyzer.mjs';
import { predictUXQuality } from './modules/ai-ux-predictor.mjs';
import { detectComponents } from './modules/ai-component-detector.mjs';
import { analyzeVisualHierarchy } from './modules/ai-visual-hierarchy.mjs';
import { detectDesignTrends } from './modules/ai-trend-detector.mjs';

// v7.0 Auto-Clone Modules
import { downloadAssets } from './modules/asset-downloader.mjs';
import { captureAndGenerateCode } from './modules/codegen-clone.mjs';
import { reconstructAnimations } from './modules/animation-reconstructor.mjs';
import { getFramerCaptureScript, extractFramerDeepData } from './modules/framer-deep-capture.mjs';
import { getWebGLCaptureScript, extractWebGLDeepData } from './modules/webgl-scene-capture.mjs';
import { getLottieCaptureScript, extractAndDownloadLotties } from './modules/lottie-downloader.mjs';

// v8.0 Upgrade Modules
import { runParallelPipeline, progressBar, formatTime } from './modules/pipeline-engine.mjs';
import { generateResponsiveClone, buildResponsiveCSS } from './modules/responsive-clone.mjs';
import { extractCSSVariables, generateDesignTokensCSS, replaceHardcodedWithVars } from './modules/css-variable-extractor.mjs';
import { enhanceImagesInHTML } from './modules/image-optimizer.mjs';
import { cloneMultiplePages } from './modules/multi-page-clone.mjs';
import { scoreCloneFidelity, formatFidelityReport } from './modules/fidelity-scorer.mjs';
import { startPreviewServer } from './modules/preview-server.mjs';

// v9.0 Full-Stack Clone Modules
import { getInteractionCaptureScript, extractInteractionData, simulateAndCapture, generateInteractionCode } from './modules/spa-interaction-engine.mjs';
import { startAPICapture, saveAPIFixtures, generateMockServer } from './modules/api-mock-server.mjs';
import { getWebSocketCaptureScript, extractWebSocketData, saveWSFixtures, generateWSReplayCode } from './modules/websocket-replay.mjs';
import { getAuthCaptureScript, extractAuthData, generateAuthMockCode } from './modules/auth-mock.mjs';
import { reconstructWebGLScene, downloadModels } from './modules/webgl-reconstructor.mjs';
import { captureDynamicData, generateDynamicDataScript, saveDynamicFixtures } from './modules/dynamic-snapshot.mjs';
import { generateFullStackProject } from './modules/fullstack-codegen.mjs';

// v10.0 Ultimate Clone Modules
import { getFrameworkCaptureScript, extractFrameworkData, generateFrameworkCode } from './modules/framework-reconstructor.mjs';
import { inferCRUDPatterns, generateCRUDServer, saveCRUDServer } from './modules/crud-engine.mjs';
import { getRealtimeDetectionScript, extractRealtimeData, saveRealtimeMiddleware } from './modules/realtime-db.mjs';
import { createStealthBrowser, applyStealthPatches, bypassCloudflare, humanBehavior } from './modules/stealth-browser.mjs';
import { deepInteractionScan, generateDeepInteractionCode } from './modules/deep-interaction.mjs';

// v11.0 Framer Liberation Pipeline (from clone-engine)
import { extractFramerDynamics } from './modules/framer-extract.mjs';
import { analyzeAnimationPatterns } from './modules/animation-analyzer.mjs';
import { generateFramerMotionCode } from './modules/framer-generate.mjs';

// Report & Compare
import { generateReport } from './report/generator.mjs';
import { generateHTMLReport } from './report/html-dashboard.mjs';
import { runDiff } from './compare/diff-engine.mjs';

// v12.0 Core Extraction Modules
import { freezeDryAndSave } from './modules/freeze-dry.mjs';
import { extractAndSave as extractWebAnimationsAndSave } from './modules/web-animations-extractor.mjs';
import { runVisionLoop } from './modules/vision-loop.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VERSION = '12.0.0';

// ═══════════════════════════════════════════
// SHARED BROWSER SETUP
// ═══════════════════════════════════════════
async function createBrowser(options = {}) {
    if (options.stealth) {
        const { browser, stealth } = await createStealthBrowser({ headless: true });
        console.log(chalk.dim(`  Stealth: ${stealth}`));
        return browser;
    }
    const puppeteer = await import('puppeteer');
    return puppeteer.default.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--window-size=1920,1080',
            '--force-device-scale-factor=1',
        ],
    });
}

async function ensureDir(dir) {
    await fs.mkdir(dir, { recursive: true });
}

function banner() {
    console.log('');
    console.log(chalk.bold.cyan('='.repeat(60)));
    console.log(chalk.bold.white('     DESIGN-DNA v10.0 — Ultimate Clone Engine'));
    console.log(chalk.bold.cyan('='.repeat(60)));
    console.log('');
}

// ═══════════════════════════════════════════
// ANALYZE COMMAND
// ═══════════════════════════════════════════
async function runAnalyze(url, options) {
    const outputDir = path.resolve(options.output || `./dna-output-${new URL(url).hostname}`);
    await ensureDir(outputDir);
    await ensureDir(path.join(outputDir, 'screenshots'));

    banner();
    console.log(chalk.dim('  Target:'), chalk.yellow(url));
    console.log(chalk.dim('  Output:'), chalk.yellow(outputDir));

    const full = options.full;
    const ultra = options.ultra;
    const ai = options.ai || ultra;
    const clone = options.clone || ultra;
    const fullstack = options.fullstack || false;
    const ultimate = options.ultimate || false;
    const useStealth = options.stealth || ultimate;
    const allFlags = ultra || false;

    // Display active flags
    const activeFlags = [
        (options.responsive || full || ultra) ? chalk.green('Responsive') : null,
        (options.lighthouse || full || ultra) ? chalk.green('Lighthouse') : null,
        (options.scroll || full || ultra) ? chalk.green('Scroll') : null,
        (options.gsap || full || ultra) ? chalk.green('GSAP') : null,
        (options.tokens || full || ultra) ? chalk.green('Tokens') : null,
        (options.react || full || ultra) ? chalk.green('React') : null,
        (options.screencast || full || ultra) ? chalk.green('Screencast') : null,
        (options.crawl || full || ultra) ? chalk.green('Crawl') : null,
        (options.webgl || ultra) ? chalk.blue('WebGL') : null,
        (options.lottie || ultra) ? chalk.blue('Lottie') : null,
        (options.webflow || ultra) ? chalk.blue('Webflow') : null,
        (options.svg || ultra) ? chalk.blue('SVG') : null,
        (options.spa || ultra) ? chalk.blue('SPA') : null,
        (options.simulate || ultra) ? chalk.blue('Simulate') : null,
        (options.cssAdvanced || ultra) ? chalk.blue('CSS+') : null,
        (options.api || ultra) ? chalk.blue('API') : null,
        (options.auth || ultra) ? chalk.blue('Auth') : null,
        ai ? chalk.magenta('AI') : null,
        clone ? chalk.bold.green('CLONE') : null,
        fullstack ? chalk.bold.red('FULLSTACK') : null,
        (options.captureApi || fullstack) ? chalk.red('API-MOCK') : null,
        (options.interactions || fullstack) ? chalk.red('INTERACTIONS') : null,
        (options.captureWs || fullstack) ? chalk.red('WS-REPLAY') : null,
        (options.authMock || fullstack) ? chalk.red('AUTH-MOCK') : null,
        (options.deepScan || ultimate) ? chalk.bold.magenta('DEEP-SCAN') : null,
        (options.crud || ultimate) ? chalk.bold.magenta('CRUD') : null,
        (options.realtimeDb || ultimate) ? chalk.bold.magenta('REALTIME') : null,
        useStealth ? chalk.bold.magenta('STEALTH') : null,
        (options.framer || ultra) ? chalk.bold.hex('#FF6F00')('FRAMER') : null,
        ultimate ? chalk.bold.red('★ ULTIMATE') : null,
        ultra ? chalk.bold.red('ULTRA') : full ? chalk.bold.yellow('FULL') : null,
    ].filter(Boolean);

    console.log(chalk.dim('  Flags: '), activeFlags.join(' ') || chalk.gray('default'));
    console.log('');

    const spinner = ora({ text: 'Launching browser...', color: 'cyan' }).start();
    const browser = await createBrowser({ stealth: useStealth });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        // v10.0 — Stealth patches (when not using puppeteer-extra)
        if (useStealth) {
            await applyStealthPatches(page);
        }

        // ═══════ PRE-LOAD HOOKS (v5.0 — inject BEFORE goto) ═══════
        if (ultra || clone) {
            spinner.text = 'Injecting runtime hooks...';
            if (ultra) {
                await injectRuntimeHooks(page);
                await page.evaluateOnNewDocument(getWebGLInjectionScript());
                await setupLottieInterception(page);
            }
            // v7.0 Deep capture hooks (before page.goto)
            await page.evaluateOnNewDocument(getFramerCaptureScript());
            await page.evaluateOnNewDocument(getWebGLCaptureScript());
            await page.evaluateOnNewDocument(getLottieCaptureScript());
        }

        // ═══════ v9.0 PRE-LOAD HOOKS (Full-Stack Capture) ═══════
        let apiCapturedData = null;
        if (clone || fullstack || options.captureApi || options.interactions || options.captureWs || options.authMock) {
            // Inject SPA interaction capture
            if (options.interactions || fullstack) {
                await page.evaluateOnNewDocument(getInteractionCaptureScript());
            }
            // Inject WebSocket capture
            if (options.captureWs || fullstack) {
                await page.evaluateOnNewDocument(getWebSocketCaptureScript());
            }
            // Inject Auth capture
            if (options.authMock || fullstack) {
                await page.evaluateOnNewDocument(getAuthCaptureScript());
            }
            // Start API interception
            if (options.captureApi || fullstack) {
                apiCapturedData = await startAPICapture(page);
            }
        }

        // ═══════ v10.0 PRE-LOAD HOOKS (Framework + Realtime Detection) ═══════
        if (ultimate || options.deepScan || fullstack) {
            await page.evaluateOnNewDocument(getFrameworkCaptureScript());
            await page.evaluateOnNewDocument(getRealtimeDetectionScript());
        }

        // Auth injection (if provided)
        if (options.cookie || options.header) {
            const cookieList = options.cookie ? options.cookie.split(';').map(c => {
                const [name, ...rest] = c.trim().split('=');
                return { name, value: rest.join('=') };
            }) : [];
            const headers = options.header ? { [options.header.split(':')[0].trim()]: options.header.split(':').slice(1).join(':').trim() } : {};
            await injectAuth(page, { cookies: cookieList, headers });
        }

        spinner.text = `Loading ${url}...`;
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 3000));

        // v10.0 — Cloudflare bypass + human behavior
        if (useStealth) {
            const cfPassed = await bypassCloudflare(page, 15000);
            if (!cfPassed) spinner.warn('Cloudflare challenge may be present');
            await humanBehavior(page);
        }

        spinner.succeed(`Page loaded: ${url}`);

        const cdp = await page.createCDPSession();

        const results = {
            meta: {
                url,
                timestamp: new Date().toISOString(),
                engine: `design-dna v${VERSION}`,
                viewport: { width: 1920, height: 1080 },
                mode: ultra ? 'ultra' : full ? 'full' : 'default',
            },
        };

        // ═══════ CORE 9 PHASES (Parallel Pipeline v8.0) ═══════
        const pipelineStart = Date.now();

        const coreResult = await runParallelPipeline([
            {
                name: 'Phase 1-3',
                tasks: [
                    { name: 'tokens', label: 'Design Tokens', fn: () => analyzeDesignTokens(page) },
                    { name: 'layout', label: 'Layout & Spatial', fn: () => analyzeLayout(page) },
                    { name: 'animation', label: 'Animation DNA', fn: () => analyzeAnimationDNA(page, cdp) },
                ],
            },
            {
                name: 'Phase 4',
                tasks: [
                    {
                        name: 'responsive', label: 'Responsive',
                        condition: options.responsive || full || ultra,
                        fn: async () => {
                            const r = await analyzeResponsive(page, url);
                            await page.setViewport({ width: 1920, height: 1080 });
                            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
                            await new Promise(r => setTimeout(r, 2000));
                            return r;
                        },
                    },
                ],
            },
            {
                name: 'Phase 5-6',
                tasks: [
                    { name: 'interaction', label: 'Interaction', fn: () => analyzeInteraction(page) },
                    { name: 'techStack', label: 'Tech Stack', fn: () => analyzeTechStack(page) },
                ],
            },
            {
                name: 'Phase 7-9',
                tasks: [
                    { name: 'screenshots', label: 'Screenshots', fn: () => captureScreenshots(page, outputDir) },
                    { name: 'performance', label: 'Performance', fn: () => analyzePerformance(page, cdp, url) },
                    { name: 'accessibility', label: 'Accessibility', fn: () => analyzeAccessibility(page, cdp) },
                ],
            },
        ], { spinner, chalk });

        // Merge pipeline results
        Object.assign(results, coreResult.results);
        if (!results.responsive) results.responsive = { skipped: true };

        const pipelineTime = Date.now() - pipelineStart;
        spinner.info(chalk.cyan(`⚡ Pipeline: ${formatTime(pipelineTime)} (saved ~${formatTime(coreResult.stats.parallelSavings)})`))
            ;

        // ═══════ v4.5 UPGRADES ═══════
        console.log('');
        console.log(chalk.bold.magenta('  --- v4.5 Upgrades ---'));

        if (options.lighthouse || full || ultra) {
            spinner.start(chalk.magenta('[LH]') + ' Lighthouse');
            try {
                results.lighthouse = await runLighthouse(page, cdp, url, outputDir);
                const s = results.lighthouse.scores;
                spinner.succeed(chalk.magenta('[LH]') + ` P:${s.performance} SEO:${s.seo} A11y:${s.accessibility} BP:${s.bestPractices}`);
            } catch (e) { spinner.warn(chalk.yellow('Lighthouse: ' + e.message?.substring(0, 60))); }
        }

        if (options.gsap || full || ultra) {
            spinner.start(chalk.magenta('[GSAP]') + ' Code Gen');
            try {
                const gsapCode = generateGSAPCode(results.animation, results.layout);
                await fs.writeFile(path.join(outputDir, 'generated-animations.js'), gsapCode, 'utf-8');
                spinner.succeed(chalk.magenta('[GSAP]') + ' Saved');
            } catch (e) { spinner.warn(chalk.yellow('GSAP: ' + e.message?.substring(0, 60))); }
        }

        if (options.tokens || full || ultra) {
            spinner.start(chalk.magenta('[TOK]') + ' Token Export');
            try {
                await exportTokens(results.tokens, outputDir);
                spinner.succeed(chalk.magenta('[TOK]') + ' CSS/Tailwind/Figma exported');
            } catch (e) { spinner.warn(chalk.yellow('Tokens: ' + e.message?.substring(0, 60))); }
        }

        if (options.react || full || ultra) {
            spinner.start(chalk.magenta('[React]') + ' Components');
            try {
                const components = generateReactComponents(results.layout, results.tokens, results.interaction);
                const reactDir = path.join(outputDir, 'react-components');
                await ensureDir(reactDir);
                for (const [filename, code] of Object.entries(components)) {
                    await fs.writeFile(path.join(reactDir, filename), code, 'utf-8');
                }
                spinner.succeed(chalk.magenta('[React]') + ` ${Object.keys(components).length} components`);
            } catch (e) { spinner.warn(chalk.yellow('React: ' + e.message?.substring(0, 60))); }
        }

        if (options.crawl || full || ultra) {
            spinner.start(chalk.magenta('[Crawl]') + ' Multi-page');
            try {
                results.crawl = await discoverPages(page, url);
                spinner.succeed(chalk.magenta('[Crawl]') + ` ${results.crawl.total} pages`);
            } catch (e) { spinner.warn(chalk.yellow('Crawl: ' + e.message?.substring(0, 60))); }
        }

        // ═══════ v5.0 ULTRA MODULES ═══════
        if (ultra) {
            console.log('');
            console.log(chalk.bold.blue('  --- v5.0 Ultra Modules ---'));

            // Runtime Hook data extraction
            spinner.start(chalk.blue('[Hook]') + ' Runtime Data');
            try {
                results.runtimeHook = await extractRuntimeData(page);
                const rh = results.runtimeHook;
                spinner.succeed(chalk.blue('[Hook]') + ` GSAP:${rh.gsapCalls?.length || 0} Framer:${rh.framerMotionProps?.length || 0} IO:${rh.intersectionObservers?.length || 0}`);
            } catch (e) { spinner.warn(chalk.yellow('Hook: ' + e.message?.substring(0, 60))); }

            // SVG Animations
            if (options.svg !== false) {
                spinner.start(chalk.blue('[SVG]') + ' SVG Animations');
                try {
                    results.svgAnimations = await analyzeSVGAnimations(page);
                    spinner.succeed(chalk.blue('[SVG]') + ` ${results.svgAnimations.totalSVGCount} SVGs, ${results.svgAnimations.smilAnimations?.length || 0} SMIL`);
                } catch (e) { spinner.warn(chalk.yellow('SVG: ' + e.message?.substring(0, 60))); }
            }

            // CSS Advanced
            if (options.cssAdvanced !== false) {
                spinner.start(chalk.blue('[CSS+]') + ' CSS Advanced');
                try {
                    results.cssAdvanced = await analyzeCSSAdvanced(page);
                    const s = results.cssAdvanced.summary;
                    spinner.succeed(chalk.blue('[CSS+]') + ` Container:${s.containerQueries} Layers:${s.cascadeLayers} ScrollAnim:${s.scrollDrivenAnimations}`);
                } catch (e) { spinner.warn(chalk.yellow('CSS+: ' + e.message?.substring(0, 60))); }
            }

            // Webflow IX2
            if (options.webflow !== false) {
                spinner.start(chalk.blue('[WF]') + ' Webflow IX2');
                try {
                    results.webflow = await extractWebflowIX2(page);
                    spinner.succeed(chalk.blue('[WF]') + ` ${results.webflow.isWebflow ? 'Webflow detected' : 'Not Webflow'}, ${results.webflow.triggers?.length || 0} triggers`);
                } catch (e) { spinner.warn(chalk.yellow('Webflow: ' + e.message?.substring(0, 60))); }
            }

            // WebGL Inspector
            if (options.webgl !== false) {
                spinner.start(chalk.blue('[GL]') + ' WebGL/3D');
                try {
                    results.webgl = await inspectWebGL(page);
                    spinner.succeed(chalk.blue('[GL]') + ` ${results.webgl.canvases?.length || 0} canvas, ${results.webgl.shaders?.length || 0} shaders, Three:${results.webgl.threejs ? 'Y' : 'N'}`);
                } catch (e) { spinner.warn(chalk.yellow('WebGL: ' + e.message?.substring(0, 60))); }
            }

            // Lottie/Rive
            if (options.lottie !== false) {
                spinner.start(chalk.blue('[Lottie]') + ' Lottie/Rive');
                try {
                    results.lottieRive = await extractLottieRive(page, outputDir);
                    spinner.succeed(chalk.blue('[Lottie]') + ` ${results.lottieRive.lottieFiles?.length || 0} Lottie, ${results.lottieRive.rivePlayers?.length || 0} Rive`);
                } catch (e) { spinner.warn(chalk.yellow('Lottie: ' + e.message?.substring(0, 60))); }
            }

            // Auth Flow
            if (options.auth !== false) {
                spinner.start(chalk.blue('[Auth]') + ' Auth Flow');
                try {
                    results.authFlow = await analyzeAuthFlow(page);
                    spinner.succeed(chalk.blue('[Auth]') + ` ${results.authFlow.loginForms?.length || 0} forms, ${results.authFlow.oauthProviders?.length || 0} OAuth`);
                } catch (e) { spinner.warn(chalk.yellow('Auth: ' + e.message?.substring(0, 60))); }
            }

            // API Intelligence (needs fresh CDP, reloads page)
            if (options.api !== false) {
                spinner.start(chalk.blue('[API]') + ' Network Intelligence');
                try {
                    const cdp2 = await page.createCDPSession();
                    results.apiIntelligence = await analyzeAPIs(page, cdp2);
                    spinner.succeed(chalk.blue('[API]') + ` ${results.apiIntelligence.apiEndpoints?.length || 0} APIs, ${results.apiIntelligence.websockets?.length || 0} WS, ${results.apiIntelligence.cookies?.length || 0} cookies`);
                    await cdp2.detach().catch(() => { });
                } catch (e) { spinner.warn(chalk.yellow('API: ' + e.message?.substring(0, 60))); }
            }

            // Interaction Simulator
            if (options.simulate !== false) {
                spinner.start(chalk.blue('[Sim]') + ' Interaction Simulator');
                try {
                    results.interactions = await simulateInteractions(page, outputDir);
                    spinner.succeed(chalk.blue('[Sim]') + ` ${results.interactions.modals?.length || 0} modals, ${results.interactions.tabs?.length || 0} tabs, ${results.interactions.dropdowns?.length || 0} dropdowns`);
                } catch (e) { spinner.warn(chalk.yellow('Sim: ' + e.message?.substring(0, 60))); }
            }

            // Canvas Recording (non-destructive — captures current page)
            if (options.webgl !== false) {
                spinner.start(chalk.blue('[Canvas]') + ' Canvas Recording');
                try {
                    results.canvasCapture = await recordCanvasFrames(page, outputDir, { duration: 2000, fps: 5, maxFrames: 20 });
                    spinner.succeed(chalk.blue('[Canvas]') + ` ${results.canvasCapture.totalCanvases || 0} canvases, ${results.canvasCapture.totalFrames || 0} frames`);
                } catch (e) { spinner.warn(chalk.yellow('Canvas: ' + e.message?.substring(0, 60))); }
            }

            // SPA Route Navigation (navigates away but returns back)
            if (options.spa !== false) {
                spinner.start(chalk.blue('[SPA]') + ' Route Navigation');
                try {
                    results.spaRoutes = await navigateSPA(page, url, outputDir, { maxRoutes: 10 });
                    spinner.succeed(chalk.blue('[SPA]') + ` ${results.spaRoutes.routerType || 'none'}, ${results.spaRoutes.discoveredRoutes?.length || 0} routes`);
                } catch (e) { spinner.warn(chalk.yellow('SPA: ' + e.message?.substring(0, 60))); }
            }
        }

        // ═══════ v6.0 AI/ML INTELLIGENCE (runs on extracted data — no network) ═══════
        if (ai) {
            console.log('');
            console.log(chalk.bold.magenta('  ═══ AI/ML Intelligence Engine ═══'));

            spinner.start(chalk.magenta('[AI]') + ' Design Quality Scoring');
            try {
                results.aiDesignScore = scoreDesignQuality(results);
                spinner.succeed(chalk.magenta('[AI]') + ` Design Grade: ${results.aiDesignScore.grade} (${results.aiDesignScore.overallScore}/100)`);
            } catch (e) { spinner.warn(chalk.yellow('AI Score: ' + e.message?.substring(0, 60))); }

            spinner.start(chalk.magenta('[AI]') + ' Color Psychology');
            try {
                results.aiColorPsychology = analyzeColorPsychology(results);
                spinner.succeed(chalk.magenta('[AI]') + ` Mood: ${results.aiColorPsychology.mood?.primary}, Harmony: ${results.aiColorPsychology.harmony?.type}, Temp: ${results.aiColorPsychology.temperature?.label}`);
            } catch (e) { spinner.warn(chalk.yellow('AI Color: ' + e.message?.substring(0, 60))); }

            spinner.start(chalk.magenta('[AI]') + ' Layout Classification');
            try {
                results.aiLayoutPatterns = classifyLayoutPatterns(results);
                spinner.succeed(chalk.magenta('[AI]') + ` Archetype: ${results.aiLayoutPatterns.layoutArchetype}, ${results.aiLayoutPatterns.patterns?.length || 0} patterns, ${results.aiLayoutPatterns.readingPattern || 'scan'}`);
            } catch (e) { spinner.warn(chalk.yellow('AI Layout: ' + e.message?.substring(0, 60))); }

            spinner.start(chalk.magenta('[AI]') + ' Typography Intelligence');
            try {
                results.aiTypography = analyzeTypography(results);
                spinner.succeed(chalk.magenta('[AI]') + ` Pairing: ${results.aiTypography.pairing?.type} (${results.aiTypography.pairing?.quality}/100), Scale: ${results.aiTypography.typeScale?.name}`);
            } catch (e) { spinner.warn(chalk.yellow('AI Type: ' + e.message?.substring(0, 60))); }

            spinner.start(chalk.magenta('[AI]') + ' UX Quality Prediction');
            try {
                results.aiUXPrediction = predictUXQuality(results);
                spinner.succeed(chalk.magenta('[AI]') + ` UX: ${results.aiUXPrediction.overallUX}/100, Engagement: ${results.aiUXPrediction.engagementScore?.score}/100, Conversion: ${results.aiUXPrediction.conversionProbability?.score}/100`);
            } catch (e) { spinner.warn(chalk.yellow('AI UX: ' + e.message?.substring(0, 60))); }

            spinner.start(chalk.magenta('[AI]') + ' Component Detection');
            try {
                results.aiComponents = detectComponents(results);
                spinner.succeed(chalk.magenta('[AI]') + ` ${results.aiComponents.detectedComponents?.length || 0} components, Design System: ${results.aiComponents.designSystemMaturity?.level}`);
            } catch (e) { spinner.warn(chalk.yellow('AI Components: ' + e.message?.substring(0, 60))); }

            spinner.start(chalk.magenta('[AI]') + ' Visual Hierarchy');
            try {
                results.aiVisualHierarchy = analyzeVisualHierarchy(results);
                spinner.succeed(chalk.magenta('[AI]') + ` Hierarchy: ${results.aiVisualHierarchy.hierarchyScore}/100, Flow: ${results.aiVisualHierarchy.visualFlow}, Focal: ${results.aiVisualHierarchy.focalPoints?.length} points`);
            } catch (e) { spinner.warn(chalk.yellow('AI Hierarchy: ' + e.message?.substring(0, 60))); }

            spinner.start(chalk.magenta('[AI]') + ' Trend Detection');
            try {
                results.aiTrends = detectDesignTrends(results);
                spinner.succeed(chalk.magenta('[AI]') + ` Style: ${results.aiTrends.primaryStyle?.name}, Era: ~${results.aiTrends.era?.year}, Industry: ${results.aiTrends.industryGuess?.primary}`);
            } catch (e) { spinner.warn(chalk.yellow('AI Trends: ' + e.message?.substring(0, 60))); }
        }

        // ═══════ GENERATE REPORTS (includes all data up to this point) ═══════
        console.log('');
        spinner.start('Generating reports...');
        await generateReport(results, outputDir);
        try { await generateHTMLReport(results, outputDir); } catch (e) { /* non-fatal */ }
        spinner.succeed('All reports generated!');

        // ═══════ v7.0 AUTO-CLONE (asset download + code generation) ═══════
        if (clone) {
            console.log('');
            console.log(chalk.bold.green('  ═══ Auto-Clone Engine ═══'));

            spinner.start(chalk.green('[Clone]') + ' Downloading assets (images, fonts, SVGs)...');
            let assetMap = null;
            try {
                assetMap = await downloadAssets(page, url, outputDir);
                results.cloneAssets = assetMap;
                spinner.succeed(chalk.green('[Clone]') + ` ${assetMap.totalDownloaded} assets (${Math.round(assetMap.totalSize / 1024)}KB) — ${assetMap.images.length} imgs, ${assetMap.fonts.length} fonts, ${assetMap.svgs.length} SVGs`);
            } catch (e) {
                spinner.warn(chalk.yellow('Asset download: ' + e.message?.substring(0, 80)));
            }

            spinner.start(chalk.green('[Clone]') + ' Deep-capturing Framer/WebGL/Lottie data...');
            let deepCapture = { framer: null, webgl: null, lottie: null };
            try {
                const [framerData, webglData] = await Promise.all([
                    extractFramerDeepData(page),
                    extractWebGLDeepData(page),
                ]);
                deepCapture.framer = framerData;
                deepCapture.webgl = webglData;
                const deepStats = [
                    framerData?.stats?.variants > 0 ? `${framerData.stats.variants} variants` : null,
                    framerData?.stats?.intersectionObservers > 0 ? `${framerData.stats.intersectionObservers} IO` : null,
                    framerData?.stats?.gsapTweens > 0 ? `${framerData.stats.gsapTweens} GSAP tweens` : null,
                    framerData?.stats?.dragElements > 0 ? `${framerData.stats.dragElements} drag` : null,
                    framerData?.stats?.layoutAnimations > 0 ? `${framerData.stats.layoutAnimations} layout` : null,
                    framerData?.stats?.animationFrames > 0 ? `${framerData.stats.animationFrames} CSS anims` : null,
                    webglData?.stats?.canvases > 0 ? `${webglData.stats.canvases} WebGL` : null,
                    webglData?.stats?.shaders > 0 ? `${webglData.stats.shaders} shaders` : null,
                    webglData?.stats?.threeObjects > 0 ? `${webglData.stats.threeObjects} 3D objects` : null,
                ].filter(Boolean).join(', ');
                spinner.succeed(chalk.green('[Clone]') + ` Deep capture: ${deepStats || 'base mode'}`);
            } catch (e) {
                spinner.warn(chalk.yellow('Deep capture: ' + e.message?.substring(0, 80)));
            }

            // Download Lottie JSON animation files
            spinner.start(chalk.green('[Clone]') + ' Downloading Lottie animations...');
            try {
                const lottieResult = await extractAndDownloadLotties(page, outputDir);
                deepCapture.lottie = lottieResult;
                if (lottieResult.downloaded > 0) {
                    spinner.succeed(chalk.green('[Clone]') + ` Lottie: ${lottieResult.downloaded} animations (${Math.round(lottieResult.totalSize / 1024)}KB)`);
                } else {
                    spinner.info(chalk.gray('[Clone] No Lottie animations detected'));
                }
            } catch (e) {
                spinner.info(chalk.gray('[Clone] Lottie: ' + e.message?.substring(0, 60)));
            }

            spinner.start(chalk.green('[Clone]') + ' Reconstructing animations (precision mode)...');
            let animationData = null;
            try {
                animationData = reconstructAnimations(results, deepCapture);
                results.cloneAnimations = animationData.stats;
                results.deepCapture = {
                    framer: deepCapture.framer?.stats || null,
                    webgl: deepCapture.webgl?.stats || null,
                    lottie: { downloaded: deepCapture.lottie?.downloaded || 0 },
                };
                const features = [
                    animationData.stats.hasFramer ? 'Framer→GSAP' : null,
                    animationData.stats.preciseVariants > 0 ? `${animationData.stats.preciseVariants}var` : null,
                    animationData.stats.hasGSAP ? 'GSAP replay' : null,
                    animationData.stats.hasDrag ? 'Drag' : null,
                    animationData.stats.hasLayoutAnimations ? 'Layout FLIP' : null,
                    animationData.stats.hasWebGL ? 'Three.js' : null,
                    animationData.stats.hasLottie ? 'Lottie' : null,
                ].filter(Boolean).join(', ');
                spinner.succeed(chalk.green('[Clone]') + ` Animations: ${features || 'base'} — ${animationData.cdnLinks.length} CDNs, ${Math.round(animationData.script.length / 1024)}KB JS`);
            } catch (e) {
                spinner.warn(chalk.yellow('Animation reconstruction: ' + e.message?.substring(0, 80)));
            }

            // v8.0 — CSS Variable Extraction
            spinner.start(chalk.green('[Clone]') + ' Extracting CSS variables & design tokens...');
            let cssVariables = null;
            try {
                cssVariables = await extractCSSVariables(page);
                const varCount = Object.keys(cssVariables.rootVariables || {}).length;
                const suggested = cssVariables.suggestedNewVariables?.length || 0;
                spinner.succeed(chalk.green('[Clone]') + ` ${varCount} CSS vars preserved, ${suggested} auto-detected`);
            } catch (e) {
                spinner.info(chalk.gray('[Clone] CSS vars: ' + e.message?.substring(0, 60)));
            }

            // v8.0 — Responsive Clone
            let responsiveCSS = null;
            if (options.responsiveClone !== false) {
                spinner.start(chalk.green('[Clone]') + ' Capturing responsive viewports (375/768/1920)...');
                try {
                    const respData = await generateResponsiveClone(page, url);
                    responsiveCSS = buildResponsiveCSS(respData);
                    spinner.succeed(chalk.green('[Clone]') + ` Responsive: ${respData.stats.mobileRules} mobile + ${respData.stats.tabletRules} tablet @media rules`);
                    // Navigate back
                    await page.setViewport({ width: 1920, height: 1080 });
                    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
                    await new Promise(r => setTimeout(r, 2000));
                } catch (e) {
                    spinner.info(chalk.gray('[Clone] Responsive: ' + e.message?.substring(0, 60)));
                }
            }

            spinner.start(chalk.green('[Clone]') + ' Generating HTML + CSS + JS code...');
            try {
                const codeResult = await captureAndGenerateCode(page, url, outputDir, results, assetMap, animationData);
                results.cloneCode = codeResult;
                spinner.succeed(chalk.green('[Clone]') + ` ${codeResult.stats.sections} sections, ${codeResult.stats.stylesheetRules} CSS rules → clone/`);
            } catch (e) {
                spinner.warn(chalk.yellow('Code generation: ' + e.message?.substring(0, 80)));
            }

            // v8.0 — Post-generate enhancements
            const cloneDir = path.join(outputDir, 'clone');

            // Inject design tokens CSS
            if (cssVariables) {
                try {
                    const tokenCSS = generateDesignTokensCSS(cssVariables);
                    await fs.writeFile(path.join(cloneDir, 'design-tokens.css'), tokenCSS, 'utf-8');
                    // Replace hardcoded values in styles.css
                    const stylesPath = path.join(cloneDir, 'styles.css');
                    try {
                        let styles = await fs.readFile(stylesPath, 'utf-8');
                        styles = replaceHardcodedWithVars(styles, cssVariables);
                        if (responsiveCSS) styles += responsiveCSS;
                        await fs.writeFile(stylesPath, styles, 'utf-8');
                    } catch { }
                    // Add design-tokens.css link to HTML
                    const htmlPath = path.join(cloneDir, 'index.html');
                    try {
                        let html = await fs.readFile(htmlPath, 'utf-8');
                        html = html.replace('</head>', '    <link rel="stylesheet" href="design-tokens.css">\n</head>');
                        // Image optimization
                        const imgResult = enhanceImagesInHTML(html);
                        html = imgResult.html;
                        await fs.writeFile(htmlPath, html, 'utf-8');
                        spinner.succeed(chalk.green('[Clone]') + ` design-tokens.css + ${imgResult.stats.lazyLoaded} lazy images`);
                    } catch { }
                } catch (e) {
                    spinner.info(chalk.gray('[Clone] Post-enhance: ' + e.message?.substring(0, 60)));
                }
            }

            // v8.0 — Multi-page clone
            if (options.multiPage) {
                spinner.start(chalk.green('[Clone]') + ' Multi-page cloning...');
                try {
                    const mpResult = await cloneMultiplePages(page, url, outputDir, captureAndGenerateCode, { maxPages: 20, spinner, chalk });
                    results.multiPageClone = mpResult;
                    spinner.succeed(chalk.green('[Clone]') + ` Multi-page: ${mpResult.totalCloned}/${mpResult.totalDiscovered} pages cloned`);
                } catch (e) {
                    spinner.warn(chalk.yellow('Multi-page: ' + e.message?.substring(0, 60)));
                }
            }

            // v8.0 — Fidelity Scoring
            if (options.fidelity !== false) {
                spinner.start(chalk.green('[Clone]') + ' Scoring clone fidelity...');
                try {
                    const fidelity = await scoreCloneFidelity(page, url, cloneDir);
                    results.cloneFidelity = fidelity;
                    spinner.succeed(chalk.green('[Clone]') + ` Fidelity: ${fidelity.grade} (${fidelity.overall}/100) — DOM:${fidelity.domStructure} CSS:${fidelity.cssCoverage} Assets:${fidelity.assetCompleteness} Anim:${fidelity.animationCoverage}`);
                } catch (e) {
                    spinner.warn(chalk.yellow('Fidelity: ' + e.message?.substring(0, 60)));
                }
            }

        }

        // ═══════ v12.0 CORE EXTRACTION — Freeze-Dry / Web Animations / Vision Loop ═══════
        if (options.freezeDry || options.extractAnimations || options.visionLoop) {
            console.log('');
            console.log(chalk.bold.hex('#00BFFF')('  ═══ v12.0 Core Extraction ═══'));

            if (options.freezeDry) {
                spinner.start(chalk.hex('#00BFFF')('[❄ ]') + ' Freeze-Dry Snapshot...');
                try {
                    const fdResult = await freezeDryAndSave(page, null, outputDir);
                    results.freezeDry = fdResult.stats;
                    spinner.succeed(chalk.hex('#00BFFF')('[❄ ]') + ` Inlined ${fdResult.stats.inlined} elements, ${fdResult.stats.assets} assets → freeze-dried/`);
                } catch (e) {
                    spinner.warn(chalk.yellow('[❄ ] Freeze-Dry: ' + e.message?.substring(0, 80)));
                }
            }

            if (options.extractAnimations) {
                spinner.start(chalk.hex('#00BFFF')('[🎬]') + ' Web Animations Extractor...');
                try {
                    const animResult = await extractWebAnimationsAndSave(page, outputDir);
                    results.webAnimationsExtracted = {
                        webAnimations: animResult.webAnimations.length,
                        scrollAnimations: animResult.scrollAnimations.length,
                    };
                    spinner.succeed(chalk.hex('#00BFFF')('[🎬]') + ` ${animResult.webAnimations.length} Web Animations + ${animResult.scrollAnimations.length} scroll anims → animations-extracted/`);
                } catch (e) {
                    spinner.warn(chalk.yellow('[🎬] Animations: ' + e.message?.substring(0, 80)));
                }
            }

            if (options.visionLoop) {
                const cloneUrl = options.visionTarget || 'http://localhost:3020';
                spinner.start(chalk.hex('#00BFFF')('[👁]') + ' Vision Convergence Loop...');
                try {
                    const visionResult = await runVisionLoop(browser, url, cloneUrl, outputDir, {
                        maxIterations: parseInt(options.visionIterations) || 5,
                        convergenceThreshold: parseFloat(options.visionThreshold) || 5.0,
                    });
                    results.visionLoop = visionResult;
                    const lastIter = visionResult[visionResult.length - 1];
                    spinner.succeed(chalk.hex('#00BFFF')('[👁]') + ` ${visionResult.length} iterations, final avg diff: ${lastIter?.averageDiff?.toFixed(2)}%`);
                } catch (e) {
                    spinner.warn(chalk.yellow('[👁] Vision: ' + e.message?.substring(0, 80)));
                }
            }
        }

        // ═══════ v11.0 FRAMER LIBERATION PIPELINE ═══════
        // Auto-detect Framer sites from tech stack analysis, or use --framer flag
        const isFramerStrDetected = results.techStack?.framework === 'Framer' ||
            results.techStack?.platforms?.some(p => p.name === 'Framer') ||
            url.includes('.framer.') || url.includes('framerusercontent');

        const isFramerPageDetected = await page.evaluate(() => {
            return !!window.__framer_importMap ||
                !!document.querySelector('meta[name="generator"][content*="Framer"]') ||
                !!document.querySelector('[class*="framer-"]') ||
                !!document.querySelector('[data-framer-hydrate-v2]');
        });

        const isFramerSite = isFramerStrDetected || isFramerPageDetected;
        const runFramer = options.framer || (isFramerSite && (clone || ultra));

        if (runFramer) {
            console.log('');
            console.log(chalk.bold.hex('#FF6F00')('  ═══ Framer Liberation Pipeline ═══'));
            if (isFramerSite && !options.framer) {
                spinner.info(chalk.hex('#FF6F00')('[Framer]') + ' Auto-detected Framer site — activating liberation pipeline');
            }

            const framerOutputDir = path.join(outputDir, 'framer-liberation');
            await ensureDir(framerOutputDir);

            // Step 1: Extract all Framer dynamics
            spinner.start(chalk.hex('#FF6F00')('[Framer]') + ' Step 1/3: Extracting Framer dynamics (9 extractors)...');
            let framerDynamics = null;
            try {
                framerDynamics = await extractFramerDynamics(page, { scrollSteps: 10, maxHoverTargets: 30 });
                const stats = [
                    framerDynamics.cssVariables?.length ? `${framerDynamics.cssVariables.length} vars` : null,
                    framerDynamics.keyframeAnimations ? `${Object.keys(framerDynamics.keyframeAnimations).length} keyframes` : null,
                    framerDynamics.scrollAnimations?.length ? `${framerDynamics.scrollAnimations.length} scroll` : null,
                    framerDynamics.parallaxElements?.length ? `${framerDynamics.parallaxElements.length} parallax` : null,
                    framerDynamics.hoverInteractions?.length ? `${framerDynamics.hoverInteractions.length} hover` : null,
                    framerDynamics.activeAnimations?.length ? `${framerDynamics.activeAnimations.length} active` : null,
                    framerDynamics.transform3DElements?.length ? `${framerDynamics.transform3DElements.length} 3D` : null,
                    framerDynamics.framerConfig ? 'config' : null,
                    framerDynamics.pageTransitions?.animatePresenceElements?.length ? `${framerDynamics.pageTransitions.animatePresenceElements.length} transitions` : null,
                ].filter(Boolean).join(', ');
                spinner.succeed(chalk.hex('#FF6F00')('[Framer]') + ` Dynamics: ${stats || 'base'}`);

                // Save raw dynamics for debugging/manual tweaking
                await fs.writeFile(path.join(framerOutputDir, 'framer-dynamics.json'),
                    JSON.stringify(framerDynamics, null, 2), 'utf-8');
            } catch (e) {
                spinner.warn(chalk.yellow('[Framer] Extract: ' + e.message?.substring(0, 80)));
            }

            if (framerDynamics) {
                // Step 2: Classify animation patterns
                spinner.start(chalk.hex('#FF6F00')('[Framer]') + ' Step 2/3: Analyzing animation patterns (25 types)...');
                let animPatterns = null;
                try {
                    animPatterns = analyzeAnimationPatterns(framerDynamics);
                    results.framerPatterns = animPatterns.summary;
                    results.framerPatternsDetail = {
                        total: animPatterns.patterns.length,
                        highConfidence: animPatterns.patterns.filter(p => p.confidence >= 0.7).length,
                        types: animPatterns.summary,
                    };
                    spinner.succeed(chalk.hex('#FF6F00')('[Framer]') + ` Patterns: ${animPatterns.patterns.length} total (${results.framerPatternsDetail.highConfidence} high-confidence) — ${Object.entries(animPatterns.summary).map(([k, v]) => `${k}:${v}`).join(', ')}`);

                    // Save pattern analysis
                    await fs.writeFile(path.join(framerOutputDir, 'animation-patterns.json'),
                        JSON.stringify(animPatterns, null, 2), 'utf-8');
                } catch (e) {
                    spinner.warn(chalk.yellow('[Framer] Analyze: ' + e.message?.substring(0, 80)));
                }

                // Step 3: Generate pure React + Framer Motion code (zero Framer SDK dependency)
                spinner.start(chalk.hex('#FF6F00')('[Framer]') + ' Step 3/3: Generating React + Framer Motion code (zero Framer SDK)...');
                try {
                    const genResult = generateFramerMotionCode(framerDynamics, framerOutputDir, animPatterns);
                    results.framerCodegen = {
                        hooks: genResult?.hooks ? 'generated' : null,
                        motionCSS: genResult?.motionCSS ? 'generated' : null,
                        snippets: genResult?.componentSnippets?.length || 0,
                        outputDir: framerOutputDir,
                    };

                    // Generate package.json for the framer-liberation output
                    const pkgJson = {
                        name: 'framer-liberated',
                        version: '1.0.0',
                        description: `Liberated from ${url} — zero Framer SDK dependency`,
                        private: true,
                        dependencies: {
                            'react': '^18.2.0',
                            'react-dom': '^18.2.0',
                            'framer-motion': '^11.0.0',
                            'gsap': '^3.12.5',
                            '@gsap/react': '^2.1.1',
                        },
                        devDependencies: {
                            '@types/react': '^18.2.0',
                            'typescript': '^5.3.0',
                        },
                        _meta: {
                            generator: `design-dna v${VERSION}`,
                            source: url,
                            extractedAt: new Date().toISOString(),
                            patternsDetected: animPatterns?.patterns?.length || 0,
                            framerSdkDependency: false,
                        },
                    };
                    await fs.writeFile(path.join(framerOutputDir, 'package.json'),
                        JSON.stringify(pkgJson, null, 2), 'utf-8');

                    spinner.succeed(chalk.hex('#FF6F00')('[Framer]') + ` Code: hooks + CSS + ${genResult?.componentSnippets?.length || 0} snippets → framer-liberation/src/framer/`);
                    spinner.info(chalk.hex('#FF6F00')('[Framer]') + chalk.dim(' Dependencies: react, framer-motion (zero Framer SDK)'));
                } catch (e) {
                    spinner.warn(chalk.yellow('[Framer] Generate: ' + e.message?.substring(0, 80)));
                }

                // Also generate into clone/ if clone is active
                if (clone) {
                    try {
                        generateFramerMotionCode(framerDynamics, path.join(outputDir, 'clone'), animPatterns);
                        spinner.info(chalk.hex('#FF6F00')('[Framer]') + chalk.dim(' Also injected into clone/src/framer/'));
                    } catch { /* non-fatal */ }
                }
            }
        }

        // ═══════ v9.0 FULL-STACK CAPTURE PIPELINE ═══════
        if (fullstack || options.captureApi || options.interactions || options.captureWs || options.authMock) {

            // SPA Interaction capture
            if (options.interactions || fullstack) {
                spinner.start(chalk.red('[v9]') + ' Extracting SPA interactions...');
                try {
                    const interactions = await extractInteractionData(page);
                    const simulated = await simulateAndCapture(page);
                    interactions.simulated = simulated;
                    results.spaInteractions = interactions;
                    const interactionJS = generateInteractionCode(interactions);
                    if (interactionJS && clone) {
                        const cloneDir = path.join(outputDir, 'clone');
                        await fs.writeFile(path.join(cloneDir, 'interactions.js'), interactionJS, 'utf-8');
                        // Inject script tag
                        const htmlPath = path.join(cloneDir, 'index.html');
                        try {
                            let html = await fs.readFile(htmlPath, 'utf-8');
                            if (!html.includes('interactions.js')) {
                                html = html.replace('</body>', '    <script src="interactions.js" defer></script>\n</body>');
                                await fs.writeFile(htmlPath, html, 'utf-8');
                            }
                        } catch { }
                    }
                    spinner.succeed(chalk.red('[v9]') + ` SPA: ${interactions.stats.totalListeners} listeners, ${interactions.stats.patternsDetected} patterns, ${simulated.length} simulated`);
                } catch (e) {
                    spinner.warn(chalk.yellow('SPA: ' + e.message?.substring(0, 60)));
                }
            }

            // API Mock capture
            if ((options.captureApi || fullstack) && apiCapturedData) {
                spinner.start(chalk.red('[v9]') + ' Building API mock server...');
                try {
                    const apiManifest = await saveAPIFixtures(apiCapturedData, outputDir);
                    const mockResult = await generateMockServer(apiCapturedData, outputDir);
                    results.apiMock = { ...apiManifest, ...mockResult };
                    spinner.succeed(chalk.red('[v9]') + ` API Mock: ${apiManifest.totalEndpoints} endpoints, ${apiManifest.graphqlOperations} GraphQL ops`);
                } catch (e) {
                    spinner.warn(chalk.yellow('API Mock: ' + e.message?.substring(0, 60)));
                }
            }

            // WebSocket capture
            if (options.captureWs || fullstack) {
                spinner.start(chalk.red('[v9]') + ' Capturing WebSocket data...');
                try {
                    const wsData = await extractWebSocketData(page);
                    if (wsData.stats.messages > 0) {
                        await saveWSFixtures(wsData, outputDir);
                        results.webSocketReplay = wsData.stats;
                        spinner.succeed(chalk.red('[v9]') + ` WebSocket: ${wsData.stats.messages} messages (${wsData.stats.protocol})`);
                    } else {
                        spinner.info(chalk.gray('[v9] No WebSocket activity detected'));
                    }
                } catch (e) {
                    spinner.warn(chalk.yellow('WS: ' + e.message?.substring(0, 60)));
                }
            }

            // Auth capture
            if (options.authMock || fullstack) {
                spinner.start(chalk.red('[v9]') + ' Analyzing auth system...');
                try {
                    const authData = await extractAuthData(page);
                    results.authMock = authData;
                    if (authData.authType !== 'none') {
                        const authCode = generateAuthMockCode(authData);
                        if (authCode) {
                            await fs.mkdir(path.join(outputDir, 'mock-server'), { recursive: true });
                            await fs.writeFile(path.join(outputDir, 'mock-server', 'auth.mjs'), authCode, 'utf-8');
                        }
                        spinner.succeed(chalk.red('[v9]') + ` Auth: ${authData.authType}, ${authData.forms?.length || 0} forms, ${authData.stats.tokensFound} tokens`);
                    } else {
                        spinner.info(chalk.gray('[v9] No auth system detected'));
                    }
                } catch (e) {
                    spinner.warn(chalk.yellow('Auth: ' + e.message?.substring(0, 60)));
                }
            }

            // Dynamic data capture
            if (fullstack) {
                spinner.start(chalk.red('[v9]') + ' Capturing dynamic data...');
                try {
                    const dynData = await captureDynamicData(page, url, { snapshots: 3, intervalMs: 3000, spinner, chalk });
                    results.dynamicData = dynData.stats;
                    if (dynData.stats.regionsDetected > 0) {
                        await saveDynamicFixtures(dynData, outputDir);
                        const dynScript = generateDynamicDataScript(dynData);
                        if (dynScript && clone) {
                            const cloneDir = path.join(outputDir, 'clone');
                            await fs.writeFile(path.join(cloneDir, 'dynamic-data.js'), dynScript, 'utf-8');
                            const htmlPath = path.join(cloneDir, 'index.html');
                            try {
                                let html = await fs.readFile(htmlPath, 'utf-8');
                                if (!html.includes('dynamic-data.js')) {
                                    html = html.replace('</body>', '    <script src="dynamic-data.js" defer></script>\n</body>');
                                    await fs.writeFile(htmlPath, html, 'utf-8');
                                }
                            } catch { }
                        }
                        spinner.succeed(chalk.red('[v9]') + ` Dynamic: ${dynData.stats.regionsDetected} regions, ${dynData.stats.changesDetected} changes`);
                    } else {
                        spinner.info(chalk.gray('[v9] No dynamic regions detected'));
                    }
                } catch (e) {
                    spinner.warn(chalk.yellow('Dynamic: ' + e.message?.substring(0, 60)));
                }
            }

            // WebGL scene reconstruction
            if (fullstack && results.webgl?.scene) {
                spinner.start(chalk.red('[v9]') + ' Reconstructing WebGL scene...');
                try {
                    const sceneResult = reconstructWebGLScene(results.webgl);
                    if (sceneResult) {
                        const cloneDir = path.join(outputDir, 'clone');
                        await fs.writeFile(path.join(cloneDir, 'scene.mjs'), sceneResult.code, 'utf-8');
                        results.webglReconstruction = sceneResult.stats;
                        spinner.succeed(chalk.red('[v9]') + ` WebGL: ${sceneResult.stats.objects} objects, ${sceneResult.stats.lights} lights`);
                    }
                } catch (e) {
                    spinner.warn(chalk.yellow('WebGL: ' + e.message?.substring(0, 60)));
                }
            }

            // Full-Stack Project Generation
            if (fullstack && clone) {
                spinner.start(chalk.red('[v9]') + ' Generating full-stack project...');
                try {
                    const wsData = results.webSocketReplay ? await extractWebSocketData(page).catch(() => null) : null;
                    const fsResult = await generateFullStackProject(outputDir, {
                        apiData: apiCapturedData || { apiEndpoints: [] },
                        wsData: wsData || { stats: { messages: 0 } },
                        authData: results.authMock || { authType: 'none' },
                        interactionData: results.spaInteractions || null,
                        dynamicData: results.dynamicData || null,
                        webglData: results.webgl || null,
                    });
                    results.fullStackProject = fsResult;
                    spinner.succeed(chalk.red('[v9]') + ` Full-Stack: ${fsResult.files.length} files → ${fsResult.projectDir}`);
                    spinner.info(chalk.bold.cyan(`  → cd ${fsResult.projectDir} && npm install && npm start`));
                } catch (e) {
                    spinner.warn(chalk.yellow('FullStack: ' + e.message?.substring(0, 60)));
                }
            }
        }

        // ═══════ v10.0 ULTIMATE CAPTURE PIPELINE ═══════
        if (ultimate || options.deepScan || options.crud || options.realtimeDb) {

            // Framework Reconstruction
            if (ultimate || options.deepScan) {
                spinner.start(chalk.magenta('[v10]') + ' Capturing framework state...');
                try {
                    const fwData = await extractFrameworkData(page);
                    results.frameworkData = fwData;
                    if (fwData.framework && fwData.framework !== 'unknown') {
                        const fwCode = generateFrameworkCode(fwData);
                        if (fwCode && clone) {
                            const cloneDir = path.join(outputDir, 'clone');
                            await fs.writeFile(path.join(cloneDir, 'framework-state.js'), fwCode, 'utf-8');
                            const htmlPath = path.join(cloneDir, 'index.html');
                            try {
                                let html = await fs.readFile(htmlPath, 'utf-8');
                                if (!html.includes('framework-state.js')) {
                                    html = html.replace('</body>', '    <script src="framework-state.js" defer></script>\n</body>');
                                    await fs.writeFile(htmlPath, html, 'utf-8');
                                }
                            } catch { }
                        }
                        spinner.succeed(chalk.magenta('[v10]') + ` Framework: ${fwData.framework}, ${fwData.stats.componentsFound} components, ${fwData.stats.routesCaptured} routes`);
                    } else {
                        spinner.info(chalk.gray('[v10] No framework detected (static site)'));
                    }
                } catch (e) {
                    spinner.warn(chalk.yellow('Framework: ' + e.message?.substring(0, 60)));
                }
            }

            // Deep Interaction Scan
            if (ultimate || options.deepScan) {
                spinner.start(chalk.magenta('[v10]') + ' Deep interaction scan...');
                try {
                    const deepResult = await deepInteractionScan(page, { maxInteractions: 50 });
                    results.deepInteraction = {
                        totalElements: deepResult.totalElements,
                        interacted: deepResult.interacted,
                        statesDiscovered: deepResult.statesDiscovered,
                    };
                    const deepCode = generateDeepInteractionCode(deepResult);
                    if (deepCode && clone) {
                        const cloneDir = path.join(outputDir, 'clone');
                        await fs.writeFile(path.join(cloneDir, 'deep-interactions.js'), deepCode, 'utf-8');
                        const htmlPath = path.join(cloneDir, 'index.html');
                        try {
                            let html = await fs.readFile(htmlPath, 'utf-8');
                            if (!html.includes('deep-interactions.js')) {
                                html = html.replace('</body>', '    <script src="deep-interactions.js" defer></script>\n</body>');
                                await fs.writeFile(htmlPath, html, 'utf-8');
                            }
                        } catch { }
                    }
                    spinner.succeed(chalk.magenta('[v10]') + ` Deep: ${deepResult.totalElements} elements, ${deepResult.interacted} interacted, ${deepResult.statesDiscovered} states`);
                } catch (e) {
                    spinner.warn(chalk.yellow('Deep: ' + e.message?.substring(0, 60)));
                }
            }

            // CRUD Engine
            if ((ultimate || options.crud) && (apiCapturedData || results.apiMock)) {
                spinner.start(chalk.magenta('[v10]') + ' Building CRUD engine...');
                try {
                    const crudResult = await saveCRUDServer(outputDir, apiCapturedData || { apiEndpoints: [] });
                    if (crudResult) {
                        results.crudEngine = crudResult;
                        spinner.succeed(chalk.magenta('[v10]') + ` CRUD: ${crudResult.totalResources} resources, ${crudResult.totalFields} fields, ${crudResult.seededRows} rows seeded`);
                    } else {
                        spinner.info(chalk.gray('[v10] No CRUD patterns detected'));
                    }
                } catch (e) {
                    spinner.warn(chalk.yellow('CRUD: ' + e.message?.substring(0, 60)));
                }
            }

            // Realtime DB
            if (ultimate || options.realtimeDb) {
                spinner.start(chalk.magenta('[v10]') + ' Setting up realtime DB...');
                try {
                    const rtData = await extractRealtimeData(page);
                    results.realtimeDb = rtData.stats;
                    const wsData = results.webSocketReplay ? await extractWebSocketData(page).catch(() => null) : null;
                    const rtResult = await saveRealtimeMiddleware(outputDir, rtData, wsData);
                    spinner.succeed(chalk.magenta('[v10]') + ` Realtime: providers=${rtData.providers.join(',') || 'none'}, SSE+WS enabled`);
                } catch (e) {
                    spinner.warn(chalk.yellow('Realtime: ' + e.message?.substring(0, 60)));
                }
            }
        }

        // ═══════ POST-REPORT OPS (scroll/screencast — destructive) ═══════

        if (options.scroll || full || ultra) {
            spinner.start(chalk.magenta('[Scroll]') + ' Scroll Timeline');
            try {
                results.scrollTimeline = await captureScrollTimeline(page);
                spinner.succeed(chalk.magenta('[Scroll]') + ` ${results.scrollTimeline.checkpoints} checkpoints`);
            } catch (e) { spinner.warn(chalk.yellow('Scroll: ' + e.message?.substring(0, 60))); }
        }

        if (options.screencast || full || ultra) {
            spinner.start(chalk.magenta('[Cast]') + ' CDP Screencast');
            try {
                const cdp3 = await page.createCDPSession();
                results.screencast = await captureScreencast(page, cdp3, outputDir);
                spinner.succeed(chalk.magenta('[Cast]') + ` ${results.screencast.totalFrames} frames`);
            } catch (e) { spinner.warn(chalk.yellow('Cast: ' + e.message?.substring(0, 60))); }
        }

        // ═══════ FINAL SUMMARY ═══════
        const totalTime = Date.now() - pipelineStart;
        console.log('');
        console.log(chalk.bold.green('='.repeat(60)));
        console.log(chalk.bold.green(`  Design-DNA v10.0 Complete! (${formatTime(totalTime)})`));
        console.log(chalk.bold.green('='.repeat(60)));
        console.log('');
        console.log(chalk.dim('  JSON:       '), chalk.white(path.join(outputDir, 'dna-report.json')));
        console.log(chalk.dim('  Markdown:   '), chalk.white(path.join(outputDir, 'dna-report.md')));
        console.log(chalk.dim('  Dashboard:  '), chalk.white(path.join(outputDir, 'dashboard.html')));
        console.log(chalk.dim('  Screenshots:'), chalk.white(path.join(outputDir, 'screenshots/')));
        if (clone) {
            console.log(chalk.dim('  Clone:      '), chalk.bold.green(path.join(outputDir, 'clone/index.html')));
            console.log(chalk.dim('  Tokens:     '), chalk.white(path.join(outputDir, 'clone/design-tokens.css')));
            console.log(chalk.dim('  Assets:     '), chalk.white(path.join(outputDir, 'assets/')));
            if (results.cloneFidelity) {
                console.log('');
                console.log(chalk.bold.cyan(formatFidelityReport(results.cloneFidelity)));
            }
            console.log('');
            console.log(chalk.dim('  Preview:'), chalk.cyan(`design-dna serve ${outputDir}`));
        }
        if (fullstack && results.fullStackProject) {
            console.log('');
            console.log(chalk.bold.red('  ═══ Full-Stack Clone ═══'));
            console.log(chalk.dim('  Project:  '), chalk.bold.red(results.fullStackProject.projectDir));
            if (results.apiMock) console.log(chalk.dim('  API Mock: '), chalk.yellow(`${results.apiMock.totalEndpoints} endpoints`));
            if (results.webSocketReplay) console.log(chalk.dim('  WS Replay:'), chalk.yellow(`${results.webSocketReplay.messages} messages`));
            if (results.authMock?.authType !== 'none') console.log(chalk.dim('  Auth:     '), chalk.yellow(results.authMock.authType));
            console.log('');
            console.log(chalk.bold.cyan(`  → cd ${results.fullStackProject.projectDir}`));
            console.log(chalk.bold.cyan(`  → npm install`));
            console.log(chalk.bold.cyan(`  → npm start`));
        }
        if (ultimate || results.crudEngine || results.deepInteraction) {
            console.log('');
            console.log(chalk.bold.magenta('  ═══ Ultimate v10.0 ═══'));
            if (results.frameworkData?.framework) console.log(chalk.dim('  Framework:'), chalk.magenta(results.frameworkData.framework + ' → reconstructed'));
            if (results.deepInteraction) console.log(chalk.dim('  Deep Scan:'), chalk.magenta(`${results.deepInteraction.totalElements} elements, ${results.deepInteraction.statesDiscovered} states`));
            if (results.crudEngine) console.log(chalk.dim('  CRUD:     '), chalk.magenta(`${results.crudEngine.totalResources} resources → SQLite`));
            if (results.realtimeDb) console.log(chalk.dim('  Realtime: '), chalk.magenta('SSE + WebSocket enabled'));
        }
        if (results.framerCodegen) {
            console.log('');
            console.log(chalk.bold.hex('#FF6F00')('  ═══ Framer Liberation ═══'));
            console.log(chalk.dim('  Output:    '), chalk.hex('#FF6F00')(path.join(outputDir, 'framer-liberation/')));
            if (results.framerPatternsDetail) {
                console.log(chalk.dim('  Patterns:  '), chalk.hex('#FF6F00')(`${results.framerPatternsDetail.total} detected (${results.framerPatternsDetail.highConfidence} high-confidence)`));
            }
            console.log(chalk.dim('  Generated: '), chalk.hex('#FF6F00')(`hooks + CSS + ${results.framerCodegen.snippets} motion snippets`));
            console.log(chalk.dim('  Deps:      '), chalk.green('react, framer-motion (zero Framer SDK)'));
            if (isFramerSite) {
                console.log('');
                console.log(chalk.bold.hex('#FF6F00')('  🔓 Site liberated from Framer platform!'));
            }
        }
        console.log('');

    } catch (error) {
        spinner.fail(`Analysis failed: ${error.message}`);
        console.error(chalk.red(error.stack));
        process.exit(1);
    } finally {
        await browser.close();
    }
}

// ═══════════════════════════════════════════
// COMPARE / WATCH COMMANDS
// ═══════════════════════════════════════════
async function runCompare(url1, url2, options) {
    const outputDir = path.resolve(options.output || './dna-compare');
    await ensureDir(outputDir);
    banner();
    const browser = await createBrowser();
    try {
        const pageA = await browser.newPage();
        await pageA.setViewport({ width: 1920, height: 1080 });
        await pageA.goto(url1, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 3000));
        const pageB = await browser.newPage();
        await pageB.setViewport({ width: 1920, height: 1080 });
        await pageB.goto(url2, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 3000));
        await runDiff(pageA, pageB, outputDir);
        console.log(chalk.bold.green('\n  Comparison Complete!'));
    } finally {
        await browser.close();
    }
}

async function runWatch(referenceUrl, options) {
    if (!options.target) { console.error(chalk.red('  --target required')); process.exit(1); }
    banner();
    const browser = await createBrowser();
    await startWatchMode(browser, referenceUrl, options.target, { interval: parseInt(options.interval) || 5000 });
}

// ═══════════════════════════════════════════
// SERVE COMMAND
// ═══════════════════════════════════════════
async function runServe(dir, options) {
    banner();
    const outputDir = path.resolve(dir);
    console.log(chalk.dim('  Serving:'), chalk.yellow(outputDir));
    try {
        const info = await startPreviewServer(outputDir, {
            port: parseInt(options.port) || 3456,
            originalUrl: options.original || null,
        });
        console.log('');
        console.log(chalk.bold.green(`  ✅ Clone Preview: ${info.url}`));
        if (info.compareUrl) {
            console.log(chalk.bold.cyan(`  🔍 Compare Mode:  ${info.compareUrl}`));
        }
        console.log(chalk.dim('\n  Press Ctrl+C to stop'));
    } catch (e) {
        console.error(chalk.red(`  Failed: ${e.message}`));
        process.exit(1);
    }
}

// ═══════════════════════════════════════════
// CLI SETUP
// ═══════════════════════════════════════════
const program = new Command();

program
    .name('design-dna')
    .description('Design-DNA v10.0 — Ultimate Clone Engine')
    .version(VERSION);

program
    .command('analyze <url>')
    .description('Run design analysis on a URL')
    .option('-o, --output <dir>', 'Output directory')
    .option('-r, --responsive', 'Responsive multi-viewport analysis')
    .option('-l, --lighthouse', 'Lighthouse scoring')
    .option('-s, --scroll', 'Scroll timeline capture')
    .option('-g, --gsap', 'GSAP animation code gen')
    .option('-t, --tokens', 'Design tokens (CSS/Tailwind/Figma)')
    .option('--react', 'React component generation')
    .option('--screencast', 'CDP screencast frames')
    .option('--crawl', 'Multi-page discovery')
    .option('-f, --full', 'v4.5 — all upgrades')
    // v5.0 flags
    .option('-u, --ultra', 'v8.0 — TOTAL coverage (all modules + AI + Clone)')
    // v6.0 AI flags
    .option('--ai', 'AI/ML intelligence analysis (auto with --ultra)')
    // v7.0 Clone flags
    .option('--clone', 'Auto-clone: download assets + generate HTML/CSS (auto with --ultra)')
    .option('--webgl', 'WebGL/3D scene extraction')
    .option('--lottie', 'Lottie/Rive animation extraction')
    .option('--webflow', 'Webflow IX2 interactions')
    .option('--svg', 'SVG animation analysis')
    .option('--spa', 'SPA route navigation')
    .option('--simulate', 'Dynamic UI interaction simulator')
    .option('--css-advanced', 'CSS latest specs analysis')
    .option('--api', 'Network/API intelligence')
    .option('--auth', 'Auth flow analysis')
    // v8.0 flags
    .option('--responsive-clone', 'Generate responsive @media queries for clone')
    .option('--multi-page', 'Clone entire site (up to 20 pages)')
    .option('--no-fidelity', 'Skip fidelity scoring')
    .option('--cookie <cookies>', 'Inject cookies (name=value;name2=value2)')
    .option('--header <header>', 'Inject HTTP header (Name: Value)')
    // v9.0 flags
    .option('--fullstack', 'v9.0 — Full-stack clone (API+WS+Auth+Interactions)')
    .option('--capture-api', 'Capture & mock all API endpoints')
    .option('--interactions', 'Capture & reconstruct SPA interactions')
    .option('--capture-ws', 'Capture & replay WebSocket streams')
    .option('--auth-mock', 'Capture & mock authentication flows')
    // v10.0 flags
    .option('--ultimate', 'v10.0 — ULTIMATE mode (everything + CRUD + Realtime + Stealth + Deep)')
    .option('--stealth', 'Stealth browser (bypass Cloudflare/reCAPTCHA/bot detection)')
    .option('--deep-scan', 'Deep interaction scan (capture all UI states)')
    .option('--crud', 'CRUD engine (SQLite-powered API with real Create/Update/Delete)')
    .option('--realtime-db', 'Realtime DB simulator (SSE + WebSocket + Firebase/Supabase mock)')
    // v11.0 Framer Liberation
    .option('--framer', 'Framer Liberation: extract dynamics → analyze patterns → generate React+Motion code')
    // v12.0 Core Extraction
    .option('--freeze-dry', 'v12.0 — Freeze-Dry: getComputedStyle inline → strip all JS/CSS → static HTML')
    .option('--extract-animations', 'v12.0 — Extract Web Animations API + scroll-driven animation data → GSAP')
    .option('--vision-loop', 'v12.0 — Vision Convergence Loop: screenshot diff → AI patch → converge')
    .option('--vision-target <url>', 'Clone URL for vision loop comparison (default: http://localhost:3020)')
    .option('--vision-iterations <n>', 'Max vision loop iterations (default: 5)')
    .option('--vision-threshold <n>', 'Convergence threshold percent (default: 5.0)')
    .action(runAnalyze);

program
    .command('run <dir>')
    .description('Run a full-stack clone project (npm install + start)')
    .option('-p, --port <port>', 'Server port', '3000')
    .action(async (dir, options) => {
        banner();
        const projectDir = path.resolve(dir, 'fullstack-clone');
        console.log(chalk.dim('  Running:'), chalk.yellow(projectDir));
        const { execSync } = await import('child_process');
        try {
            console.log(chalk.cyan('\n  Installing dependencies...'));
            execSync('npm install', { cwd: projectDir, stdio: 'inherit' });
            console.log(chalk.bold.green('\n  Starting server...'));
            execSync(`npx cross-env PORT=${options.port} node server.mjs`, { cwd: projectDir, stdio: 'inherit' });
        } catch (e) {
            console.error(chalk.red(`  Failed: ${e.message}`));
            process.exit(1);
        }
    });

program
    .command('serve <dir>')
    .description('Start live preview server for a clone output')
    .option('-p, --port <port>', 'Server port', '3456')
    .option('--original <url>', 'Original URL for comparison mode')
    .action(runServe);

program
    .command('compare <url1> <url2>')
    .description('Compare two websites')
    .option('-o, --output <dir>', 'Output directory')
    .action(runCompare);

program
    .command('diff <referenceUrl>')
    .description('Diff reference vs local')
    .requiredOption('-t, --target <url>', 'Target URL')
    .option('-o, --output <dir>', 'Output directory')
    .action((ref, opts) => runCompare(ref, opts.target, opts));

program
    .command('watch <referenceUrl>')
    .description('Live diff monitoring')
    .requiredOption('-t, --target <url>', 'Target URL')
    .option('-i, --interval <ms>', 'Polling interval', '5000')
    .action(runWatch);

program
    .command('liberate <projectDir>')
    .description('Liberate Framer-dependent clone to pure React + GSAP + Motion')
    .action(async (projectDir) => {
        const { liberateProject } = await import('./modules/framer-liberation.mjs');
        const fullPath = path.resolve(process.cwd(), projectDir);
        await liberateProject(fullPath);
    });

program
    .command('heal <url> <projectDir>')
    .description('Self-healing: compare original vs clone, auto-fix, repeat until 95%+')
    .option('--max-iterations <n>', 'Max healing loops', '5')
    .option('--target <percent>', 'Target match percent', '95')
    .action(async (url, projectDir, opts) => {
        const { selfHealingClone } = await import('./modules/self-healing-loop.mjs');
        const fullPath = path.resolve(process.cwd(), projectDir);
        await selfHealingClone(url, fullPath, {
            maxIterations: parseInt(opts.maxIterations),
            targetScore: parseInt(opts.target),
        });
    });

program.parse();
