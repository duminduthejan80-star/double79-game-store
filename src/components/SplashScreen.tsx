import { useEffect, useState } from "react";
import logo from "@/assets/logo.png";

const SplashScreen = () => {
  const [show, setShow] = useState(() => !sessionStorage.getItem("splashShown"));
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!show) return;
    const t1 = setTimeout(() => setFadeOut(true), 2200);
    const t2 = setTimeout(() => {
      setShow(false);
      sessionStorage.setItem("splashShown", "1");
    }, 2800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [show]);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-500 ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Glow background */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/20 via-transparent to-transparent splash-glow" />

      <div className="relative flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="splash-logo relative">
          <div className="absolute inset-0 rounded-full bg-primary/40 blur-3xl splash-pulse" />
          <div className="relative h-40 w-40 md:h-48 md:w-48 rounded-full overflow-hidden ring-2 ring-primary/60 shadow-glow">
            <img src={logo} alt="Double79" className="h-full w-full object-cover" />
          </div>
        </div>

        {/* Wordmark */}
        <div className="splash-text text-center">
          <div className="text-3xl md:text-4xl font-bold tracking-[0.3em] text-foreground">
            DOUBLE79
          </div>
          <div className="text-[11px] uppercase tracking-[0.4em] text-muted-foreground mt-2">
            Game Store
          </div>
        </div>

        {/* Loader bar */}
        <div className="splash-bar mt-4 h-[2px] w-48 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full w-1/3 bg-primary-gradient splash-bar-fill" />
        </div>
      </div>

      <style>{`
        @keyframes splashLogoIn {
          0% { transform: scale(0.4) rotate(-12deg); opacity: 0; }
          60% { transform: scale(1.08) rotate(2deg); opacity: 1; }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
        @keyframes splashTextIn {
          0% { transform: translateY(20px); opacity: 0; letter-spacing: 0.5em; }
          100% { transform: translateY(0); opacity: 1; letter-spacing: 0.3em; }
        }
        @keyframes splashPulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.15); }
        }
        @keyframes splashBar {
          0% { transform: translateX(-150%); }
          100% { transform: translateX(450%); }
        }
        @keyframes splashGlow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .splash-logo { animation: splashLogoIn 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        .splash-text { animation: splashTextIn 0.8s ease-out 0.4s both; }
        .splash-pulse { animation: splashPulse 1.8s ease-in-out infinite; }
        .splash-bar { animation: splashTextIn 0.6s ease-out 0.7s both; }
        .splash-bar-fill { animation: splashBar 1.2s ease-in-out infinite; }
        .splash-glow { animation: splashGlow 2s ease-in-out infinite; }
        .bg-gradient-radial { background-image: radial-gradient(circle at center, var(--tw-gradient-stops)); }
      `}</style>
    </div>
  );
};

export default SplashScreen;
