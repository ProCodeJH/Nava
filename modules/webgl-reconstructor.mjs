/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  WebGL Scene Reconstructor v9.0                              ║
 * ║  Full Three.js scene reconstruction from captured data       ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Generate Three.js reconstruction code from captured WebGL data
 */
export function reconstructWebGLScene(webglData) {
    if (!webglData || !webglData.scene) return null;

    const scene = webglData.scene;
    let code = `/**
 * ═══ Three.js Scene Reconstruction (Design-DNA v9.0) ═══
 * Objects: ${scene.objects?.length || 0}
 * Lights: ${scene.lights?.length || 0}
 * Materials: ${scene.materials?.length || 0}
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function initScene(container) {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();
`;

    // Background
    if (scene.background) {
        code += `    scene.background = new THREE.Color(${JSON.stringify(scene.background)});\n`;
    }
    if (scene.fog) {
        code += `    scene.fog = new THREE.Fog(${JSON.stringify(scene.fog.color)}, ${scene.fog.near || 1}, ${scene.fog.far || 1000});\n`;
    }

    // Camera
    const cam = scene.camera || {};
    code += `
    // Camera
    const camera = new THREE.PerspectiveCamera(${cam.fov || 75}, width / height, ${cam.near || 0.1}, ${cam.far || 1000});
    camera.position.set(${cam.position?.[0] || 0}, ${cam.position?.[1] || 5}, ${cam.position?.[2] || 10});
`;
    if (cam.lookAt) {
        code += `    camera.lookAt(${cam.lookAt[0]}, ${cam.lookAt[1]}, ${cam.lookAt[2]});\n`;
    }

    // Controls
    code += `
    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = ${scene.autoRotate ? 'true' : 'false'};
`;

    // Lights
    const lights = scene.lights || [];
    code += `\n    // Lights\n`;
    if (lights.length === 0) {
        code += `    scene.add(new THREE.AmbientLight(0x404040, 0.6));\n`;
        code += `    const dirLight = new THREE.DirectionalLight(0xffffff, 1);\n`;
        code += `    dirLight.position.set(5, 10, 7);\n`;
        code += `    dirLight.castShadow = true;\n`;
        code += `    scene.add(dirLight);\n`;
    } else {
        for (const light of lights) {
            const color = light.color || '0xffffff';
            const intensity = light.intensity || 1;
            const pos = light.position || [0, 5, 5];
            switch (light.type) {
                case 'AmbientLight':
                    code += `    scene.add(new THREE.AmbientLight(${color}, ${intensity}));\n`;
                    break;
                case 'DirectionalLight':
                    code += `    { const l=new THREE.DirectionalLight(${color},${intensity});l.position.set(${pos.join(',')});l.castShadow=true;scene.add(l); }\n`;
                    break;
                case 'PointLight':
                    code += `    { const l=new THREE.PointLight(${color},${intensity},${light.distance || 0},${light.decay || 2});l.position.set(${pos.join(',')});scene.add(l); }\n`;
                    break;
                case 'SpotLight':
                    code += `    { const l=new THREE.SpotLight(${color},${intensity});l.position.set(${pos.join(',')});l.angle=${light.angle || Math.PI / 6};scene.add(l); }\n`;
                    break;
                default:
                    code += `    scene.add(new THREE.AmbientLight(${color}, ${intensity}));\n`;
            }
        }
    }

    // Meshes / Objects
    const objects = scene.objects || [];
    code += `\n    // Objects (${objects.length} captured)\n`;
    for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        const matColor = obj.material?.color || '0x808080';
        const pos = obj.position || [0, 0, 0];
        const scale = obj.scale || [1, 1, 1];

        switch (obj.geometry?.type) {
            case 'BoxGeometry':
                code += `    { const m=new THREE.Mesh(new THREE.BoxGeometry(${obj.geometry.args?.join(',') || '1,1,1'}),new THREE.MeshStandardMaterial({color:${matColor}}));m.position.set(${pos.join(',')});m.scale.set(${scale.join(',')});scene.add(m); }\n`;
                break;
            case 'SphereGeometry':
                code += `    { const m=new THREE.Mesh(new THREE.SphereGeometry(${obj.geometry.args?.join(',') || '1,32,32'}),new THREE.MeshStandardMaterial({color:${matColor}}));m.position.set(${pos.join(',')});scene.add(m); }\n`;
                break;
            case 'PlaneGeometry':
                code += `    { const m=new THREE.Mesh(new THREE.PlaneGeometry(${obj.geometry.args?.join(',') || '10,10'}),new THREE.MeshStandardMaterial({color:${matColor},side:THREE.DoubleSide}));m.position.set(${pos.join(',')});m.rotation.x=-Math.PI/2;m.receiveShadow=true;scene.add(m); }\n`;
                break;
            default:
                code += `    { const m=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:${matColor}}));m.position.set(${pos.join(',')});scene.add(m); }\n`;
        }
    }

    // GLTF models
    if (scene.models?.length > 0) {
        code += `\n    // GLTF/GLB Models\n`;
        code += `    const loader = new GLTFLoader();\n`;
        for (const model of scene.models) {
            code += `    loader.load('${model.url || model.path}', (gltf) => {\n`;
            code += `        const m = gltf.scene;\n`;
            if (model.position) code += `        m.position.set(${model.position.join(',')});\n`;
            if (model.scale) code += `        m.scale.set(${model.scale.join(',')});\n`;
            code += `        scene.add(m);\n`;
            code += `    });\n`;
        }
    }

    // Animation loop
    code += `
    // Animation Loop
    const clock = new THREE.Clock();
    function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        controls.update();
`;

    if (scene.animations?.length > 0) {
        code += `        // Object animations\n`;
        for (const anim of scene.animations) {
            if (anim.type === 'rotation') {
                code += `        // Auto-rotation\n`;
            }
        }
    }

    code += `        renderer.render(scene, camera);
    }
    animate();

    // Responsive
    window.addEventListener('resize', () => {
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    });

    return { scene, camera, renderer, controls };
}
`;

    return {
        code,
        stats: {
            objects: objects.length,
            lights: lights.length,
            models: scene.models?.length || 0,
        },
    };
}

/**
 * Download GLTF/GLB models referenced in the scene
 */
export async function downloadModels(page, webglData, outputDir) {
    const modelsDir = path.join(outputDir, 'assets', 'models');
    await fs.mkdir(modelsDir, { recursive: true });

    const downloaded = [];
    const models = webglData?.scene?.models || [];

    for (const model of models) {
        if (!model.url) continue;
        try {
            const response = await page.goto(model.url, { waitUntil: 'networkidle2', timeout: 15000 });
            if (response) {
                const buffer = await response.buffer();
                const filename = path.basename(new URL(model.url).pathname) || `model-${downloaded.length}.glb`;
                await fs.writeFile(path.join(modelsDir, filename), buffer);
                downloaded.push({ url: model.url, file: filename, size: buffer.length });
            }
        } catch { }
    }

    return downloaded;
}
