/**
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║   IMAGE-TO-CODE v2.0 — Ultra-Premium Code Generation Engine         ║
 * ║                                                                      ║
 * ║   지원 출력 라이브러리:                                               ║
 * ║   ┌─ 3D/WebGL ─────────────────────────────────────────────┐        ║
 * ║   │  Three.js / React Three Fiber (R3F) / WebGPU           │        ║
 * ║   ├─ Animation ────────────────────────────────────────────┤        ║
 * ║   │  GSAP + ScrollTrigger / Motion (framer-motion)         │        ║
 * ║   │  React Spring / Lottie (airbnb) / Theatre.js           │        ║
 * ║   ├─ Scroll ───────────────────────────────────────────────┤        ║
 * ║   │  Lenis (smooth scroll) / ScrollTrigger                 │        ║
 * ║   ├─ Framework ────────────────────────────────────────────┤        ║
 * ║   │  React + JSX / Vue 3 SFC / Svelte / HTML               │        ║
 * ║   ├─ Styling ──────────────────────────────────────────────┤        ║
 * ║   │  Tailwind CSS / CSS Modules / Styled Components        │        ║
 * ║   └───────────────────────────────────────────────────────-┘        ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 */

import fs from 'fs/promises';
import path from 'path';

// ═══════════════════════════════════════════════════════════════
// SECTION 1: AI Vision Analysis — 초정밀 UI 분석 프롬프트
// ═══════════════════════════════════════════════════════════════

const ANALYSIS_PROMPT = `You are the world's best UI reverse-engineer. Analyze this screenshot with extreme precision.

## MANDATORY OUTPUT (JSON only, no markdown wrapping)

{
  "layout": {
    "type": "flex|grid|absolute|mixed",
    "direction": "column|row",
    "sections": [
      {
        "id": "section-0",
        "tag": "header|hero|features|testimonials|pricing|cta|footer|sidebar|modal|drawer",
        "layout": { "type": "flex|grid", "direction": "row|column", "gap": "px", "padding": "px", "align": "start|center|end|stretch", "justify": "start|center|between|around|evenly" },
        "background": { "type": "solid|gradient|image|video|3d", "value": "#hex or gradient-css", "blur": false, "overlay": null },
        "position": { "x": "%", "y": "%", "width": "%", "height": "%" },
        "children": ["component-ids"]
      }
    ]
  },

  "components": [
    {
      "id": "comp-0",
      "type": "heading|text|button|card|image|icon|input|nav|badge|avatar|divider|accordion|tab|carousel|modal|dropdown|table|video|3d-scene|particle|floating-element|marquee|counter|progress|tooltip|toast",
      "position": { "x": "%", "y": "%", "width": "%", "height": "%" },
      "content": { "text": "", "level": "h1-h6", "src": "", "alt": "" },
      "style": {
        "fontSize": "px", "fontWeight": "100-900", "fontFamily": "",
        "color": "#hex", "backgroundColor": "#hex",
        "borderRadius": "px", "border": "",
        "padding": "px", "margin": "px",
        "boxShadow": "", "opacity": 0-1,
        "transform": "", "filter": ""
      },
      "animation": {
        "type": "none|fade|slide|scale|rotate|float|pulse|bounce|parallax|scroll-reveal|morph|typewriter|counter|marquee|3d-rotate|particle-burst|magnetic|elastic|stagger",
        "trigger": "load|scroll|hover|click|viewport",
        "direction": "up|down|left|right",
        "duration": "s", "delay": "s", "easing": "ease|spring|bounce",
        "spring": { "stiffness": 0, "damping": 0, "mass": 0 },
        "scroll": { "start": "top bottom", "end": "bottom top", "scrub": true, "pin": false }
      },
      "interaction": {
        "hover": { "scale": 1, "rotate": 0, "shadow": "", "color": "", "background": "" },
        "click": { "action": "", "animation": "" },
        "drag": false, "magnetic": false, "cursor": ""
      },
      "is3D": false,
      "lottieData": null,
      "particleConfig": null
    }
  ],

  "designTokens": {
    "colors": { "primary": "#", "secondary": "#", "accent": "#", "background": "#", "surface": "#", "text": "#", "textSecondary": "#", "border": "#", "success": "#", "error": "#", "warning": "#" },
    "typography": {
      "fontFamilies": [""],
      "scale": { "xs": "px", "sm": "px", "base": "px", "lg": "px", "xl": "px", "2xl": "px", "3xl": "px", "4xl": "px", "5xl": "px" },
      "weights": [300, 400, 500, 600, 700, 800],
      "lineHeights": { "tight": 1.2, "normal": 1.5, "relaxed": 1.75 }
    },
    "spacing": { "unit": 4, "scale": [0,1,2,3,4,5,6,8,10,12,16,20,24,32,40,48,64] },
    "borderRadius": { "none": "0", "sm": "px", "md": "px", "lg": "px", "xl": "px", "full": "9999px" },
    "shadows": { "sm": "", "md": "", "lg": "", "xl": "" },
    "breakpoints": { "sm": 640, "md": 768, "lg": 1024, "xl": 1280, "2xl": 1536 }
  },

  "animations": [
    {
      "id": "anim-0",
      "targetComponent": "comp-id",
      "library": "gsap|motion|react-spring|lottie|theatre|css|r3f|lenis",
      "type": "entrance|scroll|hover|continuous|interactive|3d|particle",
      "config": {},
      "description": ""
    }
  ],

  "scrollEffects": [
    {
      "type": "parallax|pin|reveal|progress|horizontal-scroll|smooth-scroll",
      "sections": ["section-ids"],
      "config": {}
    }
  ],

  "threeDElements": [
    {
      "type": "scene|model|particles|geometry|shader|environment",
      "position": "background|inline|hero|floating",
      "config": {}
    }
  ],

  "globalEffects": {
    "smoothScroll": false,
    "cursorEffect": "none|dot|magnetic|trail|blend",
    "pageTransition": "none|fade|slide|morph",
    "loadingAnimation": "none|progress|skeleton|lottie",
    "darkMode": false,
    "noise": false,
    "grain": false
  },

  "responsive": {
    "currentBreakpoint": "mobile|tablet|desktop|wide",
    "adaptations": {
      "mobile": { "stackedSections": [], "hiddenComponents": [], "reducedAnimations": true },
      "tablet": {},
      "desktop": {}
    }
  }
}

CRITICAL RULES:
- Every animation MUST specify which library to use
- Detect 3D elements, particles, floating objects → assign Three.js/R3F
- Detect scroll animations → assign GSAP ScrollTrigger + Lenis
- Detect micro-interactions (hover, click) → assign Motion (framer-motion)
- Detect spring physics → assign React Spring
- Detect complex timeline animations → assign Theatre.js
- Detect icon/illustration animations → assign Lottie
- Detect parallax → assign GSAP ScrollTrigger
- Be EXTREMELY precise with colors (exact hex), sizes (exact px), spacing
- Output ONLY the JSON, no explanation`;

