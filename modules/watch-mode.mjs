/**
 * Upgrade 10: Watch Mode — Live diff monitoring during development
 */

import chalk from 'chalk';
import { analyzeDesignTokens } from './phase1-design-tokens.mjs';
import { analyzeLayout } from './phase2-layout-spatial.mjs';

export async function startWatchMode(browser, referenceUrl, targetUrl, options = {}) {
    const interval = options.interval || 5000; // Check every 5 seconds
    let previousHash = null;
    let iteration = 0;

    console.log(chalk.bold.cyan('\n  🔍 Watch Mode Active'));
    console.log(chalk.dim('  Reference:'), chalk.yellow(referenceUrl));
    console.log(chalk.dim('  Target:   '), chalk.yellow(targetUrl));
    console.log(chalk.dim('  Interval: '), chalk.yellow(`${interval / 1000}s`));
    console.log(chalk.dim('  Press Ctrl+C to stop\n'));

    // Load reference once
    const refPage = await browser.newPage();
    await refPage.setViewport({ width: 1920, height: 1080 });
    await refPage.goto(referenceUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));

    const refTokens = await analyzeDesignTokens(refPage);
    const refLayout = await analyzeLayout(refPage);
    const refHeight = await refPage.evaluate(() => document.documentElement.scrollHeight);

    console.log(chalk.green('  ✅ Reference loaded'));
    console.log(chalk.dim(`     Height: ${refHeight}px, Sections: ${refLayout.sections?.length || 0}`));
    console.log('');

    // Monitor target
    const targetPage = await browser.newPage();
    await targetPage.setViewport({ width: 1920, height: 1080 });

    const checkTarget = async () => {
        try {
            iteration++;
            await targetPage.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 15000 });
            await new Promise(r => setTimeout(r, 1000));

            const targetTokens = await analyzeDesignTokens(targetPage);
            const targetLayout = await analyzeLayout(targetPage);
            const targetHeight = await targetPage.evaluate(() => document.documentElement.scrollHeight);

            // Quick hash to detect changes
            const hash = JSON.stringify({
                h: targetHeight,
                s: targetLayout.sections?.length,
                f: targetTokens.typography?.fonts?.length,
                c: Object.keys(targetTokens.colors?.backgrounds || {}).length,
            });

            if (hash !== previousHash) {
                previousHash = hash;

                // Compare
                const heightDiff = Math.abs(targetHeight - refHeight);
                const sectionDiff = Math.abs((targetLayout.sections?.length || 0) - (refLayout.sections?.length || 0));

                const fontMatch = refTokens.typography?.fonts?.filter(f =>
                    targetTokens.typography?.fonts?.includes(f)
                ).length || 0;

                const colorMatch = Object.keys(refTokens.colors?.backgrounds || {}).filter(c =>
                    Object.keys(targetTokens.colors?.backgrounds || {}).includes(c)
                ).length;

                const totalRefColors = Object.keys(refTokens.colors?.backgrounds || {}).length;
                const colorPercent = totalRefColors > 0 ? Math.round((colorMatch / totalRefColors) * 100) : 100;

                const heightIcon = heightDiff < 50 ? '🟢' : heightDiff < 200 ? '🟡' : '🔴';
                const colorIcon = colorPercent >= 80 ? '🟢' : colorPercent >= 50 ? '🟡' : '🔴';

                const timestamp = new Date().toLocaleTimeString();

                console.log(chalk.dim(`  [${timestamp}]`) + chalk.bold(` Check #${iteration}`));
                console.log(`    ${heightIcon} Height: ${targetHeight}px (diff: ${heightDiff}px)`);
                console.log(`    ${sectionDiff === 0 ? '🟢' : '🟡'} Sections: ${targetLayout.sections?.length || 0} / ${refLayout.sections?.length || 0}`);
                console.log(`    ${colorIcon} Colors: ${colorPercent}% match`);
                console.log(`    📝 Fonts: ${fontMatch}/${refTokens.typography?.fonts?.length || 0} matching`);
                console.log('');
            } else {
                // Show dot for no-change iteration
                process.stdout.write(chalk.dim('.'));
            }
        } catch (e) {
            console.log(chalk.red(`  ❌ Check failed: ${e.message}`));
        }
    };

    // Initial check
    await checkTarget();

    // Start polling
    const timer = setInterval(checkTarget, interval);

    // Handle graceful shutdown
    const cleanup = async () => {
        clearInterval(timer);
        console.log(chalk.yellow('\n\n  Watch mode stopped.'));
        await refPage.close();
        await targetPage.close();
    };

    process.on('SIGINT', async () => {
        await cleanup();
        process.exit(0);
    });

    // Return cleanup function
    return cleanup;
}
