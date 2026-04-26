"use client";

import { useEffect, useRef, useState } from "react";

interface BadTVOverlayProps {
  damage: number; // 0-100
}

/**
 * CSS-based Bad TV / CRT distortion overlay.
 * Simulates degrading CRT effects based on damage level:
 * - 0-20: Faint scanlines only
 * - 20-40: Slight horizontal jitter, minor RGB split
 * - 40-60: Stronger scanlines, periodic roll, color bleeding
 * - 60-80: Heavy distortion, vertical hold problems, static bursts
 * - 80-100: Full breakdown, screen tearing, blackouts, heavy static
 */
export default function BadTVOverlay({ damage }: BadTVOverlayProps) {
  const [jitterX, setJitterX] = useState(0);
  const [rollY, setRollY] = useState(0);
  const [staticOpacity, setStaticOpacity] = useState(0);
  const [blackout, setBlackout] = useState(false);
  const [tearY, setTearY] = useState(0);
  const frameRef = useRef<number | null>(null);

  // Normalized damage (0-1)
  const d = Math.min(Math.max(damage, 0), 100) / 100;

  // Calculate effect intensities
  const rgbShift = d > 0.2 ? (d - 0.2) * 5 : 0; // 0-4px
  const scanlineOpacity = 0.02 + d * 0.1; // 0.02-0.12
  const jitterIntensity = d > 0.2 ? (d - 0.2) * 6 : 0; // 0-4.8px
  const rollEnabled = d > 0.4;
  const staticEnabled = d > 0.6;
  const blackoutEnabled = d > 0.8;
  const tearEnabled = d > 0.7;

  useEffect(() => {
    let lastTime = 0;
    let rollOffset = 0;

    const animate = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      // Horizontal jitter
      if (jitterIntensity > 0) {
        setJitterX((Math.random() - 0.5) * jitterIntensity);
      }

      // Vertical roll
      if (rollEnabled) {
        rollOffset += delta * 0.015 * (d - 0.4);
        if (rollOffset > 100) rollOffset = 0;
        setRollY(rollOffset);
      }

      // Static bursts
      if (staticEnabled && Math.random() < 0.08 * (d - 0.6)) {
        setStaticOpacity(0.08 + Math.random() * 0.25 * (d - 0.6) * 2.5);
        setTimeout(() => setStaticOpacity(0), 40 + Math.random() * 80);
      }

      // Random blackouts
      if (blackoutEnabled && Math.random() < 0.015 * (d - 0.8) * 5) {
        setBlackout(true);
        setTimeout(() => setBlackout(false), 25 + Math.random() * 50);
      }

      // Screen tearing
      if (tearEnabled && Math.random() < 0.04 * (d - 0.7) * 3.3) {
        setTearY(Math.random() * 100);
        setTimeout(() => setTearY(0), 80);
      }

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [d, jitterIntensity, rollEnabled, staticEnabled, blackoutEnabled, tearEnabled]);

  // Don't render anything if damage is very low
  if (damage < 5) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 5 }}
      aria-hidden="true"
    >
      {/* RGB Split layers */}
      {rgbShift > 0 && (
        <>
          {/* Red channel offset */}
          <div
            className="absolute inset-0 mix-blend-screen"
            style={{
              backgroundColor: "transparent",
              boxShadow: `inset ${rgbShift}px 0 0 rgba(255,0,64,${0.04 + d * 0.08})`,
              transform: `translateX(${jitterX}px)`,
            }}
          />
          {/* Cyan channel offset (opposite) */}
          <div
            className="absolute inset-0 mix-blend-screen"
            style={{
              backgroundColor: "transparent",
              boxShadow: `inset ${-rgbShift}px 0 0 rgba(0,255,255,${0.04 + d * 0.08})`,
              transform: `translateX(${-jitterX * 0.5}px)`,
            }}
          />
        </>
      )}

      {/* Scanlines - get denser with damage */}
      <div
        className="absolute inset-0"
        style={{
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent ${2 - d * 0.5}px,
            rgba(0,0,0,${scanlineOpacity}) ${2 - d * 0.5}px,
            rgba(0,0,0,${scanlineOpacity}) ${4 - d}px
          )`,
          transform: `translateY(${rollY}%)`,
        }}
      />

      {/* Static noise overlay */}
      {staticOpacity > 0 && (
        <div
          className="absolute inset-0 noise-overlay"
          style={{
            opacity: staticOpacity,
            mixBlendMode: "overlay",
          }}
        />
      )}

      {/* Screen tear effect */}
      {tearY > 0 && (
        <div
          className="absolute left-0 right-0 h-3"
          style={{
            top: `${tearY}%`,
            background: `linear-gradient(90deg, transparent, rgba(0,255,65,${0.2 + d * 0.2}), transparent)`,
            transform: `translateX(${(Math.random() - 0.5) * 15}px)`,
          }}
        />
      )}

      {/* Blackout flash */}
      {blackout && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: 0.85 }}
        />
      )}

      {/* Vignette that intensifies with damage */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, transparent ${65 - d * 25}%, rgba(0,0,0,${0.25 + d * 0.35}) 100%)`,
        }}
      />

      {/* Horizontal distortion bands at high damage */}
      {d > 0.5 && (
        <div
          className="absolute inset-0"
          style={{
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent ${40 - d * 20}px,
              rgba(0,255,65,${(d - 0.5) * 0.03}) ${40 - d * 20}px,
              rgba(0,255,65,${(d - 0.5) * 0.03}) ${42 - d * 20}px
            )`,
            transform: `translateY(${Math.sin(Date.now() * 0.001) * 2}px)`,
          }}
        />
      )}
    </div>
  );
}