// ═══════════════════════════════════════════════════════════════
// SECTION 2: Code Generators — 라이브러리별 코드 생성
// ═══════════════════════════════════════════════════════════════

/**
 * GSAP + ScrollTrigger 코드 생성
 */
function generateGSAPCode(animations) {
  const gsapAnims = animations.filter(a => a.library === 'gsap');
  if (gsapAnims.length === 0) return null;

  let code = `import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initAnimations() {
`;

  for (const anim of gsapAnims) {
    const target = `[data-anim="${anim.id}"]`;
    
    if (anim.type === 'entrance') {
      // Use analysis config.from/to if available, fallback to direction-based
      if (anim.config?.from && anim.config?.to) {
        const fromStr = JSON.stringify(anim.config.from);
        const toObj = { ...anim.config.to };
        const duration = toObj.duration || 1;
        const delay = toObj.delay || 0;
        const ease = toObj.ease || 'power3.out';
        delete toObj.duration; delete toObj.delay; delete toObj.ease;
        code += `
  // ${anim.description || 'Entrance animation'}
  gsap.fromTo('${target}', ${fromStr}, {
    ...${JSON.stringify(toObj)},
    duration: ${duration},
    delay: ${delay},
    ease: '${ease}',
    scrollTrigger: {
      trigger: '${target}',
      start: '${anim.config?.scroll?.start || 'top 85%'}',
      toggleActions: 'play none none reverse',
    }
  });
`;
      } else {
        const dir = anim.config?.direction || 'up';
        const from = dir === 'up' ? { y: 80, opacity: 0 } :
                     dir === 'down' ? { y: -80, opacity: 0 } :
                     dir === 'left' ? { x: -80, opacity: 0 } :
                     { x: 80, opacity: 0 };
        code += `
  // ${anim.description || 'Entrance animation'}
  gsap.from('${target}', {
    ...${JSON.stringify(from)},
    duration: ${anim.config?.duration || 1},
    delay: ${anim.config?.delay || 0},
    ease: '${anim.config?.easing || anim.config?.ease || 'power3.out'}',
    scrollTrigger: {
      trigger: '${target}',
      start: '${anim.config?.scroll?.start || 'top 85%'}',
      toggleActions: 'play none none reverse',
    }
  });
`;
      }
    } else if (anim.type === 'scroll') {
      code += `
  // ${anim.description || 'Scroll animation'}
  gsap.to('${target}', {
    ...${JSON.stringify(anim.config?.to || {})},
    scrollTrigger: {
      trigger: '${target}',
      start: '${anim.config?.scroll?.start || 'top bottom'}',
      end: '${anim.config?.scroll?.end || 'bottom top'}',
      scrub: ${anim.config?.scroll?.scrub ?? true},
      ${anim.config?.scroll?.pin ? 'pin: true,' : ''}
    }
  });
`;
    } else if (anim.type === 'continuous') {
      code += `
  // ${anim.description || 'Continuous animation'}
  gsap.to('${target}', {
    ...${JSON.stringify(anim.config?.to || { y: -10 })},
    duration: ${anim.config?.duration || 2},
    repeat: -1,
    yoyo: true,
    ease: '${anim.config?.easing || 'sine.inOut'}',
  });
`;
    } else if (anim.type === 'stagger') {
      code += `
  // ${anim.description || 'Stagger animation'}
  gsap.from('${target}', {
    ...${JSON.stringify(anim.config?.from || { y: 40, opacity: 0 })},
    duration: ${anim.config?.duration || 0.8},
    stagger: ${anim.config?.stagger || 0.1},
    ease: '${anim.config?.easing || 'power2.out'}',
    scrollTrigger: {
      trigger: '${target}',
      start: '${anim.config?.scroll?.start || 'top 80%'}',
      toggleActions: 'play none none reverse',
    }
  });
`;
    } else if (anim.type === 'parallax') {
      code += `
  // ${anim.description || 'Parallax effect'}
  gsap.to('${target}', {
    y: ${anim.config?.y || '-30%'},
    ease: 'none',
    scrollTrigger: {
      trigger: '${target}',
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
    }
  });
`;
    }
  }

  code += `}\n`;
  return code;
}

/**
 * Motion (framer-motion) React 컴포넌트 래퍼 생성
 */
