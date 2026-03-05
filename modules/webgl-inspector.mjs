/**
 * v5.0 Module: WebGL Inspector — Three.js / Babylon / Spline / A-Frame scene graph extraction
 *
 * Extracts:
 *  - WebGL context capabilities and extensions
 *  - Three.js scene graphs (cameras, lights, meshes, materials, textures)
 *  - Babylon.js engine info
 *  - Spline viewer embeds
 *  - A-Frame entities
 *  - Shader source code (via WebGL proxy)
 *  - Canvas rendering context types
 */

/**
 * Injection script for WebGL shader capture — must be injected BEFORE page load
 */
export function getWebGLInjectionScript() {
    return `
    (function() {
        window.__DNA_WEBGL__ = {
            shaders: [],
            programs: [],
            drawCalls: 0,
            contexts: [],
        };

        // Proxy getContext to detect WebGL usage
        const origGetContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(type, attrs) {
            const ctx = origGetContext.call(this, type, attrs);
            if (ctx && (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl')) {
                window.__DNA_WEBGL__.contexts.push({
                    type,
                    canvas: {
                        width: this.width,
                        height: this.height,
                        id: this.id || null,
                        className: this.className || null,
                    },
                    timestamp: performance.now(),
                });

                // Intercept shader creation
                const origShaderSource = ctx.shaderSource;
                ctx.shaderSource = function(shader, source) {
                    window.__DNA_WEBGL__.shaders.push({
                        type: ctx.getShaderParameter(shader, ctx.SHADER_TYPE) === ctx.VERTEX_SHADER ? 'vertex' : 'fragment',
                        source: source.substring(0, 2000),
                        length: source.length,
                    });
                    return origShaderSource.call(ctx, shader, source);
                };

                // Count draw calls
                const origDrawArrays = ctx.drawArrays;
                ctx.drawArrays = function(...args) {
                    window.__DNA_WEBGL__.drawCalls++;
                    return origDrawArrays.apply(ctx, args);
                };
                const origDrawElements = ctx.drawElements;
                ctx.drawElements = function(...args) {
                    window.__DNA_WEBGL__.drawCalls++;
                    return origDrawElements.apply(ctx, args);
                };
            }
            return ctx;
        };
    })();
    `;
}

/**
 * Main extraction function — call after page has loaded and rendered
 */
