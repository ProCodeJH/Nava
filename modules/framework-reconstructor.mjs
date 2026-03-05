/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Framework Reconstructor v10.0                               ║
 * ║  Capture React/Vue/Svelte component trees + state            ║
 * ║  → Reconstruct working components with vanilla JS            ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

/**
 * Injection script to capture React/Vue internals BEFORE page load
 */
export function getFrameworkCaptureScript() {
    return `
    (function() {
        window.__DNA_FRAMEWORK__ = {
            framework: null,
            components: [],
            stateSnapshots: [],
            props: [],
            routes: [],
            store: null,
        };

        // ═══ React DevTools Hook ═══
        if (!window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
            window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
                renderers: new Map(),
                supportsFiber: true,
                inject: function(renderer) {
                    this.renderers.set(this.renderers.size + 1, renderer);
                    return this.renderers.size;
                },
                onCommitFiberRoot: function(id, root) {
                    try { captureReactTree(root); } catch {}
                },
                onCommitFiberUnmount: function() {},
            };
        } else {
            const origOnCommit = window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot;
            window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot = function(id, root) {
                try { captureReactTree(root); } catch {}
                if (origOnCommit) origOnCommit.call(this, id, root);
            };
        }

        function captureReactTree(root) {
            window.__DNA_FRAMEWORK__.framework = 'react';
            const fiber = root?.current;
            if (!fiber) return;
            const tree = walkFiber(fiber, 0);
            window.__DNA_FRAMEWORK__.components = tree;
        }

        function walkFiber(fiber, depth) {
            if (!fiber || depth > 30) return [];
            const components = [];
            const isComponent = fiber.type && typeof fiber.type !== 'string';
            if (isComponent) {
                const name = fiber.type?.displayName || fiber.type?.name || 'Anonymous';
                const comp = { name, depth, children: [] };
                // Capture state
                if (fiber.memoizedState) {
                    comp.state = extractHookState(fiber);
                }
                // Capture props
                if (fiber.memoizedProps) {
                    comp.props = safeSerialize(fiber.memoizedProps);
                }
                // Capture DOM output
                if (fiber.stateNode && fiber.stateNode.outerHTML) {
                    comp.html = fiber.stateNode.outerHTML.substring(0, 5000);
                }
                components.push(comp);
            }
            if (fiber.child) {
                const children = walkFiber(fiber.child, depth + 1);
                if (components.length > 0) {
                    components[components.length - 1].children = children;
                } else {
                    components.push(...children);
                }
            }
            if (fiber.sibling) {
                components.push(...walkFiber(fiber.sibling, depth));
            }
            return components;
        }

        function extractHookState(fiber) {
            const states = [];
            let hook = fiber.memoizedState;
            let i = 0;
            while (hook && i < 20) {
                if (hook.memoizedState !== undefined && hook.queue) {
                    states.push(safeSerialize(hook.memoizedState));
                }
                hook = hook.next;
                i++;
            }
            return states;
        }

        function safeSerialize(obj, depth) {
            depth = depth || 0;
            if (depth > 5) return '[deep]';
            if (obj === null || obj === undefined) return obj;
            if (typeof obj === 'function') return '[fn:' + (obj.name || 'anonymous') + ']';
            if (typeof obj !== 'object') return obj;
            if (obj instanceof HTMLElement) return '[Element:' + obj.tagName + ']';
            if (Array.isArray(obj)) return obj.slice(0, 20).map(v => safeSerialize(v, depth + 1));
            const result = {};
            for (const [key, val] of Object.entries(obj).slice(0, 30)) {
                if (key.startsWith('_') || key === 'children' && typeof val === 'object') continue;
                result[key] = safeSerialize(val, depth + 1);
            }
            return result;
        }

        // ═══ Vue DevTools Hook ═══
        window.__VUE_DEVTOOLS_GLOBAL_HOOK__ = window.__VUE_DEVTOOLS_GLOBAL_HOOK__ || {
            Vue: null,
            apps: [],
            emit: function(event, ...args) {
                if (event === 'app:init') {
                    this.apps.push(args[0]);
                    window.__DNA_FRAMEWORK__.framework = 'vue';
                    try { captureVueTree(args[0]); } catch {}
                }
            },
            on: function() {},
            once: function() {},
        };

        function captureVueTree(app) {
            if (!app?._instance) return;
            window.__DNA_FRAMEWORK__.components = walkVueTree(app._instance, 0);
        }

        function walkVueTree(instance, depth) {
            if (!instance || depth > 30) return [];
            const components = [];
            const comp = {
                name: instance.type?.name || instance.type?.__name || 'Component',
                depth,
                props: safeSerialize(instance.props),
                data: safeSerialize(instance.setupState || instance.data),
                children: [],
            };
            // DOM output
            if (instance.subTree?.el) {
                comp.html = (instance.subTree.el.outerHTML || '').substring(0, 5000);
            }
            components.push(comp);
            // Walk children
            const children = instance.subTree?.children || [];
            if (Array.isArray(children)) {
                for (const child of children) {
                    if (child?.component) {
                        comp.children.push(...walkVueTree(child.component, depth + 1));
                    }
                }
            }
            return components;
        }

        // ═══ Route capture ═══
        const origPushState = history.pushState;
        const origReplaceState = history.replaceState;
        history.pushState = function() {
            origPushState.apply(this, arguments);
            window.__DNA_FRAMEWORK__.routes.push({ path: location.pathname, ts: Date.now() });
        };
        history.replaceState = function() {
            origReplaceState.apply(this, arguments);
            window.__DNA_FRAMEWORK__.routes.push({ path: location.pathname, ts: Date.now(), replace: true });
        };
        window.addEventListener('popstate', () => {
            window.__DNA_FRAMEWORK__.routes.push({ path: location.pathname, ts: Date.now(), pop: true });
        });

        // ═══ Redux/Zustand/Pinia store capture ═══
        const origReduxCreateStore = window.createStore;
        Object.defineProperty(window, '__REDUX_DEVTOOLS_EXTENSION__', {
            get: () => function(createStore) {
                return function(reducer, preloadedState, enhancer) {
                    const store = createStore(reducer, preloadedState, enhancer);
                    window.__DNA_FRAMEWORK__.store = {
                        type: 'redux',
                        state: safeSerialize(store.getState()),
                    };
                    store.subscribe(() => {
                        window.__DNA_FRAMEWORK__.store.state = safeSerialize(store.getState());
                    });
                    return store;
                };
            }
        });
    })();
    `;
}

