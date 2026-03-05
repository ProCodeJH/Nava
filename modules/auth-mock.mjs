/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Auth Mock System v9.0                                       ║
 * ║  Capture auth flows → generate mock token system             ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Injection script to capture auth-related activity
 */
export function getAuthCaptureScript() {
    return `(function(){if(window.__DNA_AUTH__)return;window.__DNA_AUTH__=true;
    window.__dnaAuth={tokens:[],cookies:[],storage:{},forms:[],oauthRedirects:[],headers:{}};
    
    // Track cookies
    const origCookie=Object.getOwnPropertyDescriptor(Document.prototype,'cookie');
    Object.defineProperty(document,'cookie',{
        get(){return origCookie.get.call(this)},
        set(v){window.__dnaAuth.cookies.push({value:v.substring(0,200),ts:Date.now()});return origCookie.set.call(this,v)}
    });
    
    // Track fetch auth headers
    const origFetch=window.fetch;
    window.fetch=function(url,opts){
        if(opts?.headers){
            const h=opts.headers;
            ['Authorization','X-Auth-Token','X-CSRF-Token','X-API-Key'].forEach(k=>{
                const v=h instanceof Headers?h.get(k):(h[k]||h[k.toLowerCase()]);
                if(v)window.__dnaAuth.headers[k]=v.substring(0,200);
            });
        }
        return origFetch.apply(this,arguments);
    };
    
    // Track XMLHttpRequest auth headers
    const origOpen=XMLHttpRequest.prototype.open;
    const origSetHeader=XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.setRequestHeader=function(k,v){
        if(/auth|token|csrf|api.key/i.test(k))window.__dnaAuth.headers[k]=v.substring(0,200);
        return origSetHeader.call(this,k,v);
    };
    
    // Track OAuth redirects
    const origAssign=Object.getOwnPropertyDescriptor(Location.prototype,'href');
    
    // Track localStorage/sessionStorage auth data
    ['localStorage','sessionStorage'].forEach(s=>{
        try{
            const store=window[s];
            for(let i=0;i<store.length;i++){
                const k=store.key(i);
                if(/token|auth|user|session|jwt|csrf|api.key/i.test(k)){
                    window.__dnaAuth.storage[s+'::'+k]=store.getItem(k)?.substring(0,500);
                }
            }
        }catch{}
    });
    })();`;
}

/**
 * Extract captured auth data
 */
export async function extractAuthData(page) {
    return page.evaluate(() => {
        const d = window.__dnaAuth || {};

        // Detect auth type
        let authType = 'none';
        if (d.headers?.Authorization?.startsWith('Bearer')) authType = 'jwt';
        else if (d.headers?.Authorization?.startsWith('Basic')) authType = 'basic';
        else if (d.cookies?.some(c => /session|sid|auth/i.test(c.value))) authType = 'session';
        else if (Object.keys(d.storage || {}).some(k => /token|jwt/i.test(k))) authType = 'jwt';
        else if (d.oauthRedirects?.length > 0) authType = 'oauth';

        // Find login/signup forms
        const forms = [];
        document.querySelectorAll('form').forEach(f => {
            const inputs = [...f.querySelectorAll('input')].map(i => ({
                type: i.type, name: i.name, placeholder: i.placeholder,
                required: i.required, pattern: i.pattern || null,
            }));
            const hasPassword = inputs.some(i => i.type === 'password');
            const hasEmail = inputs.some(i => i.type === 'email' || /email|mail/i.test(i.name));
            if (hasPassword || hasEmail) {
                forms.push({
                    action: f.action, method: f.method,
                    inputs, isLogin: hasPassword && inputs.length <= 4,
                    isSignup: hasPassword && inputs.length > 4,
                });
            }
        });
        d.forms = forms;

        return {
            authType, forms, headers: d.headers || {},
            cookies: d.cookies?.slice(0, 20) || [],
            storage: d.storage || {},
            stats: {
                authType, formsDetected: forms.length,
                tokensFound: Object.keys(d.storage || {}).length,
                cookiesTracked: d.cookies?.length || 0,
            },
        };
    });
}

/**
 * Generate mock auth system code
 */
export function generateAuthMockCode(authData) {
    if (!authData || authData.authType === 'none') return '';

    let code = `/**
 * ═══ Auth Mock System (Design-DNA v9.0) ═══
 * Auth type: ${authData.authType}
 * Forms: ${authData.forms?.length || 0}
 */

`;

    // Mock JWT generator
    if (authData.authType === 'jwt') {
        code += `// Mock JWT Token Generator
function generateMockJWT() {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
        sub: 'mock-user-001', name: 'Test User', email: 'test@example.com',
        iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400,
    }));
    const sig = btoa('mock-signature-' + Date.now());
    return header + '.' + payload + '.' + sig;
}

`;
    }

    // Express auth routes
    code += `// Auth Routes for Express mock server
export function setupAuthRoutes(app) {
`;

    // Login endpoint
    if (authData.forms?.some(f => f.isLogin)) {
        code += `    // Login
    app.post('/api/auth/login', (req, res) => {
        const { email, password } = req.body;
        if (email && password) {
            const token = ${authData.authType === 'jwt' ? 'generateMockJWT()' : '"mock-session-token-" + Date.now()'};
            res.json({ success: true, token, user: { id: 1, email, name: 'Test User' } });
        } else {
            res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
    });

    app.post('/login', (req, res) => res.redirect('/'));
`;
    }

    // Signup endpoint
    if (authData.forms?.some(f => f.isSignup)) {
        code += `
    // Signup
    app.post('/api/auth/signup', (req, res) => {
        const { email, password, name } = req.body;
        const token = ${authData.authType === 'jwt' ? 'generateMockJWT()' : '"mock-session-token-" + Date.now()'};
        res.json({ success: true, token, user: { id: 2, email, name: name || 'New User' } });
    });
`;
    }

    // Token validation
    code += `
    // Token validation middleware
    app.get('/api/auth/me', (req, res) => {
        const auth = req.headers.authorization;
        if (auth) {
            res.json({ id: 1, email: 'test@example.com', name: 'Test User', role: 'user' });
        } else {
            res.status(401).json({ error: 'Not authenticated' });
        }
    });

    // Logout
    app.post('/api/auth/logout', (req, res) => {
        res.json({ success: true });
    });

    // OAuth mock
    app.get('/api/auth/google', (req, res) => {
        res.redirect('/?token=' + ${authData.authType === 'jwt' ? 'generateMockJWT()' : '"mock-oauth-token"'});
    });
`;

    // Restore storage state
    if (Object.keys(authData.storage || {}).length > 0) {
        code += `
    // Restore auth state on client
    app.get('/api/auth/restore-state', (req, res) => {
        res.json(${JSON.stringify(authData.storage)});
    });
`;
    }

    code += `}\n`;

    // Client-side auth restoration script
    code += `
// Client-side auth state restoration
export const authClientScript = \`
<script>
(function() {
    const state = ${JSON.stringify(authData.storage || {})};
    for (const [key, value] of Object.entries(state)) {
        const [store, name] = key.split('::');
        try { window[store].setItem(name, value); } catch {}
    }
})();
</script>\`;
`;

    return code;
}
