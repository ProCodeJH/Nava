// ═══════════════════════════════════════════════════
// AUTO-GENERATED GSAP CODE — design-dna v4.0
// ═══════════════════════════════════════════════════

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ── Keyframe Animations ──
// @keyframes __framer-loading-spin
const tl___framer_loading_spin = gsap.timeline();
tl___framer_loading_spin.to(".target", {"transform":"rotate(0deg)"}, 0);
tl___framer_loading_spin.to(".target", {"transform":"rotate(360deg)"}, 1);

// ── Hover Transitions ──
// #__framer-editorbar-label
document.querySelectorAll("#__framer-editorbar-label").forEach(el => {
  el.addEventListener("mouseenter", () => {
    gsap.to(el, { duration: 0.4, ease: "power2.out" });
  });
});

// #__framer-editorbar-button
document.querySelectorAll("#__framer-editorbar-button").forEach(el => {
  el.addEventListener("mouseenter", () => {
    gsap.to(el, { duration: 0.3, ease: "power1.out" });
  });
});

// ── Scroll-Triggered Reveals (from Framer components) ──
gsap.utils.toArray(".reveal-element").forEach((el, i) => {
  gsap.from(el, {
    opacity: 0,
    y: 60,
    duration: 0.8,
    delay: i * 0.1,
    ease: "power3.out",
    scrollTrigger: {
      trigger: el,
      start: "top 85%",
      toggleActions: "play none none reverse",
    },
  });
});

// ── Smooth Scroll (Lenis-compatible) ──
// Uncomment if using Lenis:
// import Lenis from "@studio-freight/lenis";
// const lenis = new Lenis();
// lenis.on("scroll", ScrollTrigger.update);
// gsap.ticker.add((time) => lenis.raf(time * 1000));
// gsap.ticker.lagSmoothing(0);