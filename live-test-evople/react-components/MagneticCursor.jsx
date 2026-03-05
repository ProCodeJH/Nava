// Custom magnetic cursor — design-dna v4.0
import React, { useEffect, useRef } from "react";

export default function MagneticCursor({ size = 26, blendMode = "difference" }) {
  const cursorRef = useRef(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    const move = (e) => {
      cursor.style.left = e.clientX + "px";
      cursor.style.top = e.clientY + "px";
    };

    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  return (
    <div
      ref={cursorRef}
      style={{
        position: "fixed",
        width: size + "px",
        height: size + "px",
        borderRadius: "50%",
        background: "white",
        mixBlendMode: blendMode,
        pointerEvents: "none",
        transform: "translate(-50%, -50%)",
        transition: "width 0.3s, height 0.3s",
        zIndex: 9999,
      }}
    />
  );
}