function generateMotionCode(animations) {
  const motionAnims = animations.filter(a => a.library === 'motion');
  if (motionAnims.length === 0) return null;

  let code = `import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'motion/react';

// Motion variants for reusable animations
export const variants = {
`;

  for (const anim of motionAnims) {
    if (anim.type === 'entrance') {
      const dir = anim.config?.direction || 'up';
      code += `  '${anim.id}': {
    hidden: { opacity: 0, ${dir === 'up' ? 'y: 60' : dir === 'down' ? 'y: -60' : dir === 'left' ? 'x: -60' : 'x: 60'} },
    visible: {
      opacity: 1, ${dir === 'up' || dir === 'down' ? 'y: 0' : 'x: 0'},
      transition: {
        type: '${anim.config?.spring ? 'spring' : 'tween'}',
        ${anim.config?.spring ? `stiffness: ${anim.config.spring.stiffness || 100}, damping: ${anim.config.spring.damping || 15},` : `duration: ${anim.config?.duration || 0.6}, ease: [0.25, 0.46, 0.45, 0.94],`}
        delay: ${anim.config?.delay || 0},
      }
    }
  },
`;
    } else if (anim.type === 'hover') {
      code += `  '${anim.id}': {
    rest: { scale: 1` + (anim.config?.shadow ? `, boxShadow: '${anim.config.shadow}'` : '') + ` },
    hover: {
      scale: ${anim.config?.scale || 1.05},
      ` + (anim.config?.rotate ? `rotate: ${anim.config.rotate},` : '') + `
      ` + (anim.config?.shadow ? `boxShadow: '` + (anim.config.hoverShadow || '0 20px 40px rgba(0,0,0,0.15)') + `',` : '') + `
      transition: { type: 'spring', stiffness: 300, damping: 20 }
    }
  },
`;
    }
  }

  code += `};

// Scroll-linked animation hook
export function useScrollAnimation(ref) {
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start']
  });
  
  const y = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 0.8]);
  const springY = useSpring(y, { stiffness: 100, damping: 30 });
  
  return { y: springY, opacity, scale };
}

// Stagger container
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

// Magnetic cursor effect
export function useMagnetic(ref, strength = 0.3) {
  const handleMouseMove = (e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left - rect.width / 2) * strength;
    const y = (e.clientY - rect.top - rect.height / 2) * strength;
    ref.current.style.transform = \`translate(\${x}px, \${y}px)\`;
  };
  const handleMouseLeave = () => {
    if (ref.current) ref.current.style.transform = 'translate(0, 0)';
  };
  return { onMouseMove: handleMouseMove, onMouseLeave: handleMouseLeave };
}
`;
  return code;
}

/**
 * React Spring 물리 애니메이션 코드
 */
function generateReactSpringCode(animations) {
  const springAnims = animations.filter(a => a.library === 'react-spring');
  if (springAnims.length === 0) return null;

  return `import { useSpring, useSprings, useTrail, animated, config } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';

// Spring presets
export const springPresets = {
  gentle: { tension: 120, friction: 14 },
  wobbly: { tension: 180, friction: 12 },
  stiff: { tension: 210, friction: 20 },
  slow: { tension: 280, friction: 60 },
  molasses: { tension: 280, friction: 120 },
};

// Draggable component hook
export function useDraggable() {
  const [{ x, y }, api] = useSpring(() => ({ x: 0, y: 0 }));
  const bind = useDrag(({ down, movement: [mx, my] }) => {
    api.start({ x: down ? mx : 0, y: down ? my : 0, immediate: down });
  });
  return { x, y, bind };
}

// Trail animation for lists
export function useStaggeredEntrance(items, isVisible) {
  return useTrail(items.length, {
    opacity: isVisible ? 1 : 0,
    y: isVisible ? 0 : 40,
    config: springPresets.gentle,
  });
}

// Number counter animation
export function useAnimatedNumber(target) {
  const { number } = useSpring({
    number: target,
    from: { number: 0 },
    config: { mass: 1, tension: 20, friction: 10 },
  });
  return number;
}
`;
}

/**
 * Three.js / React Three Fiber (R3F) 3D 씬 코드 — analysis 기반 커스터마이징
 */
