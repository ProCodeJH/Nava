/**
 * v5.0 Module: Authentication Flow Analyzer
 *
 * Features:
 *  - Login form detection (email/password fields)
 *  - OAuth provider detection (Google, GitHub, Kakao, Apple, etc.)
 *  - JWT token analysis (from headers/cookies)
 *  - Cookie/header injection for authenticated page access
 *  - __NEXT_DATA__ session structure extraction
 *  - CSRF token detection
 *  - Protected route detection (redirect patterns)
 */

export async function analyzeAuthFlow(page, options = {}) {
    const result = {
        loginForms: [],
        oauthProviders: [],
        jwtTokens: [],
        sessionStorage: [],
        csrfTokens: [],
        authHeaders: [],
        protectedRoutePatterns: [],
        nextDataAuth: null,
    };

    // ═══ 1. Detect Login Forms ═══
    const formData = await page.evaluate(() => {
        const forms = [];

        document.querySelectorAll('form').forEach(form => {
            const passwordField = form.querySelector('input[type="password"]');
            const emailField = form.querySelector('input[type="email"], input[name*="email"], input[name*="user"], input[id*="email"], input[id*="user"]');
            const usernameField = form.querySelector('input[name*="username"], input[name*="login"], input[id*="username"], input[name*="id"]');

            if (passwordField || emailField || usernameField) {
                const fields = Array.from(form.querySelectorAll('input, select')).map(input => ({
                    type: input.type || 'text',
                    name: input.name || null,
                    id: input.id || null,
                    placeholder: input.placeholder?.substring(0, 40) || null,
                    required: input.required,
                    autocomplete: input.getAttribute('autocomplete') || null,
                }));

                forms.push({
                    action: form.action?.substring(0, 200) || null,
                    method: form.method?.toUpperCase() || 'GET',
                    fields,
                    hasRememberMe: !!form.querySelector('input[name*="remember"], input[type="checkbox"]'),
                    hasForgotPassword: !!form.querySelector('a[href*="forgot"], a[href*="reset"], a[href*="password"]'),
                    hasSignup: !!form.querySelector('a[href*="signup"], a[href*="register"], a[href*="join"]'),
                    submitButton: (() => {
                        const btn = form.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
                        return btn ? btn.textContent?.trim()?.substring(0, 30) || btn.value : null;
                    })(),
                });
            }
        });

        return forms;
    });
    result.loginForms = formData;

    // ═══ 2. OAuth Provider Detection ═══
    const oauthData = await page.evaluate(() => {
        const providers = [];
        const oauthPatterns = [
            { name: 'Google', patterns: ['accounts.google.com', 'google.com/o/oauth2', 'googleapis.com/auth', 'google-sign-in', 'gsi/client'] },
            { name: 'GitHub', patterns: ['github.com/login/oauth', 'github.com/sessions'] },
            { name: 'Facebook', patterns: ['facebook.com/v', 'facebook.com/dialog/oauth', 'connect.facebook.net'] },
            { name: 'Apple', patterns: ['appleid.apple.com/auth', 'apple.com/sign-in'] },
            { name: 'Kakao', patterns: ['kauth.kakao.com', 'kakao.com/oauth', 'developers.kakao.com'] },
            { name: 'Naver', patterns: ['nid.naver.com', 'naver.com/oauth'] },
            { name: 'Twitter/X', patterns: ['api.twitter.com/oauth', 'twitter.com/i/oauth'] },
            { name: 'Microsoft', patterns: ['login.microsoftonline.com', 'login.live.com'] },
            { name: 'Discord', patterns: ['discord.com/api/oauth2', 'discord.com/oauth2'] },
            { name: 'Auth0', patterns: ['auth0.com/authorize', '.auth0.com'] },
            { name: 'Firebase Auth', patterns: ['firebaseapp.com/__/auth', 'identitytoolkit.googleapis.com'] },
            { name: 'Supabase Auth', patterns: ['supabase.co/auth', 'supabase.io/auth'] },
            { name: 'Clerk', patterns: ['clerk.dev', 'clerk.com', 'accounts.clerk'] },
        ];

        // Check links
        document.querySelectorAll('a[href], button').forEach(el => {
            const href = el.href || '';
            const text = el.textContent?.toLowerCase() || '';
            const img = el.querySelector('img');
            const imgSrc = img?.src?.toLowerCase() || '';
            const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';

            for (const provider of oauthPatterns) {
                const matchLink = provider.patterns.some(p => href.includes(p));
                const matchText = text.includes(provider.name.toLowerCase()) && (text.includes('sign in') || text.includes('login') || text.includes('로그인') || text.includes('계속'));
                const matchImg = imgSrc.includes(provider.name.toLowerCase());
                const matchAria = ariaLabel.includes(provider.name.toLowerCase());

                if (matchLink || matchText || matchImg || matchAria) {
                    if (!providers.find(p => p.name === provider.name)) {
                        providers.push({
                            name: provider.name,
                            loginUrl: matchLink ? href.substring(0, 200) : null,
                            buttonText: el.textContent?.trim()?.substring(0, 50),
                            detectedVia: matchLink ? 'link' : matchText ? 'text' : matchImg ? 'image' : 'aria',
                        });
                    }
                }
            }
        });

        // Check scripts for OAuth SDKs
        document.querySelectorAll('script[src]').forEach(s => {
            for (const provider of oauthPatterns) {
                if (provider.patterns.some(p => s.src.includes(p))) {
                    if (!providers.find(p => p.name === provider.name)) {
                        providers.push({
                            name: provider.name,
                            sdkUrl: s.src.substring(0, 200),
                            detectedVia: 'sdk-script',
                        });
                    }
                }
            }
        });

        return providers;
    });
    result.oauthProviders = oauthData;

    // ═══ 3. JWT Token Analysis ═══
    const cookies = await page.cookies();
    for (const cookie of cookies) {
        if (isJWT(cookie.value)) {
            try {
                const payload = parseJWT(cookie.value);
                result.jwtTokens.push({
                    source: 'cookie',
                    name: cookie.name,
                    payload: sanitizeJWTPayload(payload),
                    expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
                });
            } catch (e) { }
        }
    }

    // Check localStorage/sessionStorage for tokens
    const storageTokens = await page.evaluate(() => {
        const tokens = [];
        for (const storage of [localStorage, sessionStorage]) {
            try {
                for (let i = 0; i < storage.length; i++) {
                    const key = storage.key(i);
                    if (key.toLowerCase().includes('token') || key.toLowerCase().includes('auth') ||
                        key.toLowerCase().includes('session') || key.toLowerCase().includes('user') ||
                        key.toLowerCase().includes('jwt')) {
                        const value = storage.getItem(key);
                        tokens.push({
                            storage: storage === localStorage ? 'localStorage' : 'sessionStorage',
                            key,
                            valuePreview: value?.substring(0, 50) + (value?.length > 50 ? '...' : ''),
                            isJWT: value?.split('.').length === 3 && value?.length > 50,
                        });
                    }
                }
            } catch (e) { }
        }
        return tokens;
    });
    result.sessionStorage = storageTokens;

    // ═══ 4. CSRF Tokens ═══
    const csrfData = await page.evaluate(() => {
        const tokens = [];

        // Meta tags
        const csrfMeta = document.querySelector('meta[name="csrf-token"], meta[name="_csrf"], meta[name="csrf"]');
        if (csrfMeta) {
            tokens.push({ source: 'meta-tag', name: csrfMeta.name, value: csrfMeta.content?.substring(0, 30) + '...' });
        }

        // Hidden form fields
        document.querySelectorAll('input[name*="csrf"], input[name*="_token"], input[name="authenticity_token"]').forEach(el => {
            tokens.push({
                source: 'hidden-field',
                name: el.name,
                value: el.value?.substring(0, 30) + '...',
            });
        });

        return tokens;
    });
    result.csrfTokens = csrfData;

    // ═══ 5. Next.js / Nuxt Auth Data ═══
    const nextAuth = await page.evaluate(() => {
        if (window.__NEXT_DATA__) {
            const props = window.__NEXT_DATA__.props?.pageProps;
            if (props) {
                const authKeys = Object.keys(props).filter(k =>
                    k.toLowerCase().includes('session') || k.toLowerCase().includes('user') ||
                    k.toLowerCase().includes('auth') || k.toLowerCase().includes('account')
                );
                if (authKeys.length > 0) {
                    return {
                        framework: 'Next.js',
                        authKeys,
                        sessionStructure: authKeys.reduce((obj, k) => {
                            const val = props[k];
                            obj[k] = val ? (typeof val === 'object' ? Object.keys(val) : typeof val) : null;
                            return obj;
                        }, {}),
                    };
                }
            }
        }

        if (window.__NUXT__) {
            const state = window.__NUXT__?.state;
            if (state?.auth) {
                return {
                    framework: 'Nuxt',
                    authKeys: Object.keys(state.auth),
                    sessionStructure: Object.keys(state.auth).reduce((obj, k) => {
                        obj[k] = typeof state.auth[k];
                        return obj;
                    }, {}),
                };
            }
        }

        return null;
    });
    result.nextDataAuth = nextAuth;

    return result;
}

