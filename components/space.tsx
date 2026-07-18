"use client";

import { memo, useEffect, useRef } from "react";

/**
 * The living space — a fixed atmospheric backdrop behind all content.
 *
 * Drifting blooms (CSS, theme-tokened so they carry the market's mood) plus a
 * canvas starfield for depth. Deliberately render-isolated: it takes no props,
 * is `memo`-wrapped, and drives its own rAF loop, so the many live-data
 * re-renders elsewhere never touch it. Motion pauses under
 * `prefers-reduced-motion`, when the user sets `data-motion="off"` on <html>,
 * and while the tab is hidden. Styles live in app/globals.css (`.space-*`).
 */
const SpaceImpl = (): React.ReactNode => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    let width = 0;
    let height = 0;
    let dpr = 1;
    let stars: {
      x: number;
      y: number;
      z: number;
      r: number;
      tw: number;
    }[] = [];
    let starColor = "rgba(200,214,255,0.6)";
    let raf = 0;

    const readStarColor = (): void => {
      const v = getComputedStyle(document.documentElement)
        .getPropertyValue("--star-color")
        .trim();
      if (v) starColor = v;
    };

    const motionOff = (): boolean =>
      prefersReduced.matches ||
      document.documentElement.dataset.motion === "off";

    const init = (): void => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.width = window.innerWidth * dpr;
      height = canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      const count = Math.round((window.innerWidth * window.innerHeight) / 13000);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 0.8 + 0.2,
        r: (Math.random() * 1.3 + 0.3) * dpr,
        tw: Math.random() * Math.PI * 2,
      }));
      readStarColor();
    };

    const paint = (animate: boolean): void => {
      ctx.clearRect(0, 0, width, height);
      for (const s of stars) {
        if (animate) {
          s.y -= s.z * 0.18 * dpr;
          if (s.y < -2) s.y = height + 2;
          s.tw += 0.02;
        }
        const flicker = animate ? 0.6 + 0.4 * Math.sin(s.tw) : 1;
        ctx.globalAlpha = (0.25 + 0.55 * s.z) * flicker;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = starColor;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const frame = (): void => {
      paint(true);
      raf = window.requestAnimationFrame(frame);
    };

    const start = (): void => {
      window.cancelAnimationFrame(raf);
      if (motionOff() || document.hidden) {
        paint(false);
        return;
      }
      frame();
    };

    init();
    start();

    const onResize = (): void => {
      init();
      start();
    };
    const onVisibility = (): void => start();
    // Re-read the star color and restart when the theme (html class) or the
    // motion flag flips.
    const observer = new MutationObserver(() => {
      readStarColor();
      start();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-motion"],
    });

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    prefersReduced.addEventListener("change", start);

    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      prefersReduced.removeEventListener("change", start);
    };
  }, []);

  return (
    <div className="space-layer" aria-hidden="true">
      <div className="space-bloom b1" />
      <div className="space-bloom b2" />
      <div className="space-bloom b3" />
      <canvas ref={canvasRef} className="space-stars" />
      <div className="space-vignette" />
    </div>
  );
};

/** Render-isolated: props never change, so it mounts once and never re-renders. */
export const Space = memo(SpaceImpl);
