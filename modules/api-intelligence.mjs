/**
 * v5.0 Module: API Intelligence — Network/API/WebSocket/SSE analysis
 *
 * Captures via CDP:
 *  - All XHR/Fetch requests (REST, GraphQL)
 *  - WebSocket connections
 *  - SSE (Server-Sent Events) streams
 *  - Request/response headers (CORS, CSP, Cache-Control)
 *  - Cookie inventory with security attributes
 *  - Third-party request classification
 *  - Total transfer sizes and domain waterfall
 */

export async function analyzeAPIs(page, cdp) {
    const result = {
        requests: [],
        apiEndpoints: [],
        graphqlQueries: [],
        websockets: [],
        eventSources: [],
        cookies: [],
        corsHeaders: [],
        cspPolicy: null,
        thirdPartyRequests: [],
        domainStats: {},
        transferStats: { total: 0, js: 0, css: 0, images: 0, fonts: 0, api: 0, other: 0 },
    };

    // ═══ 1. Enable Network Domain ═══
    await cdp.send('Network.enable');

    const allRequests = new Map();

    // Track all requests
    cdp.on('Network.requestWillBeSent', (evt) => {
        const { requestId, request, type } = evt;
        allRequests.set(requestId, {
            url: request.url,
            method: request.method,
            type: type || 'Other',
            headers: request.headers,
            postData: request.postData?.substring(0, 500) || null,
            timestamp: evt.timestamp,
        });
    });

    // Track responses
    cdp.on('Network.responseReceived', (evt) => {
        const req = allRequests.get(evt.requestId);
        if (req) {
            req.status = evt.response.status;
            req.statusText = evt.response.statusText;
            req.mimeType = evt.response.mimeType;
            req.responseHeaders = evt.response.headers;
            req.encodedDataLength = evt.response.encodedDataLength || 0;
        }
    });

    // Track WebSocket frames
    cdp.on('Network.webSocketCreated', (evt) => {
        result.websockets.push({
            url: evt.url,
            requestId: evt.requestId,
            frames: [],
        });
    });

    cdp.on('Network.webSocketFrameReceived', (evt) => {
        const ws = result.websockets.find(w => w.requestId === evt.requestId);
        if (ws && ws.frames.length < 10) {
            ws.frames.push({
                direction: 'received',
                opcode: evt.response.opcode,
                payloadPreview: evt.response.payloadData?.substring(0, 200),
            });
        }
    });

    cdp.on('Network.webSocketFrameSent', (evt) => {
        const ws = result.websockets.find(w => w.requestId === evt.requestId);
        if (ws && ws.frames.length < 10) {
            ws.frames.push({
                direction: 'sent',
                opcode: evt.response.opcode,
                payloadPreview: evt.response.payloadData?.substring(0, 200),
            });
        }
    });

    // Reload page to capture fresh network activity
    await page.reload({ waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    // ═══ 2. Process Collected Requests ═══
    const pageOrigin = new URL(page.url()).origin;

    for (const [id, req] of allRequests) {
        const url = req.url;

        // Skip data URIs and chrome extensions
        if (url.startsWith('data:') || url.startsWith('chrome-extension:')) continue;

        let reqOrigin;
        try { reqOrigin = new URL(url).origin; } catch (e) { continue; }

        const isThirdParty = reqOrigin !== pageOrigin;
        const isAPI = url.includes('/api/') || url.includes('/graphql') ||
            req.mimeType?.includes('json') ||
            (req.method !== 'GET' && req.type === 'XHR');

        // Classify size
        const size = req.encodedDataLength || 0;
        result.transferStats.total += size;
        if (req.type === 'Script') result.transferStats.js += size;
        else if (req.type === 'Stylesheet') result.transferStats.css += size;
        else if (req.type === 'Image') result.transferStats.images += size;
        else if (req.type === 'Font') result.transferStats.fonts += size;
        else if (isAPI) result.transferStats.api += size;
        else result.transferStats.other += size;

        // Domain stats
        const domain = reqOrigin.replace(/^https?:\/\//, '');
        if (!result.domainStats[domain]) {
            result.domainStats[domain] = { requestCount: 0, totalSize: 0, isThirdParty };
        }
        result.domainStats[domain].requestCount++;
        result.domainStats[domain].totalSize += size;

        // API endpoints
        if (isAPI) {
            const endpoint = {
                method: req.method,
                url: url.substring(0, 200),
                status: req.status,
                mimeType: req.mimeType,
                size,
            };

            // GraphQL detection
            if (url.includes('graphql') || (req.postData && req.postData.includes('"query"'))) {
                try {
                    const body = JSON.parse(req.postData);
                    result.graphqlQueries.push({
                        operationName: body.operationName || null,
                        query: body.query?.substring(0, 300) || null,
                        variables: body.variables ? Object.keys(body.variables) : [],
                    });
                } catch (e) { }
                endpoint.isGraphQL = true;
            }

            result.apiEndpoints.push(endpoint);
        }

        // Third-party classification
        if (isThirdParty) {
            result.thirdPartyRequests.push({
                domain,
                url: url.substring(0, 200),
                type: req.type,
                category: classifyThirdParty(domain),
                size,
            });
        }

        // CORS headers
        if (req.responseHeaders) {
            const cors = req.responseHeaders['access-control-allow-origin'];
            if (cors) {
                result.corsHeaders.push({
                    url: url.substring(0, 100),
                    allowOrigin: cors,
                    allowMethods: req.responseHeaders['access-control-allow-methods'] || null,
                    allowCredentials: req.responseHeaders['access-control-allow-credentials'] || null,
                });
            }
        }
    }

    // ═══ 3. CSP Policy ═══
    result.cspPolicy = await page.evaluate(() => {
        const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        return meta?.content?.substring(0, 500) || null;
    });

    // ═══ 4. Cookies ═══
    const cookies = await page.cookies();
    result.cookies = cookies.map(c => ({
        name: c.name,
        domain: c.domain,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite,
        expires: c.expires > 0 ? new Date(c.expires * 1000).toISOString() : 'Session',
        size: c.value?.length || 0,
        category: classifyCookie(c.name),
    }));

    // ═══ 5. SSE Detection ═══
    const sseData = await page.evaluate(() => {
        // SSE is usually created via EventSource — hard to detect post-creation
        // Look for evidence in scripts
        const scripts = document.querySelectorAll('script');
        let sseFound = false;
        scripts.forEach(s => {
            const text = s.textContent || '';
            if (text.includes('EventSource') || text.includes('text/event-stream')) {
                sseFound = true;
            }
        });
        return { detected: sseFound };
    });
    if (sseData.detected) {
        result.eventSources.push({ detected: true, note: 'EventSource usage detected in scripts' });
    }

    // Deduplicate CORS
    const corsMap = {};
    result.corsHeaders.forEach(c => {
        const key = c.allowOrigin;
        if (!corsMap[key]) corsMap[key] = { ...c, count: 1 };
        else corsMap[key].count++;
    });
    result.corsHeaders = Object.values(corsMap);

    // Limit arrays
    result.thirdPartyRequests = result.thirdPartyRequests.slice(0, 50);
    result.apiEndpoints = result.apiEndpoints.slice(0, 30);
    result.requests = [...allRequests.values()].slice(0, 100).map(r => ({
        method: r.method,
        url: r.url?.substring(0, 150),
        type: r.type,
        status: r.status,
        size: r.encodedDataLength || 0,
    }));

    // Format transfer stats
    for (const key in result.transferStats) {
        result.transferStats[key] = formatBytes(result.transferStats[key]);
    }

    return result;
}

function classifyThirdParty(domain) {
    const analytics = ['google-analytics', 'googletagmanager', 'gtag', 'analytics', 'hotjar', 'mixpanel', 'amplitude', 'segment', 'plausible'];
    const ads = ['doubleclick', 'googlesyndication', 'facebook.com/tr', 'adsense', 'adservice'];
    const cdn = ['cloudflare', 'cdn', 'fastly', 'akamai', 'jsdelivr', 'unpkg', 'cdnjs'];
    const fonts = ['fonts.googleapis', 'fonts.gstatic', 'typekit', 'use.typekit'];
    const social = ['facebook', 'twitter', 'instagram', 'youtube', 'tiktok', 'linkedin'];

    const d = domain.toLowerCase();
    if (analytics.some(a => d.includes(a))) return 'analytics';
    if (ads.some(a => d.includes(a))) return 'advertising';
    if (cdn.some(a => d.includes(a))) return 'cdn';
    if (fonts.some(a => d.includes(a))) return 'fonts';
    if (social.some(a => d.includes(a))) return 'social';
    return 'other';
}

function classifyCookie(name) {
    const n = name.toLowerCase();
    if (n.includes('ga') || n.includes('_gid') || n.includes('analytics') || n.includes('_fbp')) return 'analytics';
    if (n.includes('session') || n.includes('sid') || n.includes('auth') || n.includes('token')) return 'authentication';
    if (n.includes('consent') || n.includes('gdpr') || n.includes('cookie')) return 'consent';
    if (n.includes('pref') || n.includes('lang') || n.includes('theme')) return 'preferences';
    return 'other';
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