function generateR3FCode(threeDElements, analysis) {
  if (!threeDElements || threeDElements.length === 0) return null;

  // Extract particle config and colors from analysis
  const particleComp = analysis?.components?.find(c => c.type === 'particle');
  const pc = particleComp?.particleConfig || {};
  const sceneComp = analysis?.components?.find(c => c.type === '3d-scene');
  const primaryColor = analysis?.designTokens?.colors?.primary || '#4F46E5';
  const accentColor = analysis?.designTokens?.colors?.accent || '#36a1f5';
  const secondaryColor = analysis?.designTokens?.colors?.secondary || '#7C3AED';
  const defaultCount = pc.count || 5000;
  const defaultParticleColor = pc.color?.[0] || primaryColor;
  const textParticlesDefault = pc.textValue ? JSON.stringify(pc.textValue) : 'null';
  const opMin = pc.opacity?.min || 0.1;
  const opMax = pc.opacity?.max || 0.6;

  return `import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  Environment, Float, Stars, Sparkles, Text, 
  MeshDistortMaterial, MeshWobbleMaterial,
  OrbitControls, PerspectiveCamera,
  useTexture, Preload, Html
} from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useRef, useMemo, useState } from 'react';

// Floating 3D particles background
export function ParticleField({ count = 5000, color = '#4F46E5', textParticles = null }) {
  const mesh = useRef();
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    return pos;
  }, [count]);

  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.x = state.clock.elapsedTime * 0.05;
      mesh.current.rotation.y = state.clock.elapsedTime * 0.08;
    }
  });

  return (
    <group>
      <points ref={mesh}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.05} color={color} transparent opacity={0.6} sizeAttenuation />
      </points>
      {textParticles && <CodeParticles texts={textParticles} color={color} />}
    </group>
  );
}

// Morphing blob
export function MorphBlob({ color = '#4F46E5', speed = 2, distort = 0.4 }) {
  return (
    <Float speed={speed} rotationIntensity={1.5} floatIntensity={2}>
      <mesh scale={2.5}>
        <sphereGeometry args={[1, 64, 64]} />
        <MeshDistortMaterial color={color} distort={distort} speed={3} roughness={0.2} metalness={0.8} />
      </mesh>
    </Float>
  );
}

// Interactive globe with glow
export function Globe({ radius = 2, color = '#4F46E5' }) {
  const meshRef = useRef();
  const glowRef = useRef();
  useFrame((state) => {
    if (meshRef.current) meshRef.current.rotation.y = state.clock.elapsedTime * 0.15;
    if (glowRef.current) glowRef.current.rotation.y = state.clock.elapsedTime * -0.08;
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial color={color} wireframe transparent opacity={0.3} />
      </mesh>
      <mesh ref={glowRef} scale={radius * 1.05}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} />
      </mesh>
      <Sparkles count={200} scale={radius * 3} size={2} speed={0.4} color={color} opacity={0.5} />
    </group>
  );
}

// Gradient plane (hero background)
export function GradientPlane({ colors = ['#4F46E5', '#7C3AED', '#EC4899'] }) {
  const materialRef = useRef();
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor1: { value: new THREE.Color(colors[0]) },
    uColor2: { value: new THREE.Color(colors[1]) },
    uColor3: { value: new THREE.Color(colors[2]) },
  }), []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
      <planeGeometry args={[50, 50, 32, 32]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={\`
          varying vec2 vUv;
          uniform float uTime;
          void main() {
            vUv = uv;
            vec3 pos = position;
            pos.z += sin(pos.x * 2.0 + uTime) * 0.3 + cos(pos.y * 2.0 + uTime * 0.5) * 0.3;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        \`}
        fragmentShader={\`
          varying vec2 vUv;
          uniform vec3 uColor1;
          uniform vec3 uColor2;
          uniform vec3 uColor3;
          uniform float uTime;
          void main() {
            vec3 color = mix(uColor1, uColor2, vUv.x + sin(uTime * 0.5) * 0.2);
            color = mix(color, uColor3, vUv.y + cos(uTime * 0.3) * 0.2);
            gl_FragColor = vec4(color, 0.8);
          }
        \`}
        transparent
      />
    </mesh>
  );
}


// Code snippet text particles floating in 3D
export function CodeParticles({ texts = ['const', 'let', '=>', '<div>'], count = 30, color = '#36a1f5' }) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      text: texts[i % texts.length],
      position: [(Math.random() - 0.5) * 20, (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 10],
      speed: 0.2 + Math.random() * 0.5,
      offset: Math.random() * Math.PI * 2,
      scale: 0.1 + Math.random() * 0.3,
      opacity: 0.1 + Math.random() * 0.5,
    }));
  }, [texts, count]);

  return (
    <group>
      {particles.map((p, i) => (
        <FloatingText key={i} {...p} color={color} />
      ))}
    </group>
  );
}

function FloatingText({ text, position, speed, offset, scale, opacity, color }) {
  const ref = useRef();
  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * speed + offset) * 1.5;
      ref.current.position.x = position[0] + Math.cos(state.clock.elapsedTime * speed * 0.7 + offset) * 0.5;
    }
  });

  return (
    <Text
      ref={ref}
      position={position}
      fontSize={scale}
      color={color}
      anchorX="center"
      anchorY="middle"
      fillOpacity={opacity}
    >
      {text}
    </Text>
  );
}

// Orbiting code ribbons
export function OrbitRibbons({ count = 3, radius = 3.5, color = '#36a1f5' }) {
  return (
    <group>
      {Array.from({ length: count }, (_, i) => (
        <OrbitRibbon key={i} index={i} total={count} radius={radius} color={color} />
      ))}
    </group>
  );
}

function OrbitRibbon({ index, total, radius, color }) {
  const ref = useRef();
  const angle = (index / total) * Math.PI * 2;
  
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.3 + angle;
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2 + angle) * 0.3;
    }
  });

  return (
    <group ref={ref}>
      <mesh>
        <torusGeometry args={[radius, 0.02, 8, 100]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}


// Complete 3D scene wrapper
export function Scene3D({ children, effects = true }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <Environment preset="city" />
      {children}
      {effects && (
        <EffectComposer>
          <Bloom intensity={0.5} luminanceThreshold={0.8} />
          <Noise opacity={0.02} />
        </EffectComposer>
      )}
      <Preload all />
    </Canvas>
  );
}
`;
}

/**
 * Lenis smooth scroll 코드
 */
function generateLenisCode(scrollEffects) {
  return `import Lenis from 'lenis';

export function initSmoothScroll() {
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 2,
  });

  // Connect with GSAP ScrollTrigger
  lenis.on('scroll', (e) => {
    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.update();
    }
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  return lenis;
}
`;
}

/**
 * Theatre.js 타임라인 코드
 */
function generateTheatreCode(animations) {
  const theatreAnims = animations.filter(a => a.library === 'theatre');
  if (theatreAnims.length === 0) return null;

  return `import studio from '@theatre/studio';
import { getProject, types } from '@theatre/core';

// Initialize Theatre.js (dev mode)
if (process.env.NODE_ENV === 'development') {
  studio.initialize();
}

const project = getProject('Design-DNA Animation');
const sheet = project.sheet('Main');

// Create animation objects for each element
${theatreAnims.map(anim => `
export const ${anim.id.replace(/-/g, '_')} = sheet.object('${anim.description || anim.id}', {
  position: { x: types.number(0, { range: [-500, 500] }), y: types.number(0, { range: [-500, 500] }) },
  rotation: types.number(0, { range: [-360, 360] }),
  scale: types.number(1, { range: [0, 3] }),
  opacity: types.number(1, { range: [0, 1] }),
});
`).join('')}

// Play sequence
export function playMainSequence() {
  const sequence = sheet.sequence;
  sequence.play({ iterationCount: 1, range: [0, ${theatreAnims.length * 2}] });
}
`;
}

/**
 * Lottie 통합 코드
 */
