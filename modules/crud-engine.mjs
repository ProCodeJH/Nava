/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  CRUD Mock Engine v10.0                                      ║
 * ║  Intelligent API that supports Create/Read/Update/Delete     ║
 * ║  with SQLite storage — not just replay, real CRUD            ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Analyze captured API data and infer CRUD patterns
 */
export function inferCRUDPatterns(apiData) {
    const endpoints = apiData?.apiEndpoints || [];
    const patterns = [];

    // Group by resource path
    const resourceMap = {};
    for (const ep of endpoints) {
        // Extract resource name: /api/users/123 → users
        const parts = ep.path.replace(/^\/api\/v?\d*\/?/, '').split('/');
        const resource = parts[0] || 'items';
        if (!resourceMap[resource]) resourceMap[resource] = [];
        resourceMap[resource].push(ep);
    }

    for (const [resource, eps] of Object.entries(resourceMap)) {
        const pattern = {
            resource,
            tableName: resource.toLowerCase().replace(/[^a-z0-9]/g, '_'),
            operations: [],
            fields: [],
            sampleData: [],
        };

        for (const ep of eps) {
            const method = ep.method.toUpperCase();
            const hasIdParam = /\/\d+|\/:[a-z]+id/i.test(ep.path);

            if (method === 'GET' && !hasIdParam) {
                pattern.operations.push('list');
            } else if (method === 'GET' && hasIdParam) {
                pattern.operations.push('read');
            } else if (method === 'POST') {
                pattern.operations.push('create');
            } else if (method === 'PUT' || method === 'PATCH') {
                pattern.operations.push('update');
            } else if (method === 'DELETE') {
                pattern.operations.push('delete');
            }

            // Infer fields from response
            if (ep.response && typeof ep.response === 'object') {
                const data = Array.isArray(ep.response) ? ep.response[0] :
                    ep.response.data && Array.isArray(ep.response.data) ? ep.response.data[0] :
                        ep.response;
                if (data && typeof data === 'object') {
                    for (const [key, val] of Object.entries(data)) {
                        const type = inferFieldType(val);
                        if (!pattern.fields.find(f => f.name === key)) {
                            pattern.fields.push({ name: key, type, sample: val });
                        }
                    }
                    pattern.sampleData.push(data);
                }
            }
        }

        pattern.operations = [...new Set(pattern.operations)];
        if (pattern.operations.length === 0) pattern.operations = ['list', 'read'];
        patterns.push(pattern);
    }

    return patterns;
}

function inferFieldType(value) {
    if (value === null || value === undefined) return 'TEXT';
    if (typeof value === 'number') return Number.isInteger(value) ? 'INTEGER' : 'REAL';
    if (typeof value === 'boolean') return 'INTEGER'; // SQLite uses INTEGER for bool
    if (typeof value === 'string') {
        if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'TEXT'; // datetime as text
        if (value.length > 500) return 'TEXT';
        return 'TEXT';
    }
    if (typeof value === 'object') return 'TEXT'; // JSON as text
    return 'TEXT';
}

/**
 * Generate Express CRUD server code with better-sqlite3
 */
