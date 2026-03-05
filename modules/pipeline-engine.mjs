/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Pipeline Engine v8.0 — Parallel Phase Execution             ║
 * ║  Runs independent analysis phases concurrently for 3x speed  ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

/**
 * Execute tasks in parallel groups with progress tracking.
 * Each group runs concurrently; groups run sequentially.
 * 
 * @param {Array<{name, fn, condition?}>} tasks
 * @param {object} opts  { spinner, chalk, onProgress }
 * @returns {object} results keyed by task name
 */
export async function runParallelPipeline(taskGroups, opts = {}) {
    const { spinner, chalk, onProgress } = opts;
    const results = {};
    const timings = {};
    const totalTasks = taskGroups.reduce((sum, g) => sum + g.tasks.filter(t => t.condition !== false).length, 0);
    let completed = 0;
    const pipelineStart = Date.now();

    for (const group of taskGroups) {
        const activeTasks = group.tasks.filter(t => t.condition !== false);
        if (activeTasks.length === 0) continue;

        if (spinner && chalk) {
            const names = activeTasks.map(t => t.label || t.name).join(' + ');
            spinner.start(chalk.cyan(`[${group.name}]`) + ` ${names} (${activeTasks.length} parallel)`);
        }

        const groupStart = Date.now();

        const settled = await Promise.allSettled(
            activeTasks.map(async (task) => {
                const taskStart = Date.now();
                try {
                    const result = await task.fn();
                    timings[task.name] = Date.now() - taskStart;
                    return { name: task.name, result, ok: true };
                } catch (err) {
                    timings[task.name] = Date.now() - taskStart;
                    return { name: task.name, error: err.message?.substring(0, 100), ok: false };
                }
            })
        );

        for (const s of settled) {
            const val = s.status === 'fulfilled' ? s.value : { name: 'unknown', error: s.reason?.message, ok: false };
            if (val.ok) {
                results[val.name] = val.result;
            } else {
                results[val.name] = { error: val.error };
            }
            completed++;
        }

        const groupTime = Date.now() - groupStart;

        if (spinner && chalk) {
            const succeeded = settled.filter(s => s.status === 'fulfilled' && s.value.ok).length;
            const failed = activeTasks.length - succeeded;
            const failStr = failed > 0 ? chalk.red(` (${failed} failed)`) : '';
            spinner.succeed(
                chalk.cyan(`[${group.name}]`) +
                ` ${succeeded}/${activeTasks.length} done in ${groupTime}ms${failStr}` +
                chalk.gray(` [${completed}/${totalTasks}]`)
            );
        }

        if (onProgress) {
            onProgress({ completed, total: totalTasks, percent: Math.round((completed / totalTasks) * 100) });
        }
    }

    const totalTime = Date.now() - pipelineStart;

    return {
        results,
        stats: {
            totalTasks,
            completed,
            totalTime,
            timings,
            parallelSavings: Object.values(timings).reduce((a, b) => a + b, 0) - totalTime,
        },
    };
}

/**
 * Create a progress bar string
 */
export function progressBar(percent, width = 30) {
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `${bar} ${percent}%`;
}

/**
 * Format elapsed time
 */
export function formatTime(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}
