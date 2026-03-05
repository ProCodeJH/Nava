/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Stealth Browser v10.0                                       ║
 * ║  Bypass Cloudflare, reCAPTCHA, bot detection                 ║
 * ║  Undetectable browser fingerprint                            ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

/**
 * Create a stealth-configured Puppeteer browser instance
 */
export async function createStealthBrowser(options = {}) {
    let puppeteer;
    let useExtra = false;

    // Try puppeteer-extra with stealth plugin first
    try {
        const pExtra = await import('puppeteer-extra');
        const StealthPlugin = await import('puppeteer-extra-plugin-stealth');
        pExtra.default.use(StealthPlugin.default());
        puppeteer = pExtra.default;
        useExtra = true;
    } catch {
        // Fall back to standard puppeteer with manual stealth
        puppeteer = (await import('puppeteer')).default;
    }

    const args = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--start-maximized',
        // Anti-detection
        '--disable-web-security',
        '--allow-running-insecure-content',
        '--disable-features=TranslateUI',
        '--lang=ko-KR,ko,en-US,en',
    ];

    if (options.proxy) {
        args.push(`--proxy-server=${options.proxy}`);
    }

    const browser = await puppeteer.launch({
        headless: options.headless !== false ? 'new' : false,
        args,
        ignoreDefaultArgs: ['--enable-automation'],
        defaultViewport: null,
    });

    return { browser, stealth: useExtra ? 'puppeteer-extra' : 'manual' };
}

/**
 * Apply stealth patches to a page (when not using puppeteer-extra)
 */
export async function applyStealthPatches(page) {
    // Override navigator.webdriver
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });

        // Override chrome runtime
        window.chrome = {
            runtime: { connect: () => { }, sendMessage: () => { }, },
            loadTimes: () => ({
                requestTime: Date.now() / 1000,
                startLoadTime: Date.now() / 1000,
                commitLoadTime: Date.now() / 1000,
                finishDocumentLoadTime: Date.now() / 1000,
                finishLoadTime: Date.now() / 1000,
                firstPaintTime: Date.now() / 1000,
                firstPaintAfterLoadTime: 0,
                navigationType: 'Other',
                wasFetchedViaSpdy: false,
                wasNpnNegotiated: true,
                npnNegotiatedProtocol: 'h2',
                wasAlternateProtocolAvailable: false,
                connectionInfo: 'h2',
            }),
            csi: () => ({ pageT: Date.now(), startE: Date.now(), onloadT: Date.now() }),
        };

        // Override permissions
        const origQuery = window.navigator.permissions?.query?.bind(navigator.permissions);
        if (origQuery) {
            window.navigator.permissions.query = (params) => {
                if (params.name === 'notifications') {
                    return Promise.resolve({ state: Notification.permission });
                }
                return origQuery(params);
            };
        }

        // Override plugins
        Object.defineProperty(navigator, 'plugins', {
            get: () => {
                return [
                    { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
                    { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
                    { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
                ];
            },
        });

        // Override languages
        Object.defineProperty(navigator, 'languages', {
            get: () => ['ko-KR', 'ko', 'en-US', 'en'],
        });

        // Override platform
        Object.defineProperty(navigator, 'platform', {
            get: () => 'Win32',
        });

        // Override hardware concurrency
        Object.defineProperty(navigator, 'hardwareConcurrency', {
            get: () => 8,
        });

        // Override device memory
        Object.defineProperty(navigator, 'deviceMemory', {
            get: () => 8,
        });

        // WebGL fingerprint randomization
        const origGetParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function (param) {
            if (param === 37445) return 'Intel Inc.'; // UNMASKED_VENDOR_WEBGL
            if (param === 37446) return 'Intel Iris OpenGL Engine'; // UNMASKED_RENDERER_WEBGL
            return origGetParameter.call(this, param);
        };

        // Canvas fingerprint noise
        const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function (type) {
            if (this.width > 16 && this.height > 16) {
                const ctx = this.getContext('2d');
                if (ctx) {
                    const imageData = ctx.getImageData(0, 0, 1, 1);
                    imageData.data[0] = imageData.data[0] ^ 1; // Minimal noise
                    ctx.putImageData(imageData, 0, 0);
                }
            }
            return origToDataURL.apply(this, arguments);
        };
    });

    // Set realistic user agent
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );

    // Set extra HTTP headers
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
    });
}

/**
 * Wait for Cloudflare challenge to complete (if present)
 */
export async function bypassCloudflare(page, timeout = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const isCF = await page.evaluate(() => {
            return document.title?.includes('Just a moment') ||
                document.title?.includes('Checking') ||
                document.querySelector('#challenge-running') !== null ||
                document.querySelector('.cf-browser-verification') !== null;
        });
        if (!isCF) return true;
        await new Promise(r => setTimeout(r, 2000));
    }
    return false;
}

/**
 * Human-like mouse movements and scrolling
 */
export async function humanBehavior(page) {
    // Random mouse movements
    for (let i = 0; i < 3; i++) {
        const x = 200 + Math.random() * 1200;
        const y = 200 + Math.random() * 600;
        await page.mouse.move(x, y, { steps: 10 + Math.floor(Math.random() * 20) });
        await new Promise(r => setTimeout(r, 100 + Math.random() * 300));
    }

    // Scroll down naturally
    await page.evaluate(async () => {
        const delay = ms => new Promise(r => setTimeout(r, ms));
        for (let i = 0; i < 3; i++) {
            window.scrollBy(0, 200 + Math.random() * 400);
            await delay(500 + Math.random() * 1000);
        }
        window.scrollTo(0, 0);
    });
}

/**
 * Complete stealth page setup
 */
export async function setupStealthPage(browser, url, options = {}) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await applyStealthPatches(page);

    // Navigate
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Handle Cloudflare
    const passed = await bypassCloudflare(page, options.cfTimeout || 30000);
    if (!passed) {
        console.warn('  ⚠ Cloudflare challenge may not have been resolved');
    }

    // Simulate human behavior
    await humanBehavior(page);

    return page;
}