function generateLottieCode() {
  return `import Lottie from 'lottie-react';
import { useRef, useEffect } from 'react';

// Lottie animation wrapper with scroll control
export function ScrollLottie({ animationData, scrollTarget, ...props }) {
  const lottieRef = useRef();
  
  useEffect(() => {
    if (!scrollTarget || !lottieRef.current) return;
    
    const handleScroll = () => {
      const rect = scrollTarget.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, 1 - (rect.top / window.innerHeight)));
      const totalFrames = lottieRef.current.getDuration(true);
      lottieRef.current.goToAndStop(progress * totalFrames, true);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrollTarget]);

  return <Lottie lottieRef={lottieRef} animationData={animationData} autoplay={false} {...props} />;
}

// Hover-triggered Lottie
export function HoverLottie({ animationData, ...props }) {
  const lottieRef = useRef();
  
  return (
    <div
      onMouseEnter={() => lottieRef.current?.play()}
      onMouseLeave={() => { lottieRef.current?.stop(); lottieRef.current?.goToAndStop(0); }}
    >
      <Lottie lottieRef={lottieRef} animationData={animationData} autoplay={false} loop={false} {...props} />
    </div>
  );
}
`;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 3: Master Code Assembler
// ═══════════════════════════════════════════════════════════════

function generatePackageJson(analysis) {
  const deps = {
    'react': '^19.0.0',
    'react-dom': '^19.0.0',
  };
  const devDeps = {
    'vite': '^6.0.0',
    '@vitejs/plugin-react': '^4.0.0',
    'tailwindcss': '^4.0.0',
  };

  const libs = new Set(analysis.animations?.map(a => a.library) || []);
  const has3D = analysis.threeDElements?.length > 0;
  const hasSmooth = analysis.globalEffects?.smoothScroll;

  if (libs.has('gsap')) { deps['gsap'] = '^3.12.0'; }
  if (libs.has('motion')) { deps['motion'] = '^12.0.0'; }
  if (libs.has('react-spring')) { deps['@react-spring/web'] = '^9.7.0'; deps['@use-gesture/react'] = '^10.3.0'; }
  if (libs.has('lottie')) { deps['lottie-react'] = '^2.4.0'; }
  if (libs.has('theatre')) { deps['@theatre/core'] = '^0.7.0'; devDeps['@theatre/studio'] = '^0.7.0'; }
  if (has3D) {
    deps['three'] = '^0.170.0';
    deps['@react-three/fiber'] = '^9.0.0';
    deps['@react-three/drei'] = '^9.0.0';
    deps['@react-three/postprocessing'] = '^3.0.0';
  }
  if (hasSmooth) { deps['lenis'] = '^1.1.0'; }

  return JSON.stringify({
    name: 'design-dna-generated',
    private: true,
    version: '1.0.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
    dependencies: deps,
    devDependencies: devDeps,
  }, null, 2);
}

// ─── Component → JSX Mapper ───────────────────────────────────
function componentToJSX(comp, analysis, indent = '          ') {
  const animId = analysis.animations?.find(a => a.targetComponent === comp.id)?.id;
  const dataAnim = animId ? ` data-anim="${animId}"` : '';
  const style = buildInlineStyle(comp.style, comp);
  const styleAttr = style ? ` style={${style}}` : '';
  const posStyle = buildPositionStyle(comp.position);
  const posAttr = posStyle ? ` style={${posStyle}}` : '';
  // Merge position + component styles
  const mergedStyle = mergeStyles(comp.position, comp.style, comp);
  const mergedAttr = mergedStyle ? ` style={${mergedStyle}}` : '';

  switch (comp.type) {
    case 'heading': {
      const tag = comp.content?.level || 'h2';
      const text = comp.content?.text || '';
      // Gradient text support
      const isGradient = comp.style?.color === 'transparent' && comp.style?.backgroundColor?.includes('gradient');
      if (isGradient) {
        return `${indent}<${tag}${dataAnim} className="comp-${comp.id} gradient-text" style={{
${indent}  background: '${comp.style.backgroundColor}',
${indent}  WebkitBackgroundClip: 'text',
${indent}  WebkitTextFillColor: 'transparent',
${indent}  fontSize: '${comp.style.fontSize || '48px'}',
${indent}  fontWeight: ${comp.style.fontWeight || 700},
${indent}  position: 'absolute',
${indent}  left: '${comp.position?.x || '0%'}',
${indent}  top: '${comp.position?.y || '0%'}',
${indent}  width: '${comp.position?.width || 'auto'}',
${indent}  transform: '${comp.style.transform || 'none'}',
${indent}  textShadow: '${comp.style.boxShadow || 'none'}',
${indent}}}>${text}</${tag}>`;
      }
      return `${indent}<${tag}${dataAnim} className="comp-${comp.id}"${mergedAttr}>${text}</${tag}>`;
    }

    case 'text': {
      const lines = (comp.content?.text || '').split('\\n');
      if (lines.length > 1) {
        const ps = lines.map(l => `${indent}  <p>${l}</p>`).join('\n');
        return `${indent}<div${dataAnim} className="comp-${comp.id}"${mergedAttr}>\n${ps}\n${indent}</div>`;
      }
      return `${indent}<p${dataAnim} className="comp-${comp.id}"${mergedAttr}>${comp.content?.text || ''}</p>`;
    }

    case 'button':
      return `${indent}<button${dataAnim} className="comp-${comp.id}"${mergedAttr}>${comp.content?.text || 'Click'}</button>`;

    case 'image':
      return `${indent}<img${dataAnim} className="comp-${comp.id}" src="${comp.content?.src || ''}" alt="${comp.content?.alt || ''}"${mergedAttr} />`;

    case 'icon':
      return `${indent}<span${dataAnim} className="comp-${comp.id} icon"${mergedAttr}>{/* ${comp.content?.alt || 'icon'} */}</span>`;

    case 'badge':
      return `${indent}<span${dataAnim} className="comp-${comp.id} badge"${mergedAttr}>${comp.content?.text || ''}</span>`;

    case 'card': {
      const children = comp.children?.map(c => {
        const child = analysis.components?.find(x => x.id === c);
        return child ? componentToJSX(child, analysis, indent + '  ') : '';
      }).filter(Boolean).join('\n') || `${indent}  {/* card content */}`;
      return `${indent}<div${dataAnim} className="comp-${comp.id} card"${mergedAttr}>\n${children}\n${indent}</div>`;
    }

    case 'nav':
      return `${indent}<nav${dataAnim} className="comp-${comp.id}"${mergedAttr}>{/* navigation */}</nav>`;

    case 'floating-element':
      return `${indent}<div${dataAnim} className="comp-${comp.id} floating-element"${mergedAttr}>\n${indent}  {/* ${comp.content?.alt || 'floating element'} */}\n${indent}</div>`;

    case '3d-scene':
      return `${indent}{/* 3D scene rendered via Scene3D wrapper */}`;

    case 'particle':
      return `${indent}{/* Particle system rendered via Scene3D wrapper */}`;

    case 'video':
      return `${indent}<video${dataAnim} className="comp-${comp.id}"${mergedAttr} autoPlay muted loop playsInline>\n${indent}  <source src="${comp.content?.src || ''}" />\n${indent}</video>`;

    case 'input':
      return `${indent}<input${dataAnim} className="comp-${comp.id}"${mergedAttr} placeholder="${comp.content?.text || ''}" />`;

    case 'divider':
      return `${indent}<hr${dataAnim} className="comp-${comp.id}"${mergedAttr} />`;

    case 'marquee':
      return `${indent}<div${dataAnim} className="comp-${comp.id} marquee"${mergedAttr}>${comp.content?.text || ''}</div>`;

    case 'counter':
      return `${indent}<span${dataAnim} className="comp-${comp.id} counter"${mergedAttr}>${comp.content?.text || '0'}</span>`;

    default:
      return `${indent}<div${dataAnim} className="comp-${comp.id}"${mergedAttr}>${comp.content?.text || ''}</div>`;
  }
}

function buildInlineStyle(style, comp) {
  if (!style || Object.keys(style).length === 0) return '';
  const s = {};
  if (style.fontSize) s.fontSize = `'${style.fontSize}'`;
  if (style.fontWeight) s.fontWeight = style.fontWeight;
  if (style.fontFamily) s.fontFamily = `'${style.fontFamily}'`;
  if (style.color && style.color !== 'transparent') s.color = `'${style.color}'`;
  if (style.backgroundColor && !style.backgroundColor.includes('gradient')) s.backgroundColor = `'${style.backgroundColor}'`;
  if (style.borderRadius) s.borderRadius = `'${style.borderRadius}'`;
  if (style.border) s.border = `'${style.border}'`;
  if (style.padding && style.padding !== '0px') s.padding = `'${style.padding}'`;
  if (style.margin && style.margin !== '0px') s.margin = `'${style.margin}'`;
  if (style.boxShadow) s.boxShadow = `'${style.boxShadow}'`;
  if (style.opacity !== undefined && style.opacity !== 1) s.opacity = style.opacity;
  if (style.transform) s.transform = `'${style.transform}'`;
  if (style.filter) s.filter = `'${style.filter}'`;
  if (Object.keys(s).length === 0) return '';
  const entries = Object.entries(s).map(([k, v]) => `${k}: ${v}`).join(', ');
  return `{{ ${entries} }}`;
}

function buildPositionStyle(pos) {
  if (!pos) return '';
  const s = {};
  s.position = "'absolute'";
  if (pos.x) s.left = `'${pos.x}'`;
  if (pos.y) s.top = `'${pos.y}'`;
  if (pos.width) s.width = `'${pos.width}'`;
  if (pos.height && pos.height !== '100%') s.height = `'${pos.height}'`;
  const entries = Object.entries(s).map(([k, v]) => `${k}: ${v}`).join(', ');
  return `{{ ${entries} }}`;
}

function mergeStyles(pos, style, comp) {
  const s = {};
  // Position
  if (pos) {
    s.position = "'absolute'";
    if (pos.x) s.left = `'${pos.x}'`;
    if (pos.y) s.top = `'${pos.y}'`;
    if (pos.width) s.width = `'${pos.width}'`;
    if (pos.height && pos.height !== '100%') s.height = `'${pos.height}'`;
  }
  // Style
  if (style) {
    if (style.fontSize) s.fontSize = `'${style.fontSize}'`;
    if (style.fontWeight) s.fontWeight = style.fontWeight;
    if (style.fontFamily) s.fontFamily = `'${style.fontFamily}'`;
    if (style.color && style.color !== 'transparent') s.color = `'${style.color}'`;
    if (style.backgroundColor && !style.backgroundColor.includes('gradient')) s.backgroundColor = `'${style.backgroundColor}'`;
    if (style.borderRadius) s.borderRadius = `'${style.borderRadius}'`;
    if (style.border) s.border = `'${style.border}'`;
    if (style.padding && style.padding !== '0px') s.padding = `'${style.padding}'`;
    if (style.margin && style.margin !== '0px') s.margin = `'${style.margin}'`;
    if (style.boxShadow) s.boxShadow = `'${style.boxShadow}'`;
    if (style.opacity !== undefined && style.opacity !== 1) s.opacity = style.opacity;
    if (style.transform) s.transform = `'${style.transform}'`;
    if (style.filter) s.filter = `'${style.filter}'`;
  }
  if (Object.keys(s).length === 0) return '';
  const entries = Object.entries(s).map(([k, v]) => `${k}: ${v}`).join(', ');
  return `{ ${entries} }`;
}

function generateMainApp(analysis) {
  const libs = new Set(analysis.animations?.map(a => a.library) || []);
  const has3D = analysis.threeDElements?.length > 0;
  const hasGSAP = libs.has('gsap');
  const hasMotion = libs.has('motion');
  const hasSpring = libs.has('react-spring');
  const hasSmooth = analysis.globalEffects?.smoothScroll;
  const components = analysis.components || [];
  const sections = analysis.layout?.sections || [];

  // Build imports
  let imports = `import React, { useEffect, useRef } from 'react';\n`;
  if (hasMotion) imports += `import { motion } from 'motion/react';\nimport { variants, staggerContainer } from './lib/motion-animations';\n`;
  if (hasGSAP) imports += `import { initAnimations } from './lib/gsap-animations';\n`;
  if (hasSmooth) imports += `import { initSmoothScroll } from './lib/lenis-scroll';\n`;
  if (has3D) imports += `import { Scene3D, ParticleField, MorphBlob, Globe, CodeParticles } from './lib/r3f-scene';\n`;
  if (hasSpring) imports += `import { animated } from '@react-spring/web';\nimport { useStaggeredEntrance } from './lib/spring-animations';\n`;
  imports += `import './design-tokens.css';\nimport './styles.css';\n`;

  // Build useEffect setup
  let setup = '';
  if (hasGSAP || hasSmooth) {
    setup = `\n  useEffect(() => {\n`;
    if (hasSmooth) setup += `    const lenis = initSmoothScroll();\n`;
    if (hasGSAP) setup += `    initAnimations();\n`;
    setup += `    return () => {\n`;
    if (hasSmooth) setup += `      lenis.destroy();\n`;
    setup += `    };\n  }, []);\n`;
  }

  // Determine 3D scene components from analysis
  let scene3DJsx = '';
  if (has3D) {
    const particleComp = components.find(c => c.type === 'particle');
    const sceneComp = components.find(c => c.type === '3d-scene');
    const threeDConfig = analysis.threeDElements?.[0]?.config || {};

    // Particle props from analysis
    let particleProps = [];
    if (particleComp?.particleConfig) {
      const pc = particleComp.particleConfig;
      if (pc.count) particleProps.push(`count={${pc.count}}`);
      if (pc.color?.[0]) particleProps.push(`color="${pc.color[0]}"`);
      if (pc.textValue) particleProps.push(`textParticles={${JSON.stringify(pc.textValue)}}`);
    }
    const particlePropStr = particleProps.length ? ` ${particleProps.join(' ')}` : '';

    // Globe/MorphBlob props from analysis
    let sceneChildren = '';
    if (sceneComp) {
      const hasGlobe = sceneComp.content?.alt?.toLowerCase().includes('globe');
      if (hasGlobe) {
        sceneChildren += `\n        <Globe color="${analysis.designTokens?.colors?.primary || '#2c79d5'}" />\n`;
        // Add orbiting ribbons if detected
        if (sceneComp.content?.alt?.toLowerCase().includes('ribbon')) {
          sceneChildren += `        <OrbitRibbons />\n`;
        }
      } else {
        sceneChildren += `\n        <MorphBlob color="${analysis.designTokens?.colors?.primary || '#4F46E5'}" />\n`;
      }
    }

    scene3DJsx = `      <Scene3D>
        <ParticleField${particlePropStr} />${sceneChildren}      </Scene3D>\n`;
  }

  // Build section JSX with actual components
  let sectionJsx = sections.map(section => {
    const Wrapper = hasMotion ? 'motion.section' : 'section';
    const motionProps = hasMotion ? ` variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}` : '';

    // Section background style
    const bg = section.background;
    let sectionStyle = '';
    if (bg) {
      const bgParts = [];
      if (bg.type === 'gradient') bgParts.push(`background: '${bg.value}'`);
      else if (bg.type === 'solid') bgParts.push(`backgroundColor: '${bg.value}'`);
      bgParts.push("position: 'relative'");
      bgParts.push("overflow: 'hidden'");
      bgParts.push("minHeight: '100vh'");
      if (section.layout?.padding && section.layout.padding !== '0px') {
        bgParts.push(`padding: '${section.layout.padding}'`);
      }
      sectionStyle = ` style={{ ${bgParts.join(', ')} }}`;
    }

    // Render children components
    const childIds = section.children || [];
    const childrenJsx = childIds.map(cid => {
      const comp = components.find(c => c.id === cid);
      if (!comp) return '';
      // Skip 3d-scene and particle (rendered in Scene3D wrapper)
      if (comp.type === '3d-scene' || comp.type === 'particle') return '';
      return componentToJSX(comp, analysis, '          ');
    }).filter(Boolean).join('\n\n');

    return `        <${Wrapper} id="${section.id}" className="section-${section.tag}"${motionProps}${sectionStyle}>
${childrenJsx || `          {/* ${section.tag} section */}`}
        </${Wrapper}>`;
  }).join('\n\n');

  if (!sectionJsx) {
    // Fallback: render all non-3D components without sections
    sectionJsx = components
      .filter(c => c.type !== '3d-scene' && c.type !== 'particle')
      .map(c => componentToJSX(c, analysis, '        '))
      .join('\n');
    if (!sectionJsx) sectionJsx = '        {/* Generated layout */}';
  }

  return `${imports}
export default function App() {${setup}
  return (
    <div className="app">
${scene3DJsx}
      <main>
${sectionJsx}
      </main>
    </div>
  );
}
`;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4: AI Vision + Full Pipeline
// ═══════════════════════════════════════════════════════════════

async function runVisionAnalysis(imagePath, apiKey, model = 'gemini', fileMimeType = null) {
  const imageBuffer = await fs.readFile(imagePath);
  const base64 = imageBuffer.toString('base64');
  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = fileMimeType || (ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.gif' ? 'image/gif' : 'image/jpeg');

  if (model === 'gemini') {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: ANALYSIS_PROMPT }, { inlineData: { mimeType, data: base64 } }] }],
        generationConfig: { temperature: 0.05, maxOutputTokens: 16384, responseMimeType: 'application/json' }
      })
    });
    const data = await res.json();
    console.log('[Gemini API] Status:', res.status);
    console.log('[Gemini API] Response keys:', Object.keys(data));
    if (data.error) console.log('[Gemini API] Error:', JSON.stringify(data.error));
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.log('[Gemini API] Full response:', JSON.stringify(data).substring(0, 2000));
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) throw new Error('Gemini returned empty response. Check API key and model availability.');
    try {
      return JSON.parse(text);
    } catch (parseErr) {
      console.log('[Gemini API] Raw text (first 1000 chars):', text.substring(0, 1000));
      // Try to extract JSON from markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) return JSON.parse(jsonMatch[1]);
      throw parseErr;
    }
  }

  if (model === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o', temperature: 0.05, max_tokens: 16384,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: [
          { type: 'text', text: ANALYSIS_PROMPT },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' } }
        ]}]
      })
    });
    const data = await res.json();
    return JSON.parse(data.choices?.[0]?.message?.content || '{}');
  }

  if (model === 'claude') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', max_tokens: 16384,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
          { type: 'text', text: ANALYSIS_PROMPT }
        ]}]
      })
    });
    const data = await res.json();
    const text = data.content?.[0]?.text || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : '{}');
  }

  throw new Error(`Unsupported model: ${model}`);
}