/**
 * Inject authentication context (cookies/headers) into page
 */
export async function injectAuth(page, authConfig = {}) {
    const { cookies: cookieList = [], headers = {} } = authConfig;

    // Set cookies
    if (cookieList.length > 0) {
        await page.setCookie(...cookieList.map(c => ({
            name: c.name || c.split('=')[0],
            value: c.value || c.split('=').slice(1).join('='),
            domain: c.domain || new URL(page.url()).hostname,
            path: c.path || '/',
        })));
    }

    // Set extra headers
    if (Object.keys(headers).length > 0) {
        await page.setExtraHTTPHeaders(headers);
    }
}

// ═══ JWT Utilities ═══
function isJWT(value) {
    if (!value || typeof value !== 'string') return false;
    const parts = value.split('.');
    if (parts.length !== 3) return false;
    try {
        JSON.parse(Buffer.from(parts[0], 'base64').toString());
        JSON.parse(Buffer.from(parts[1], 'base64').toString());
        return true;
    } catch (e) {
        return false;
    }
}

function parseJWT(token) {
    const parts = token.split('.');
    return JSON.parse(Buffer.from(parts[1], 'base64').toString());
}

function sanitizeJWTPayload(payload) {
    // Remove sensitive data, keep structure
    const safe = {};
    for (const [key, value] of Object.entries(payload)) {
        if (['sub', 'iss', 'aud', 'exp', 'iat', 'nbf', 'jti', 'scope', 'roles', 'permissions'].includes(key)) {
            safe[key] = value;
        } else if (typeof value === 'string' && value.length > 20) {
            safe[key] = value.substring(0, 10) + '...[REDACTED]';
        } else {
            safe[key] = typeof value;
        }
    }
    return safe;
}