export async function inspectWebGL(page) {
    const result = {
        canvases: [],
        webglContexts: [],
        shaders: [],
        drawCalls: 0,
        threejs: null,
        babylon: null,
        spline: [],
        aframe: [],
        r3f: null,
        otherEngines: [],
    };

    // 1. Get injected WebGL data
    const injectedData = await page.evaluate(() => window.__DNA_WEBGL__ || null);
    if (injectedData) {
        result.webglContexts = injectedData.contexts;
        result.shaders = injectedData.shaders.slice(0, 50);
        result.drawCalls = injectedData.drawCalls;
    }

    // 2. Scan all canvas elements
    const canvasData = await page.evaluate(() => {
        const canvases = [];
        document.querySelectorAll('canvas').forEach(c => {
            const rect = c.getBoundingClientRect();
            const ctx2d = (() => { try { return !!c.getContext('2d'); } catch (e) { return false; } })();
            canvases.push({
                id: c.id || null,
                className: c.className?.toString()?.substring(0, 100) || null,
                width: c.width,
                height: c.height,
                displaySize: { width: Math.round(rect.width), height: Math.round(rect.height) },
                position: { x: Math.round(rect.x), y: Math.round(rect.y + window.scrollY) },
                is2D: ctx2d,
                style: {
                    position: getComputedStyle(c).position,
                    zIndex: getComputedStyle(c).zIndex,
                    pointerEvents: getComputedStyle(c).pointerEvents,
                },
                dataAttributes: Array.from(c.attributes)
                    .filter(a => a.name.startsWith('data-'))
                    .reduce((o, a) => { o[a.name] = a.value; return o; }, {}),
            });
        });
        return canvases;
    });
    result.canvases = canvasData;

    // 3. Three.js scene extraction
    const threeData = await page.evaluate(() => {
        if (!window.THREE) return null;
        const data = {
            version: window.THREE.REVISION || 'unknown',
            renderers: [],
            scenes: [],
        };

        // Find renderers
        document.querySelectorAll('canvas').forEach(canvas => {
            const key = Object.keys(canvas).find(k =>
                k.includes('renderer') || k.includes('__r3f') || k.includes('three')
            );
            if (key) {
                data.renderers.push({
                    type: canvas[key]?.constructor?.name || 'WebGLRenderer',
                    canvas: canvas.id || canvas.className?.toString()?.substring(0, 50),
                });
            }
        });

        // Try to access scene via common patterns
        const sceneRefs = [
            window.scene, window.app?.scene, window.viewer?.scene,
            window.experience?.scene, window.world?.scene,
        ].filter(Boolean);

        sceneRefs.forEach(scene => {
            if (scene && typeof scene.traverse === 'function') {
                const sceneData = {
                    children: 0,
                    cameras: [],
                    lights: [],
                    meshes: [],
                    materials: new Set(),
                    textures: 0,
                };

                scene.traverse(obj => {
                    sceneData.children++;

                    if (obj.isCamera) {
                        sceneData.cameras.push({
                            type: obj.isPerspectiveCamera ? 'Perspective' : 'Orthographic',
                            fov: obj.fov,
                            near: obj.near,
                            far: obj.far,
                            position: obj.position ? { x: obj.position.x.toFixed(2), y: obj.position.y.toFixed(2), z: obj.position.z.toFixed(2) } : null,
                        });
                    }
                    if (obj.isLight) {
                        sceneData.lights.push({
                            type: obj.constructor.name,
                            color: obj.color?.getHexString?.() || null,
                            intensity: obj.intensity,
                        });
                    }
                    if (obj.isMesh) {
                        const geo = obj.geometry;
                        const mat = obj.material;
                        sceneData.meshes.push({
                            name: obj.name || obj.uuid?.substring(0, 8),
                            geometry: geo?.constructor?.name || 'unknown',
                            vertices: geo?.attributes?.position?.count || 0,
                            material: mat?.type || mat?.constructor?.name || 'unknown',
                            color: mat?.color?.getHexString?.() || null,
                            opacity: mat?.opacity,
                            transparent: mat?.transparent,
                            visible: obj.visible,
                        });
                        if (mat?.type) sceneData.materials.add(mat.type);
                        if (mat?.map) sceneData.textures++;
                    }
                });

                sceneData.materials = [...sceneData.materials];
                data.scenes.push(sceneData);
            }
        });

        return data;
    });
    result.threejs = threeData;

    // 4. Babylon.js detection
    const babylonData = await page.evaluate(() => {
        if (!window.BABYLON) return null;
        return {
            version: window.BABYLON.Engine?.Version || 'unknown',
            engines: (() => {
                try {
                    const instances = window.BABYLON.Engine?.Instances || [];
                    return instances.map(e => ({
                        fps: e.getFps?.()?.toFixed(0),
                        hardwareScaling: e.getHardwareScalingLevel?.(),
                    }));
                } catch (e) { return []; }
            })(),
        };
    });
    result.babylon = babylonData;

    // 5. Spline viewer detection
    const splineData = await page.evaluate(() => {
        const viewers = [];
        document.querySelectorAll('spline-viewer, [data-spline], iframe[src*="spline"]').forEach(el => {
            const rect = el.getBoundingClientRect();
            viewers.push({
                tag: el.tagName.toLowerCase(),
                url: el.getAttribute('url') || el.src || el.getAttribute('data-spline') || null,
                size: { width: Math.round(rect.width), height: Math.round(rect.height) },
                position: { x: Math.round(rect.x), y: Math.round(rect.y + window.scrollY) },
                loading: el.getAttribute('loading') || null,
            });
        });
        return viewers;
    });
    result.spline = splineData;

    // 6. A-Frame detection
    const aframeData = await page.evaluate(() => {
        if (!document.querySelector('a-scene')) return [];
        const entities = [];
        document.querySelectorAll('a-scene, a-entity, a-box, a-sphere, a-cylinder, a-plane, a-sky, a-light, a-camera').forEach(el => {
            entities.push({
                tag: el.tagName.toLowerCase(),
                position: el.getAttribute('position'),
                rotation: el.getAttribute('rotation'),
                scale: el.getAttribute('scale'),
                material: el.getAttribute('material'),
                geometry: el.getAttribute('geometry'),
                animation: el.getAttribute('animation'),
                components: Array.from(el.attributes)
                    .filter(a => !['position', 'rotation', 'scale', 'id', 'class'].includes(a.name))
                    .map(a => ({ name: a.name, value: a.value.substring(0, 100) }))
                    .slice(0, 20),
            });
        });
        return entities;
    });
    result.aframe = aframeData;

    // 7. React Three Fiber (R3F)
    const r3fData = await page.evaluate(() => {
        const r3fCanvas = document.querySelector('[data-reactroot] canvas, #root canvas, #__next canvas');
        if (!r3fCanvas) return null;

        // Check for R3F fiber
        const fiberKey = Object.keys(r3fCanvas).find(k => k.startsWith('__reactFiber'));
        if (!fiberKey) return null;

        const r3f = { detected: true, components: [] };

        // Walk fiber for R3F components
        function walkR3F(fiber, depth) {
            if (!fiber || depth > 30) return;
            try {
                const type = fiber.type;
                const name = typeof type === 'function' ? (type.displayName || type.name) : type;
                if (name && typeof name === 'string' && /^[a-z]/.test(name) &&
                    ['mesh', 'group', 'ambientLight', 'directionalLight', 'pointLight', 'spotLight',
                        'perspectiveCamera', 'orthographicCamera', 'boxGeometry', 'sphereGeometry',
                        'planeGeometry', 'cylinderGeometry', 'meshStandardMaterial', 'meshBasicMaterial',
                        'meshPhongMaterial', 'environment', 'contactShadows', 'float', 'text3D',
                        'html', 'billboard', 'stars', 'sky', 'cloud'].includes(name)) {
                    const props = fiber.memoizedProps || {};
                    r3f.components.push({
                        type: name,
                        props: Object.keys(props).filter(k => k !== 'children' && typeof props[k] !== 'function')
                            .reduce((o, k) => {
                                try { o[k] = JSON.parse(JSON.stringify(props[k])); } catch (e) { o[k] = String(props[k]).substring(0, 50); }
                                return o;
                            }, {}),
                    });
                }
            } catch (e) { }
            if (fiber.child) walkR3F(fiber.child, depth + 1);
            if (fiber.sibling) walkR3F(fiber.sibling, depth + 1);
        }

        walkR3F(r3fCanvas[fiberKey], 0);
        return r3f;
    });
    result.r3f = r3fData;

    // 8. Other 3D engines
    const otherEngines = await page.evaluate(() => {
        const detected = [];
        if (window.PIXI) detected.push({ name: 'PixiJS', version: window.PIXI.VERSION || '?' });
        if (window.p5) detected.push({ name: 'p5.js', version: window.p5.VERSION || '?' });
        if (window.Phaser) detected.push({ name: 'Phaser', version: window.Phaser.VERSION || '?' });
        if (window.createjs) detected.push({ name: 'CreateJS' });
        if (window.Cesium) detected.push({ name: 'CesiumJS', version: window.Cesium.VERSION || '?' });
        if (window.mapboxgl) detected.push({ name: 'Mapbox GL', version: window.mapboxgl.version || '?' });
        return detected;
    });
    result.otherEngines = otherEngines;

    return result;
}