// ═══════════════════════════════════════════════════════════════
// SECTION 5: Main Pipeline Export
// ═══════════════════════════════════════════════════════════════

export async function imageToCode(imagePath, options = {}) {
  const {
    framework = 'react', styling = 'tailwind', model = 'gemini',
    apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY,
    outputDir = './output',
    mimeType = null,
  } = options;

  if (!apiKey) throw new Error('API key required. Set GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY');

  console.log(`[Image2Code v2] Analyzing: ${path.basename(imagePath)}`);
  console.log(`[Image2Code v2] Output: ${framework} + ${styling} | Model: ${model}`);

  // Phase 1: AI Vision Analysis
  console.log('[Phase 1/4] Running ultra-precision vision analysis...');
  const analysis = await runVisionAnalysis(imagePath, apiKey, model, mimeType);
  console.log(`[Phase 1/4] Detected: ${analysis.components?.length || 0} components, ${analysis.animations?.length || 0} animations, ${analysis.threeDElements?.length || 0} 3D elements`);

  // Phase 2: Generate all code files
  console.log('[Phase 2/4] Generating library-specific code...');
  const files = {};

  // Core files
  files['package.json'] = generatePackageJson(analysis);
  files['src/App.jsx'] = generateMainApp(analysis);
  files['src/design-tokens.css'] = generateDesignTokensCSS(analysis.designTokens);
  files['src/styles.css'] = generateGlobalStyles(analysis);

  // Library-specific files
  const gsapCode = generateGSAPCode(analysis.animations || []);
  if (gsapCode) files['src/lib/gsap-animations.js'] = gsapCode;

  const motionCode = generateMotionCode(analysis.animations || []);
  if (motionCode) files['src/lib/motion-animations.js'] = motionCode;

  const springCode = generateReactSpringCode(analysis.animations || []);
  if (springCode) files['src/lib/spring-animations.js'] = springCode;

  const r3fCode = generateR3FCode(analysis.threeDElements, analysis);
  if (r3fCode) files['src/lib/r3f-scene.jsx'] = r3fCode;

  if (analysis.globalEffects?.smoothScroll) {
    files['src/lib/lenis-scroll.js'] = generateLenisCode(analysis.scrollEffects);
  }

  const theatreCode = generateTheatreCode(analysis.animations || []);
  if (theatreCode) files['src/lib/theatre-timeline.js'] = theatreCode;

  const lottieCode = generateLottieCode();
  if (analysis.animations?.some(a => a.library === 'lottie')) {
    files['src/lib/lottie-components.jsx'] = lottieCode;
  }

  // Analysis report
  files['design-dna-analysis.json'] = JSON.stringify(analysis, null, 2);

  // Vite config
  files['vite.config.js'] = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()] });
