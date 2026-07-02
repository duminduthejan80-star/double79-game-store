import { useEffect, useState } from "react";

const CinematicHero = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="relative min-h-[70vh] flex items-end">
      <div className="mx-auto max-w-6xl w-full px-8 pb-24 pt-40">
        <div
          className="transition-all duration-[2400ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(20px)",
          }}
        >
          <div className="text-[10px] tracking-[0.5em] uppercase text-muted-foreground mb-8">
            an archive · pre-installed
          </div>
          <h1 className="text-3xl md:text-5xl font-light leading-[1.15] max-w-2xl text-foreground/90">
            games,{" "}
            <span className="text-muted-foreground">quietly collected.</span>
          </h1>
          <div
            className="mt-16 text-[10px] tracking-[0.4em] uppercase text-muted-foreground/60 transition-opacity duration-[2400ms] delay-700"
            style={{ opacity: mounted ? 1 : 0 }}
          >
            scroll to enter
          </div>
        </div>
      </div>
    </section>
  );
};

export default CinematicHero;
