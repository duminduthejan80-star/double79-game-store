import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import introVideo from "@/assets/double70-intro.mp4.asset.json";

const Intro = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {});
    const t = setTimeout(() => setReady(true), 900);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black">
      <video
        ref={videoRef}
        src={introVideo.url}
        autoPlay
        loop
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          filter: "grayscale(70%) brightness(0.55) contrast(1.05)",
          opacity: ready ? 1 : 0,
          transition: "opacity 3s cubic-bezier(0.22,1,0.36,1)",
        }}
      />
      {/* deep veil */}
      <div className="absolute inset-0 bg-black/55 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />

      {/* whisper mark, top-left */}
      <div
        className="absolute top-8 left-8 text-[10px] tracking-[0.5em] uppercase text-white/50 transition-opacity duration-[2400ms]"
        style={{ opacity: ready ? 1 : 0 }}
      >
        d/79
      </div>

      {/* centered stillness */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center px-8 transition-opacity duration-[3000ms] delay-500"
        style={{ opacity: ready ? 1 : 0 }}
      >
        <div className="text-[10px] tracking-[0.6em] uppercase text-white/40 mb-8">
          an archive
        </div>
        <h1 className="text-2xl md:text-4xl font-light tracking-wide text-white/85 text-center max-w-xl leading-relaxed">
          quiet games,<br />
          <span className="text-white/50">patiently kept.</span>
        </h1>
      </div>

      {/* hidden entry — hover to reveal */}
      <div className="absolute bottom-14 left-0 right-0 flex justify-center">
        <button
          onClick={() => navigate("/home")}
          className="group relative py-3 px-8 text-[10px] tracking-[0.6em] uppercase text-white/40 hover:text-white/95 transition-colors duration-[1400ms]"
        >
          <span className="relative">enter</span>
          <span
            aria-hidden
            className="absolute left-1/2 -translate-x-1/2 bottom-2 h-px w-0 group-hover:w-16 bg-white/70 transition-all duration-[1600ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          />
        </button>
      </div>
    </div>
  );
};

export default Intro;