`;

  // Phase 3: Write files
  console.log('[Phase 3/4] Writing files...');
  for (const [filename, content] of Object.entries(files)) {
    const filePath = path.join(outputDir, filename);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  }
  console.log(`[Phase 3/4] Generated ${Object.keys(files).length} files`);

  // Phase 4: Summary
  const libs = new Set(analysis.animations?.map(a => a.library) || []);
  console.log('[Phase 4/4] Libraries used:');
  if (libs.has('gsap')) console.log('  - GSAP + ScrollTrigger');
  if (libs.has('motion')) console.log('  - Motion (framer-motion)');
  if (libs.has('react-spring')) console.log('  - React Spring');
  if (libs.has('lottie')) console.log('  - Lottie (airbnb)');
  if (libs.has('theatre')) console.log('  - Theatre.js');
  if (analysis.threeDElements?.length) console.log('  - Three.js / React Three Fiber');
  if (analysis.globalEffects?.smoothScroll) console.log('  - Lenis (smooth scroll)');
  console.log(`[Image2Code v2] Complete! Output: ${outputDir}`);

  return { analysis, files, outputDir };
}

// Helper functions
function generateDesignTokensCSS(tokens) {
  if (!tokens) return ':root {}\n';
  let css = ':root {\n';
  if (tokens.colors) for (const [k, v] of Object.entries(tokens.colors)) css += `  --color-${k}: ${v};\n`;
  if (tokens.typography?.scale) for (const [k, v] of Object.entries(tokens.typography.scale)) css += `  --font-size-${k}: ${v};\n`;
  if (tokens.borderRadius) for (const [k, v] of Object.entries(tokens.borderRadius)) css += `  --radius-${k}: ${v};\n`;
  if (tokens.shadows) for (const [k, v] of Object.entries(tokens.shadows)) css += `  --shadow-${k}: ${v};\n`;
  css += '}\n';
  return css;
}

function generateGlobalStyles(analysis) {
  const fonts = analysis.designTokens?.typography?.fontFamilies;
  const fontFamily = fonts?.[0] ? `'${fonts[0]}', ` : '';
  const bg = analysis.designTokens?.colors?.background || '#0a0a0a';
  const text = analysis.designTokens?.colors?.text || '#fafafa';

  let css = `@import './design-tokens.css';

