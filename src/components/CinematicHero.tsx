import { useEffect, useRef, useState } from "react";

const CinematicHero = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x, y });
  };

  const handleLeave = () => setTilt({ x: 0, y: 0 });

  return (
    <section
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="relative overflow-hidden border-b border-border/60 bg-surface-1"
      style={{ perspective: "1200px" }}
    >
      <video
        src="/hero-bg.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none"
        style={{
          transform: `scale(1.08) translate3d(${tilt.x * -20}px, ${tilt.y * -20}px, 0)`,
          transition: "transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      />

      {/* Cinematic vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, hsl(var(--background) / 0.7) 75%, hsl(var(--background)) 100%)",
        }}
      />
      {/* Horizontal gradient depth */}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-background/20 pointer-events-none" />

      {/* Ambient neon glows */}
      <div
        className="absolute -top-20 -left-20 w-[480px] h-[480px] rounded-full pointer-events-none blur-3xl opacity-40"
        style={{
          background: "radial-gradient(circle, hsl(var(--primary) / 0.6), transparent 60%)",
          transform: `translate3d(${tilt.x * 40}px, ${tilt.y * 40}px, 0)`,
          transition: "transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      />
      <div
        className="absolute -bottom-32 right-0 w-[520px] h-[520px] rounded-full pointer-events-none blur-3xl opacity-30"
        style={{
          background: "radial-gradient(circle, hsl(210 95% 60% / 0.55), transparent 65%)",
          transform: `translate3d(${tilt.x * -50}px, ${tilt.y * -30}px, 0)`,
          transition: "transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      />

      {/* Scanlines / film grain feel */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 3px)",
        }}
      />

      <div className="container relative mx-auto px-4 py-16 md:py-24">
        <div
          className="max-w-2xl"
          style={{
            transformStyle: "preserve-3d",
            transform: `rotateY(${tilt.x * 6}deg) rotateX(${tilt.y * -6}deg)`,
            transition: "transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
        >
          <div
            className={`text-xs font-semibold uppercase tracking-[0.3em] text-primary transition-all duration-700 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"
            }`}
            style={{ transform: `translateZ(40px)` }}
          >
            Double79 Store
          </div>
          <h1
            className={`mt-4 text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.05] text-foreground transition-all duration-1000 delay-100 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
            style={{ transform: `translateZ(80px)`, textShadow: "0 0 40px hsl(var(--primary) / 0.4)" }}
          >
            Discover. Download.{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, hsl(var(--primary)), hsl(210 95% 65%), hsl(var(--primary-glow)))",
              }}
            >
              Play.
            </span>
          </h1>
          <p
            className={`mt-5 text-base md:text-lg text-muted-foreground max-w-xl transition-all duration-1000 delay-300 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
            style={{ transform: `translateZ(50px)` }}
          >
            Curated titles, free-to-play hits, and premium experiences — all in one cinematic launcher.
          </p>
        </div>
      </div>
    </section>
  );
};

export default CinematicHero;
