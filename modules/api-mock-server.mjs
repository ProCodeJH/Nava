/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  API Mock Server v9.0                                        ║
 * ║  Intercept all network requests → generate Express mock      ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Start intercepting all network requests on the page
 */
export async function startAPICapture(page) {
    const captured = {
        requests: [],
        responses: [],
        apiEndpoints: [],
        graphql: [],
        websockets: [],
    };

    // ═══ 1. Intercept all network requests ═══
    page.on('request', (req) => {
        const url = req.url();
        const method = req.method();
        const resourceType = req.resourceType();

        // Skip static assets
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) return;

        // Capture API calls (XHR, fetch)
        if (['xhr', 'fetch'].includes(resourceType) ||
            url.includes('/api/') || url.includes('/graphql') ||
            url.includes('/rest/') || url.includes('/v1/') || url.includes('/v2/')) {

            const parsed = new URL(url);
            const postData = req.postData();

            const entry = {
                url,
                path: parsed.pathname,
                method,
                queryParams: Object.fromEntries(parsed.searchParams),
                headers: req.headers(),
                postData: postData ? tryParseJSON(postData) : null,
                resourceType,
                timestamp: Date.now(),
            };

            // Detect GraphQL
            if (url.includes('/graphql') || (postData && postData.includes('"query"'))) {
                const gql = tryParseJSON(postData);
                if (gql) {
                    entry.isGraphQL = true;
                    entry.operationName = gql.operationName;
                    entry.query = gql.query?.substring(0, 500);
                    entry.variables = gql.variables;
                    captured.graphql.push(entry);
                }
            }

            captured.requests.push(entry);
        }
    });

    page.on('response', async (res) => {
        const url = res.url();
        const status = res.status();
        const resourceType = res.request().resourceType();

        if (!['xhr', 'fetch'].includes(resourceType) &&
            !url.includes('/api/') && !url.includes('/graphql') &&
            !url.includes('/rest/') && !url.includes('/v1/') && !url.includes('/v2/')) return;

        try {
            const parsed = new URL(url);
            const contentType = res.headers()['content-type'] || '';
            let body = null;

            if (contentType.includes('json')) {
                try { body = await res.json(); } catch { body = await res.text().catch(() => null); }
            } else if (contentType.includes('text')) {
                body = await res.text().catch(() => null);
            }

            captured.responses.push({
                url,
                path: parsed.pathname,
                method: res.request().method(),
                status,
                headers: res.headers(),
                contentType,
                body,
                bodySize: JSON.stringify(body)?.length || 0,
            });

            // Build unique endpoint entry
            const endpointKey = `${res.request().method()} ${parsed.pathname}`;
            const existing = captured.apiEndpoints.find(e => e.key === endpointKey);
            if (!existing) {
                captured.apiEndpoints.push({
                    key: endpointKey,
                    method: res.request().method(),
                    path: parsed.pathname,
                    status,
                    contentType,
                    sampleResponse: body,
                    queryParams: Object.fromEntries(parsed.searchParams),
                    callCount: 1,
                });
            } else {
                existing.callCount++;
            }
        } catch { }
    });

    return captured;
}

/**
 * Save captured API data as fixtures
 */