export function generateCRUDServer(crudPatterns, apiData) {
    const hasSQLite = crudPatterns.length > 0;

    let code = `#!/usr/bin/env node
/**
 * ═══ Design-DNA CRUD Mock Server v10.0 ═══
 * Intelligent API with real Create/Read/Update/Delete operations
 * Data persisted in SQLite database
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ═══ SQLite Database ═══
const db = new Database(path.join(__dirname, 'data.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ═══ Create Tables ═══
`;

    for (const pattern of crudPatterns) {
        const fields = pattern.fields.filter(f => f.name !== 'id');
        code += `db.exec(\`CREATE TABLE IF NOT EXISTS ${pattern.tableName} (\n`;
        code += `    id INTEGER PRIMARY KEY AUTOINCREMENT,\n`;
        for (const field of fields) {
            code += `    ${field.name.replace(/[^a-zA-Z0-9_]/g, '_')} ${field.type} DEFAULT ${field.type === 'INTEGER' ? '0' : field.type === 'REAL' ? '0.0' : "''"},\n`;
        }
        code += `    created_at TEXT DEFAULT (datetime('now')),\n`;
        code += `    updated_at TEXT DEFAULT (datetime('now'))\n`;
        code += `);\`);\n\n`;
    }

    // Seed data
    code += `// ═══ Seed Data ═══\n`;
    for (const pattern of crudPatterns) {
        if (pattern.sampleData.length > 0) {
            const fields = pattern.fields.filter(f => f.name !== 'id');
            const fieldNames = fields.map(f => f.name.replace(/[^a-zA-Z0-9_]/g, '_'));
            code += `const seed_${pattern.tableName} = db.prepare('SELECT COUNT(*) as c FROM ${pattern.tableName}').get();\n`;
            code += `if (seed_${pattern.tableName}.c === 0) {\n`;
            code += `    const insert_${pattern.tableName} = db.prepare('INSERT INTO ${pattern.tableName} (${fieldNames.join(', ')}) VALUES (${fieldNames.map(() => '?').join(', ')})');\n`;
            code += `    const seedData = ${JSON.stringify(pattern.sampleData.slice(0, 20))};\n`;
            code += `    for (const row of seedData) {\n`;
            code += `        try {\n`;
            code += `            insert_${pattern.tableName}.run(${fieldNames.map(f => `typeof row['${f}'] === 'object' ? JSON.stringify(row['${f}']) : row['${f}'] ?? null`).join(', ')});\n`;
            code += `        } catch {}\n`;
            code += `    }\n`;
            code += `    console.log('  Seeded ${pattern.tableName}:', seedData.length, 'rows');\n`;
            code += `}\n\n`;
        }
    }

    // CRUD Routes
    code += `// ═══ CRUD Routes ═══\n`;
    for (const pattern of crudPatterns) {
        const t = pattern.tableName;
        const r = `/api/${pattern.resource}`;

        code += `\n// ${pattern.resource} CRUD\n`;

        // LIST
        code += `app.get('${r}', (req, res) => {\n`;
        code += `    const { page = 1, limit = 20, sort = 'id', order = 'desc', search } = req.query;\n`;
        code += `    const offset = (page - 1) * limit;\n`;
        code += `    let where = '';\n`;
        code += `    if (search) {\n`;
        code += `        const searchFields = ${JSON.stringify(pattern.fields.filter(f => f.type === 'TEXT').map(f => f.name.replace(/[^a-zA-Z0-9_]/g, '_')))};\n`;
        code += `        where = 'WHERE ' + searchFields.map(f => f + ' LIKE ?').join(' OR ');\n`;
        code += `    }\n`;
        code += `    const total = db.prepare('SELECT COUNT(*) as c FROM ${t} ' + where).get(...(search ? Array(${pattern.fields.filter(f => f.type === 'TEXT').length}).fill('%'+search+'%') : []))?.c || 0;\n`;
        code += `    const items = db.prepare('SELECT * FROM ${t} ' + where + ' ORDER BY ' + sort + ' ' + order + ' LIMIT ? OFFSET ?').all(...(search ? Array(${pattern.fields.filter(f => f.type === 'TEXT').length}).fill('%'+search+'%') : []), +limit, +offset);\n`;
        code += `    res.json({ data: items, total, page: +page, limit: +limit, pages: Math.ceil(total / limit) });\n`;
        code += `});\n`;

        // READ
        code += `app.get('${r}/:id', (req, res) => {\n`;
        code += `    const item = db.prepare('SELECT * FROM ${t} WHERE id = ?').get(req.params.id);\n`;
        code += `    item ? res.json(item) : res.status(404).json({ error: 'Not found' });\n`;
        code += `});\n`;

        // CREATE
        code += `app.post('${r}', (req, res) => {\n`;
        code += `    const fields = Object.keys(req.body).filter(k => k !== 'id');\n`;
        code += `    if (!fields.length) return res.status(400).json({ error: 'No data' });\n`;
        code += `    const placeholders = fields.map(() => '?').join(', ');\n`;
        code += `    const values = fields.map(f => typeof req.body[f] === 'object' ? JSON.stringify(req.body[f]) : req.body[f]);\n`;
        code += `    try {\n`;
        code += `        const result = db.prepare('INSERT INTO ${t} (' + fields.join(', ') + ') VALUES (' + placeholders + ')').run(...values);\n`;
        code += `        const item = db.prepare('SELECT * FROM ${t} WHERE id = ?').get(result.lastInsertRowid);\n`;
        code += `        res.status(201).json(item);\n`;
        code += `    } catch (e) { res.status(400).json({ error: e.message }); }\n`;
        code += `});\n`;

        // UPDATE
        code += `app.put('${r}/:id', (req, res) => {\n`;
        code += `    const fields = Object.keys(req.body).filter(k => k !== 'id');\n`;
        code += `    if (!fields.length) return res.status(400).json({ error: 'No data' });\n`;
        code += `    const sets = fields.map(f => f + ' = ?').join(', ');\n`;
        code += `    const values = fields.map(f => typeof req.body[f] === 'object' ? JSON.stringify(req.body[f]) : req.body[f]);\n`;
        code += `    values.push(req.params.id);\n`;
        code += `    try {\n`;
        code += `        db.prepare('UPDATE ${t} SET ' + sets + ", updated_at = datetime('now') WHERE id = ?").run(...values);\n`;
        code += `        const item = db.prepare('SELECT * FROM ${t} WHERE id = ?').get(req.params.id);\n`;
        code += `        item ? res.json(item) : res.status(404).json({ error: 'Not found' });\n`;
        code += `    } catch (e) { res.status(400).json({ error: e.message }); }\n`;
        code += `});\n`;
        code += `app.patch('${r}/:id', (req, res) => res.redirect(307, req.originalUrl.replace('PATCH', 'PUT')));\n`;

        // DELETE
        code += `app.delete('${r}/:id', (req, res) => {\n`;
        code += `    const result = db.prepare('DELETE FROM ${t} WHERE id = ?').run(req.params.id);\n`;
        code += `    result.changes > 0 ? res.json({ success: true }) : res.status(404).json({ error: 'Not found' });\n`;
        code += `});\n`;
    }

    // Static + catch-all
    code += `\n// ═══ Static + SPA Fallback ═══\n`;
    code += `app.use(express.static(path.join(__dirname, 'public')));\n`;
    code += `app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));\n\n`;

    code += `// ═══ Start ═══\n`;
    code += `app.listen(PORT, () => {\n`;
    code += `    console.log('');\n`;
    code += `    console.log('  ╔════════════════════════════════════════╗');\n`;
    code += `    console.log('  ║  Design-DNA CRUD Server v10.0         ║');\n`;
    code += `    console.log('  ╚════════════════════════════════════════╝');\n`;
    code += `    console.log('');\n`;
    code += `    console.log('  🌐 http://localhost:' + PORT);\n`;
    code += `    console.log('  📡 Resources:');\n`;
    for (const p of crudPatterns) {
        code += `    console.log('     GET/POST   /api/${p.resource}');\n`;
        code += `    console.log('     GET/PUT/DEL /api/${p.resource}/:id');\n`;
    }
    code += `    console.log('');\n`;
    code += `});\n`;

    return {
        serverCode: code,
        dependencies: {
            express: '^4.18.0',
            cors: '^2.8.5',
            'better-sqlite3': '^11.0.0',
        },
    };
}

