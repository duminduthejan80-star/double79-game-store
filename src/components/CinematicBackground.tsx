import { useEffect, useRef } from "react";

/**
 * Site-wide cinematic 3D background:
 * - Parallax perspective grid
 * - Floating neon orbs with mouse parallax
 * - Animated aurora gradient
 * - Subtle noise + scanlines
 */
const CinematicBackground = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let tx = 0, ty = 0, cx = 0, cy = 0;
    const onMove = (e: MouseEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const tick = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      el.style.setProperty("--mx", cx.toFixed(3));
      el.style.setProperty("--my", cy.toFixed(3));
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="cinematic-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Aurora */}
      <div className="aurora aurora-1" />
      <div className="aurora aurora-2" />
      <div className="aurora aurora-3" />

      {/* Floating orbs (parallax) */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* Perspective grid floor */}
      <div className="grid-floor">
        <div className="grid-floor-inner" />
      </div>

      {/* Scanlines + vignette */}
      <div className="scanlines" />
      <div className="vignette" />
    </div>
  );
};

export default CinematicBackground;
