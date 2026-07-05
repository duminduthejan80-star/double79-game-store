import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck, BugOff, ShieldAlert, PackageX, CheckCircle2, Volume2, VolumeX } from "lucide-react";
import introVideo from "@/assets/gojo-intro.mp4.asset.json";
import { useAuth } from "@/lib/auth";

// sessionStorage: survives refresh, cleared when tab/browser closed —
// so returning users skip on refresh but see intro again after closing the tab.
const INTRO_SEEN_KEY = (uid: string | null | undefined) => `intro-seen:${uid ?? "guest"}`;


const features = [
  { icon: ShieldCheck, label: "100% Security" },
  { icon: BugOff, label: "No Errors" },
  { icon: ShieldAlert, label: "No Virus" },
  { icon: PackageX, label: "No Game Setup" },
  { icon: CheckCircle2, label: "100% Pre-Installed Games" },
];

const Intro = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  // Skip intro only within the same tab session (survives refresh, not tab close).
  useEffect(() => {
    if (user && sessionStorage.getItem(INTRO_SEEN_KEY(user.id)) === "1") {
      navigate("/home", { replace: true });
    }
  }, [user, navigate]);

  const goHome = () => {
    if (user) sessionStorage.setItem(INTRO_SEEN_KEY(user.id), "1");
    navigate("/home");
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    v.volume = 1;

    // Try unmuted autoplay first (works when browser has autoplay-with-sound permission).
    // If blocked, fall back to muted autoplay and unmute on first user gesture.
    const tryUnmuted = async () => {
      try {
        v.muted = false;
        setMuted(false);
        await v.play();
      } catch {
        v.muted = true;
        setMuted(true);
        try { await v.play(); } catch {}
      }
    };

    tryUnmuted();

    const unmuteOnGesture = () => {
      const vid = videoRef.current;
      if (!vid) return;
      vid.muted = false;
      vid.volume = 1;
      setMuted(false);
      if (vid.paused) vid.play().catch(() => {});
      cleanup();
    };
    const events = ["pointerdown", "pointermove", "mousemove", "mousedown", "click", "keydown", "touchstart", "touchmove", "wheel", "scroll"] as const;
    const cleanup = () => {
      events.forEach((ev) => window.removeEventListener(ev, unmuteOnGesture));
    };
    events.forEach((ev) =>
      window.addEventListener(ev, unmuteOnGesture, { once: true, passive: true } as AddEventListenerOptions),
    );

    return cleanup;
  }, []);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    // ensure video keeps playing after toggle
    if (v.paused) v.play().catch(() => {});
  };


  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black">
      <video
        ref={videoRef}
        src={introVideo.url}
        autoPlay
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/80 pointer-events-none" />



      {/* Top title */}
      <div className="absolute top-0 left-0 right-0 flex justify-center pt-5 px-4 z-10">
        <div className="px-5 py-2 rounded-full glass-strong">
          <h1 className="text-xs sm:text-sm font-bold tracking-[0.35em] text-white text-glow">
            DOUBLE79 OFFICIAL WEBSITE
          </h1>
        </div>
      </div>

      {/* Mute toggle */}
      <button
        onClick={toggleMute}
        className="absolute top-5 right-5 z-20 h-10 w-10 rounded-full glass flex items-center justify-center text-white hover:scale-110 transition-transform"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>

      {/* Right side liquid glass feature bar */}
      <div className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-3">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <div
              key={f.label}
              className="group flex items-center gap-3 pl-3 pr-5 py-2.5 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.25)] hover:bg-white/15 hover:scale-[1.03] transition-all duration-500"
              style={{
                animation: `slideInRight 0.7s cubic-bezier(0.2,0.8,0.2,1) ${i * 140}ms both`,
              }}
            >
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-sky-400/40 to-blue-600/40 border border-white/30 flex items-center justify-center shadow-inner">
                <Icon className="h-4 w-4 text-white drop-shadow" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-white whitespace-nowrap drop-shadow">
                {f.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Bottom GO button */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center z-10">
        <button
          onClick={goHome}
          className="group relative inline-flex items-center gap-3 px-10 py-4 rounded-full font-bold text-white text-lg tracking-widest uppercase
            bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-600
            shadow-[0_0_40px_rgba(56,189,248,0.7),0_10px_40px_rgba(37,99,235,0.5)]
            border border-white/30
            hover:scale-110 hover:shadow-[0_0_60px_rgba(56,189,248,0.95),0_15px_50px_rgba(37,99,235,0.7)]
            transition-all duration-500"
        >
          <span className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="relative">GO</span>
          <ArrowRight className="relative h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(60px) scale(0.9); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default Intro;