/**
 * Extract captured framework data from the page
 */
export async function extractFrameworkData(page) {
    return await page.evaluate(() => {
        const data = window.__DNA_FRAMEWORK__ || {};

        // Additional detection via DOM
        const root = document.getElementById('root') || document.getElementById('app') || document.getElementById('__next');
        if (root) {
            // Check React fiber
            const fiberKey = Object.keys(root).find(k => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'));
            if (fiberKey && !data.framework) data.framework = 'react';

            // Check Vue
            if (root.__vue_app__) {
                data.framework = 'vue';
            }

            // Check Next.js
            if (window.__NEXT_DATA__) {
                data.framework = 'nextjs';
                data.nextData = {
                    buildId: window.__NEXT_DATA__.buildId,
                    page: window.__NEXT_DATA__.page,
                    props: JSON.stringify(window.__NEXT_DATA__.props || {}).substring(0, 10000),
                    runtimeConfig: window.__NEXT_DATA__.runtimeConfig,
                };
            }

            // Check Nuxt
            if (window.__NUXT__) {
                data.framework = 'nuxt';
                data.nuxtData = {
                    state: JSON.stringify(window.__NUXT__.state || {}).substring(0, 10000),
                    serverRendered: window.__NUXT__.serverRendered,
                };
            }
        }

        // Detect Angular
        if (document.querySelector('[ng-version]') || document.querySelector('[_nghost]')) {
            data.framework = 'angular';
        }

        // Detect Svelte
        if (document.querySelector('[class*="svelte-"]')) {
            data.framework = 'svelte';
        }

        data.stats = {
            framework: data.framework || 'unknown',
            componentsFound: data.components?.length || 0,
            routesCaptured: data.routes?.length || 0,
            hasStore: !!data.store,
        };

        return data;
    });
}

/**
 * Generate vanilla JS that reconstructs the framework behavior
 */
export function generateFrameworkCode(frameworkData) {
    if (!frameworkData?.components?.length) return null;

    let code = `/**\n * Framework Reconstructor — Design-DNA v10.0\n * Original: ${frameworkData.framework}\n * Components: ${frameworkData.stats.componentsFound}\n */\n\n`;

    // State management
    code += `// ═══ Reactive State Store ═══\n`;
    code += `const Store = {\n`;
    code += `    _state: ${JSON.stringify(frameworkData.store?.state || {}, null, 2)},\n`;
    code += `    _listeners: [],\n`;
    code += `    getState() { return this._state; },\n`;
    code += `    setState(partial) {\n`;
    code += `        Object.assign(this._state, typeof partial === 'function' ? partial(this._state) : partial);\n`;
    code += `        this._listeners.forEach(fn => fn(this._state));\n`;
    code += `    },\n`;
    code += `    subscribe(fn) { this._listeners.push(fn); return () => { this._listeners = this._listeners.filter(l => l !== fn); }; },\n`;
    code += `};\n\n`;

    // Router
    if (frameworkData.routes?.length > 0) {
        code += `// ═══ Client-Side Router ═══\n`;
        code += `const Router = {\n`;
        code += `    routes: ${JSON.stringify(frameworkData.routes.map(r => r.path))},\n`;
        code += `    currentPath: location.pathname,\n`;
        code += `    navigate(path) {\n`;
        code += `        history.pushState(null, '', path);\n`;
        code += `        this.currentPath = path;\n`;
        code += `        document.querySelectorAll('[data-route]').forEach(el => {\n`;
        code += `            el.style.display = el.dataset.route === path ? '' : 'none';\n`;
        code += `        });\n`;
        code += `    },\n`;
        code += `    init() {\n`;
        code += `        document.querySelectorAll('[href]').forEach(a => {\n`;
        code += `            if (a.href.startsWith(location.origin)) {\n`;
        code += `                a.addEventListener('click', e => { e.preventDefault(); this.navigate(new URL(a.href).pathname); });\n`;
        code += `            }\n`;
        code += `        });\n`;
        code += `        window.addEventListener('popstate', () => this.navigate(location.pathname));\n`;
        code += `    },\n`;
        code += `};\nRouter.init();\n\n`;
    }

    // Component reconstruction
    code += `// ═══ Component State Bindings ═══\n`;
    for (const comp of frameworkData.components.slice(0, 50)) {
        if (comp.state?.length > 0) {
            const safeName = comp.name.replace(/[^a-zA-Z0-9]/g, '_');
            code += `// ${comp.name}\n`;
            code += `Store.setState({ ${safeName}: ${JSON.stringify(comp.state[0])} });\n`;
        }
    }

    return code;
}