/**
 * Save CRUD server to output directory
 */
export async function saveCRUDServer(outputDir, apiData) {
    const patterns = inferCRUDPatterns(apiData);
    if (patterns.length === 0) return null;

    const { serverCode, dependencies } = generateCRUDServer(patterns, apiData);
    const crudDir = path.join(outputDir, 'fullstack-clone');
    await fs.mkdir(crudDir, { recursive: true });

    // Write CRUD server
    await fs.writeFile(path.join(crudDir, 'server-crud.mjs'), serverCode, 'utf-8');

    // Update package.json with better-sqlite3
    const pkgPath = path.join(crudDir, 'package.json');
    try {
        const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
        Object.assign(pkg.dependencies, dependencies);
        pkg.scripts['crud'] = 'node server-crud.mjs';
        await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2), 'utf-8');
    } catch {
        await fs.writeFile(pkgPath, JSON.stringify({
            name: 'design-dna-crud-clone',
            version: '1.0.0',
            type: 'module',
            scripts: { start: 'node server.mjs', crud: 'node server-crud.mjs' },
            dependencies,
        }, null, 2), 'utf-8');
    }

    return {
        resources: patterns.map(p => p.resource),
        totalResources: patterns.length,
        totalFields: patterns.reduce((sum, p) => sum + p.fields.length, 0),
        seededRows: patterns.reduce((sum, p) => sum + p.sampleData.length, 0),
    };
}
