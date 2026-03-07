/**
 * CloneEngine — Logger
 * Provides getLogger() for all pipeline stages
 */

import chalk from 'chalk';

let _instance = null;

export function getLogger() {
    if (_instance) return _instance;

    _instance = {
        phaseStart(name, detail = '') {
            console.log('');
            console.log(chalk.cyan.bold(`  ═══ ${name} ═══`));
            if (detail) console.log(chalk.gray(`  ${detail}`));
            console.log('');
            this._startTime = Date.now();
        },
        phaseEnd() {
            const elapsed = ((Date.now() - (this._startTime || Date.now())) / 1000).toFixed(1);
            console.log(chalk.green(`  ✓ Done in ${elapsed}s\n`));
        },
        progress(msg) { console.log(chalk.blue(`  ⟳ ${msg}`)); },
        info(msg) { console.log(chalk.gray(`  ℹ ${msg}`)); },
        warn(msg) { console.log(chalk.yellow(`  ⚠ ${msg}`)); },
        error(msg) { console.log(chalk.red(`  ✗ ${msg}`)); },
        success(msg) { console.log(chalk.green(`  ✓ ${msg}`)); },
        _startTime: 0,
    };

    return _instance;
}
