/**
 * ═══════════════════════════════════════════════════════════════
 *  CLONE ENGINE — STAGE 4: BUILD
 *  Validates, installs deps, optionally starts dev server
 * ═══════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { getLogger } from './logger.mjs';

export async function build(projectDir, options = {}) {
    const log = getLogger();
    log.phaseStart('STAGE 4: BUILD', projectDir);

    const port = options.port || 5173;
    const autoStart = options.autoStart !== false;

    log.progress('Validating project structure...');
    const requiredFiles = ['package.json', 'index.html', 'vite.config.ts'];
    const missing = requiredFiles.filter(f => !fs.existsSync(path.join(projectDir, f)));

    if (missing.length > 0) {
        const altMissing = missing.filter(f => {
            if (f === 'vite.config.ts') return !fs.existsSync(path.join(projectDir, 'vite.config.js'));
            return true;
        });

        if (altMissing.length > 0) {
            log.warn(`Missing files: ${altMissing.join(', ')} — scaffolding...`);
            await scaffoldMissing(projectDir, altMissing, port);
        }
    }

    log.progress('Checking dependencies...');
    const pkgPath = path.join(projectDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const deps = pkg.dependencies || {};
        const devDeps = pkg.devDependencies || {};
        let modified = false;

        const required = {
            'react': '^18.0.0',
            'react-dom': '^18.0.0',
            'gsap': '^3.12.0',
            '@gsap/react': '^2.0.0',
            'framer-motion': '^11.0.0',
        };

        for (const [name, version] of Object.entries(required)) {
            if (!deps[name]) { deps[name] = version; modified = true; }
        }

        const requiredDev = {
            'vite': '^5.0.0',
            '@vitejs/plugin-react': '^4.0.0',
            'typescript': '^5.0.0',
            '@types/react': '^18.0.0',
            '@types/react-dom': '^18.0.0',
        };

        for (const [name, version] of Object.entries(requiredDev)) {
            if (!devDeps[name]) { devDeps[name] = version; modified = true; }
        }

        if (modified) {
            pkg.dependencies = deps;
            pkg.devDependencies = devDeps;
            fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
            log.info('Updated package.json with required dependencies');
        }
    }

    log.progress('Installing dependencies (npm install)...');
    await runShell('npm', ['install', '--legacy-peer-deps'], projectDir);
    log.success('Dependencies installed');

    if (autoStart) {
        log.progress(`Starting dev server on port ${port}...`);
        const devServer = spawn('npx', ['vite', '--port', String(port)], {
            cwd: path.resolve(projectDir),
            shell: true,
            stdio: 'inherit',
        });

        const url = `http://localhost:${port}`;
        try {
            await waitForServer(url, 30000);
            log.success(`Dev server running at ${url}`);
        } catch (e) {
            log.warn('Dev server may still be starting: ' + e.message);
        }

        log.phaseEnd();
        return { url, server: devServer };
    }

    log.success('Build complete. Run `npm run dev` to start.');
    log.phaseEnd();
    return { projectDir };
}


async function scaffoldMissing(projectDir, missing, port) {
    for (const file of missing) {
        const filePath = path.join(projectDir, file);

        if (file === 'package.json') {
            fs.writeFileSync(filePath, JSON.stringify({
                name: 'clone-project',
                version: '1.0.0',
                type: 'module',
                scripts: { dev: 'vite', build: 'tsc && vite build', preview: 'vite preview' },
                dependencies: {},
                devDependencies: {},
            }, null, 2));
        }

        if (file === 'index.html') {
            fs.writeFileSync(filePath, `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Clone Project</title>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
</body>
</html>
`);
        }

        if (file === 'vite.config.ts') {
            fs.writeFileSync(filePath, `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: { port: ${port}, open: true },
});
`);
        }
    }
}

function runShell(cmd, args, cwd) {
    return new Promise((resolve, reject) => {
        const proc = spawn(cmd, args, {
            cwd: path.resolve(cwd),
            shell: true,
            stdio: 'pipe',
        });

        let stderr = '';
        proc.stderr?.on('data', d => stderr += d.toString());

        proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`${cmd} exited with code ${code}: ${stderr.substring(0, 200)}`));
        });

        proc.on('error', reject);
        setTimeout(() => {
            try { proc.kill(); } catch {}
            reject(new Error(`${cmd} timed out`));
        }, 120000);
    });
}

async function waitForServer(url, timeout = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        try {
            const res = await fetch(url);
            if (res.ok || res.status === 304) return true;
        } catch {}
        await new Promise(r => setTimeout(r, 500));
    }
    throw new Error(`Server at ${url} did not start within ${timeout}ms`);
}