export async function saveAPIFixtures(captured, outputDir) {
    const fixturesDir = path.join(outputDir, 'mock-server', 'fixtures');
    await fs.mkdir(fixturesDir, { recursive: true });

    const savedFixtures = [];

    for (const endpoint of captured.apiEndpoints) {
        const filename = sanitizeFilename(endpoint.key) + '.json';
        const fixturePath = path.join(fixturesDir, filename);

        const fixture = {
            method: endpoint.method,
            path: endpoint.path,
            status: endpoint.status,
            contentType: endpoint.contentType,
            queryParams: endpoint.queryParams,
            response: endpoint.sampleResponse,
        };

        await fs.writeFile(fixturePath, JSON.stringify(fixture, null, 2), 'utf-8');
        savedFixtures.push({ file: filename, ...fixture, response: undefined });
    }

    // Save GraphQL operations
    if (captured.graphql.length > 0) {
        const gqlFixtures = captured.graphql.map(g => ({
            operationName: g.operationName,
            query: g.query,
            variables: g.variables,
        }));
        await fs.writeFile(path.join(fixturesDir, '_graphql-operations.json'), JSON.stringify(gqlFixtures, null, 2), 'utf-8');
    }

    // Save API manifest
    const manifest = {
        totalEndpoints: captured.apiEndpoints.length,
        totalRequests: captured.requests.length,
        graphqlOperations: captured.graphql.length,
        endpoints: savedFixtures,
    };
    await fs.writeFile(path.join(fixturesDir, '_manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

    return manifest;
}

/**
 * Generate a standalone Express mock server
 */
export async function generateMockServer(captured, outputDir) {
    const serverDir = path.join(outputDir, 'mock-server');
    await fs.mkdir(serverDir, { recursive: true });

    // Generate server.mjs
    let serverCode = `/**
 * ═══ Design-DNA API Mock Server (auto-generated) ═══
 * Endpoints: ${captured.apiEndpoints.length}
 * GraphQL: ${captured.graphql.length > 0 ? 'Yes' : 'No'}
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3457;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
    console.log(\`[\${new Date().toISOString()}] \${req.method} \${req.path}\`);
    next();
});

// Load fixtures
function loadFixture(filename) {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'fixtures', filename), 'utf-8');
        return JSON.parse(data);
    } catch { return null; }
}

`;

    // ═══ Generate routes for each endpoint ═══
    for (const endpoint of captured.apiEndpoints) {
        const fixtureFile = sanitizeFilename(endpoint.key) + '.json';
        const method = endpoint.method.toLowerCase();
        const routePath = endpoint.path;

        // Convert path params (e.g., /api/users/123 → /api/users/:id)
        const paramPath = routePath.replace(/\/(\d+)(?=\/|$)/g, '/:id');

        serverCode += `// ${endpoint.method} ${endpoint.path} (${endpoint.callCount} calls captured)\n`;
        serverCode += `app.${method}('${paramPath}', (req, res) => {\n`;
        serverCode += `    const fixture = loadFixture('${fixtureFile}');\n`;
        serverCode += `    if (fixture) {\n`;
        serverCode += `        res.status(fixture.status || 200);\n`;
        serverCode += `        if (fixture.contentType) res.set('Content-Type', fixture.contentType);\n`;
        serverCode += `        res.json(fixture.response);\n`;
        serverCode += `    } else {\n`;
        serverCode += `        res.status(404).json({ error: 'Fixture not found' });\n`;
        serverCode += `    }\n`;
        serverCode += `});\n\n`;
    }

    // ═══ GraphQL endpoint ═══
    if (captured.graphql.length > 0) {
        serverCode += `// GraphQL Mock Endpoint\n`;
        serverCode += `app.post('/graphql', (req, res) => {\n`;
        serverCode += `    const { operationName, query } = req.body;\n`;
        serverCode += `    const ops = loadFixture('_graphql-operations.json') || [];\n`;
        serverCode += `    const match = ops.find(op => op.operationName === operationName);\n`;
        serverCode += `    if (match) {\n`;
        serverCode += `        // Return cached response for this operation\n`;
        serverCode += `        const responses = loadFixture('_manifest.json');\n`;
        serverCode += `        res.json({ data: match.response || {} });\n`;
        serverCode += `    } else {\n`;
        serverCode += `        res.json({ data: {}, errors: [{ message: 'Unknown operation: ' + operationName }] });\n`;
        serverCode += `    }\n`;
        serverCode += `});\n\n`;
    }

    // ═══ Catch-all for unknown routes ═══
    serverCode += `// Catch-all: return empty JSON for unknown API routes\n`;
    serverCode += `app.all('/api/*', (req, res) => {\n`;
    serverCode += `    console.log('[MISS]', req.method, req.path);\n`;
    serverCode += `    res.status(200).json({ data: [], message: 'Mock: no fixture for this endpoint' });\n`;
    serverCode += `});\n\n`;

    serverCode += `app.listen(PORT, () => {\n`;
    serverCode += `    console.log('\\n  ═══ Design-DNA Mock API Server ═══');\n`;
    serverCode += `    console.log('  Listening on: http://localhost:' + PORT);\n`;
    serverCode += `    console.log('  Endpoints: ${captured.apiEndpoints.length}');\n`;
    serverCode += `    console.log('  GraphQL: ${captured.graphql.length > 0 ? 'enabled' : 'disabled'}\\n');\n`;
    serverCode += `});\n`;

    await fs.writeFile(path.join(serverDir, 'server.mjs'), serverCode, 'utf-8');

    // Generate package.json
    const pkgJson = {
        name: 'design-dna-mock-server',
        version: '1.0.0',
        type: 'module',
        scripts: {
            start: 'node server.mjs',
        },
        dependencies: {
            express: '^4.18.0',
            cors: '^2.8.5',
        },
    };
    await fs.writeFile(path.join(serverDir, 'package.json'), JSON.stringify(pkgJson, null, 2), 'utf-8');

    return {
        serverFile: path.join(serverDir, 'server.mjs'),
        endpoints: captured.apiEndpoints.length,
        graphql: captured.graphql.length > 0,
    };
}

function sanitizeFilename(str) {
    return str.replace(/[^a-zA-Z0-9-]/g, '_').replace(/_+/g, '_').substring(0, 80);
}

function tryParseJSON(str) {
    if (!str) return null;
    try { return JSON.parse(str); } catch { return str; }
}
