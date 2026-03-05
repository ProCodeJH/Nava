/**
 * v7.0 Deep WebGL Scene Capture
 * 
 * Injects hooks to capture Three.js / raw WebGL state:
 *  - Shader source code (vertex + fragment)
 *  - Geometry buffer data (positions, normals, UVs)
 *  - Texture data (images, URLs)
 *  - Camera position, FOV, near/far
 *  - Light setup (type, color, intensity, position)
 *  - Scene hierarchy
 *  - Material properties
 */

export function getWebGLCaptureScript() {
    return `
    (function() {
        window.__WEBGL_CAPTURE__ = {
            shaders: [],
            programs: [],
            textures: [],
            buffers: [],
            drawCalls: [],
            canvases: [],
            threeScenes: [],
        };
        const WC = window.__WEBGL_CAPTURE__;

        // ═══ 1. WebGL Context Interception ═══
        const origGetContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(type, attrs) {
            const ctx = origGetContext.call(this, type, attrs);
            if (!ctx) return ctx;
            
            if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
                const canvasInfo = {
                    width: this.width,
                    height: this.height,
                    contextType: type,
                    attributes: attrs,
                    shaders: [],
                    programs: [],
                    textures: [],
                };
                WC.canvases.push(canvasInfo);
                
                // Intercept shader compilation
                const origShaderSource = ctx.shaderSource.bind(ctx);
                ctx.shaderSource = function(shader, source) {
                    const shaderType = ctx.getShaderParameter(shader, ctx.SHADER_TYPE);
                    const shaderInfo = {
                        type: shaderType === ctx.VERTEX_SHADER ? 'vertex' : 'fragment',
                        source: source,
                        length: source.length,
                    };
                    canvasInfo.shaders.push(shaderInfo);
                    WC.shaders.push(shaderInfo);
                    return origShaderSource(shader, source);
                };

                // Intercept program linking
                const origLinkProgram = ctx.linkProgram.bind(ctx);
                ctx.linkProgram = function(program) {
                    canvasInfo.programs.push({
                        timestamp: performance.now(),
                    });
                    WC.programs.push({ timestamp: performance.now() });
                    return origLinkProgram(program);
                };

                // Intercept texture uploads
                const origTexImage2D = ctx.texImage2D.bind(ctx);
                ctx.texImage2D = function(...args) {
                    const texInfo = { timestamp: performance.now() };
                    
                    // Try to capture texture source
                    const lastArg = args[args.length - 1];
                    if (lastArg instanceof HTMLImageElement) {
                        texInfo.source = 'image';
                        texInfo.src = lastArg.src;
                        texInfo.width = lastArg.naturalWidth;
                        texInfo.height = lastArg.naturalHeight;
                    } else if (lastArg instanceof HTMLVideoElement) {
                        texInfo.source = 'video';
                        texInfo.src = lastArg.src;
                    } else if (lastArg instanceof HTMLCanvasElement) {
                        texInfo.source = 'canvas';
                        texInfo.width = lastArg.width;
                        texInfo.height = lastArg.height;
                    } else if (lastArg instanceof ImageData) {
                        texInfo.source = 'imageData';
                        texInfo.width = lastArg.width;
                        texInfo.height = lastArg.height;
                    }
                    
                    canvasInfo.textures.push(texInfo);
                    WC.textures.push(texInfo);
                    return origTexImage2D(...args);
                };

                // Count draw calls
                const origDrawArrays = ctx.drawArrays.bind(ctx);
                ctx.drawArrays = function(mode, first, count) {
                    WC.drawCalls.push({ mode, first, count, type: 'arrays' });
                    return origDrawArrays(mode, first, count);
                };

                const origDrawElements = ctx.drawElements.bind(ctx);
                ctx.drawElements = function(mode, count, type, offset) {
                    WC.drawCalls.push({ mode, count, type: 'elements' });
                    return origDrawElements(mode, count, type, offset);
                };
            }
            return ctx;
        };

        // ═══ 2. Three.js Scene Capture ═══
        const waitForThree = setInterval(() => {
            if (window.THREE) {
                clearInterval(waitForThree);
                captureThreeJS();
            }
        }, 200);
        setTimeout(() => clearInterval(waitForThree), 15000);

        function captureThreeJS() {
            // Intercept scene.add to capture objects
            const origAdd = THREE.Scene.prototype.add;
            THREE.Scene.prototype.add = function(obj) {
                captureObject(obj, WC.threeScenes);
                return origAdd.call(this, obj);
            };

            // Also capture existing scenes by scanning for renderers
            setTimeout(() => {
                // Try to find Three.js renderer instances
                document.querySelectorAll('canvas').forEach(canvas => {
                    try {
                        // Check if canvas has Three.js context
                        const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
                        if (gl) {
                            WC.canvases.forEach(c => {
                                if (c.width === canvas.width && c.height === canvas.height) {
                                    c.hasThreeJS = true;
                                }
                            });
                        }
                    } catch(e) {}
                });
            }, 3000);
        }

        function captureObject(obj, store) {
            if (!obj) return;
            const record = {
                type: obj.type || obj.constructor?.name || 'unknown',
                uuid: obj.uuid,
                name: obj.name || null,
                position: obj.position ? { x: obj.position.x, y: obj.position.y, z: obj.position.z } : null,
                rotation: obj.rotation ? { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z } : null,
                scale: obj.scale ? { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z } : null,
                visible: obj.visible,
            };

            // Camera
            if (obj.isCamera) {
                record.fov = obj.fov;
                record.aspect = obj.aspect;
                record.near = obj.near;
                record.far = obj.far;
                record.zoom = obj.zoom;
            }

            // Light
            if (obj.isLight) {
                record.color = obj.color ? '#' + obj.color.getHexString() : null;
                record.intensity = obj.intensity;
                record.castShadow = obj.castShadow;
                if (obj.isDirectionalLight) record.lightType = 'directional';
                if (obj.isPointLight) { record.lightType = 'point'; record.distance = obj.distance; record.decay = obj.decay; }
                if (obj.isSpotLight) { record.lightType = 'spot'; record.angle = obj.angle; record.penumbra = obj.penumbra; }
                if (obj.isAmbientLight) record.lightType = 'ambient';
                if (obj.isHemisphereLight) { record.lightType = 'hemisphere'; record.groundColor = '#' + (obj.groundColor?.getHexString() || '000000'); }
            }

            // Mesh
            if (obj.isMesh) {
                // Geometry
                if (obj.geometry) {
                    const geo = obj.geometry;
                    record.geometry = {
                        type: geo.type || geo.constructor?.name,
                        parameters: geo.parameters ? { ...geo.parameters } : null,
                        vertexCount: geo.attributes?.position?.count || 0,
                        hasNormals: !!geo.attributes?.normal,
                        hasUVs: !!geo.attributes?.uv,
                        hasIndex: !!geo.index,
                        boundingBox: geo.boundingBox ? {
                            min: { x: geo.boundingBox.min.x, y: geo.boundingBox.min.y, z: geo.boundingBox.min.z },
                            max: { x: geo.boundingBox.max.x, y: geo.boundingBox.max.y, z: geo.boundingBox.max.z },
                        } : null,
                    };
                }

                // Material
                if (obj.material) {
                    const mat = obj.material;
                    record.material = {
                        type: mat.type || mat.constructor?.name,
                        color: mat.color ? '#' + mat.color.getHexString() : null,
                        opacity: mat.opacity,
                        transparent: mat.transparent,
                        wireframe: mat.wireframe,
                        side: mat.side,
                        metalness: mat.metalness,
                        roughness: mat.roughness,
                        emissive: mat.emissive ? '#' + mat.emissive.getHexString() : null,
                        emissiveIntensity: mat.emissiveIntensity,
                        map: mat.map ? { 
                            image: mat.map.image?.src || null,
                            wrapS: mat.map.wrapS,
                            wrapT: mat.map.wrapT,
                        } : null,
                        envMap: !!mat.envMap,
                        normalMap: !!mat.normalMap,
                    };
                }
            }

            // Children
            if (obj.children?.length > 0) {
                record.children = [];
                obj.children.forEach(child => {
                    const childRecord = {};
                    captureObject(child, [childRecord]);
                    if (childRecord.type) record.children.push(childRecord);
                });
            }

            store.push(record);
        }
    })();
    `;
}

/**
 * Extract captured WebGL data from the page
 */
export async function extractWebGLDeepData(page) {
    return await page.evaluate(() => {
        const WC = window.__WEBGL_CAPTURE__;
        if (!WC) return null;

        return {
            canvases: WC.canvases || [],
            shaders: WC.shaders || [],
            programs: WC.programs || [],
            textures: WC.textures || [],
            drawCallCount: WC.drawCalls?.length || 0,
            threeScenes: WC.threeScenes || [],
            stats: {
                canvases: WC.canvases?.length || 0,
                shaders: WC.shaders?.length || 0,
                textures: WC.textures?.length || 0,
                drawCalls: WC.drawCalls?.length || 0,
                threeObjects: WC.threeScenes?.length || 0,
            },
        };
    });
}