* { margin: 0; padding: 0; box-sizing: border-box; }

html {
  scroll-behavior: smooth;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: ${fontFamily}system-ui, -apple-system, sans-serif;
  background: var(--color-background, ${bg});
  color: var(--color-text, ${text});
  overflow-x: hidden;
}

.app {
  position: relative;
  min-height: 100vh;
}

/* Smooth transitions for all interactive elements */
a, button, input, [role="button"] {
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

/* Gradient text utility */
.gradient-text {
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Floating element animation */
.floating-element {
  animation: gentleFloat 6s ease-in-out infinite;
}

@keyframes gentleFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

/* Section base */
[class*="section-"] {
  position: relative;
  overflow: hidden;
}
`;

  // Generate component-specific CSS from analysis
  const components = analysis.components || [];
  for (const comp of components) {
    if (comp.interaction?.hover) {
      const h = comp.interaction.hover;
      let hoverCSS = '';
      if (h.scale && h.scale !== 1) hoverCSS += `  transform: scale(${h.scale});\\n`;
      if (h.shadow) hoverCSS += `  box-shadow: ${h.shadow};\\n`;
      if (h.color) hoverCSS += `  color: ${h.color};\\n`;
      if (h.background) hoverCSS += `  background: ${h.background};\\n`;
      if (hoverCSS) {
        css += `\\n.comp-${comp.id}:hover {\\n${hoverCSS}}\\n`;
      }
    }
  }

  return css;
}
