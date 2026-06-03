import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Wifi, WifiOff, Gamepad2, Download, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Game } from "@/types/game";

const GameCard = ({ game }: { game: Game }) => {
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [style, setStyle] = useState({
    transform: "perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)",
    glareX: "50%",
    glareY: "50%",
    glareOpacity: 0,
  });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      const gx = ((e.clientX - rect.left) / rect.width) * 100;
      const gy = ((e.clientY - rect.top) / rect.height) * 100;
      setStyle({
        transform: `perspective(800px) rotateX(${-dy * 10}deg) rotateY(${dx * 10}deg) scale3d(1.05,1.05,1.05) translateZ(8px)`,
        glareX: `${gx}%`,
        glareY: `${gy}%`,
        glareOpacity: 0.18,
      });
    });
  };

  const handleLeave = () => {
    cancelAnimationFrame(rafRef.current);
    setStyle({
      transform: "perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1) translateZ(0px)",
      glareX: "50%",
      glareY: "50%",
      glareOpacity: 0,
    });
  };

  return (
    <div
      ref={ref}
      className="cinematic-card-wrapper"
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{
        transform: style.transform,
        transition: "transform 0.15s ease-out",
        transformStyle: "preserve-3d",
        willChange: "transform",
      }}
    >
      <Link
        to={`/game/${game.id}`}
        className="group relative flex flex-col overflow-hidden rounded-xl bg-card-gradient border border-border/60 shadow-card cinematic-card"
      >
        {/* Holographic shimmer overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-10 rounded-xl overflow-hidden"
          style={{
            background: `radial-gradient(circle at ${style.glareX} ${style.glareY}, rgba(255,255,255,0.25) 0%, transparent 55%)`,
            opacity: style.glareOpacity,
            transition: "opacity 0.3s ease",
          }}
        />

        {/* Animated border glow */}
        <div className="absolute inset-0 rounded-xl pointer-events-none z-0 cinematic-border-glow" />

        <div className="relative aspect-[16/9] overflow-hidden bg-surface-2">
          {game.image_url ? (
            <>
              <img
                src={game.image_url}
                alt={game.title}
                loading="lazy"
                className="h-full w-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-110"
              />
              {/* Cinematic film grain overlay */}
              <div className="absolute inset-0 film-grain pointer-events-none opacity-20" />
              {/* Scanlines */}
              <div className="absolute inset-0 scanlines pointer-events-none opacity-10" />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Gamepad2 className="h-12 w-12 opacity-30" />
            </div>
          )}

          {/* Top badges */}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2 z-20">
            {game.featured && (
              <Badge className="bg-accent text-accent-foreground border-0 shadow-glow animate-pulse-badge">
                <Star className="h-3 w-3 mr-1 fill-current" /> Featured
              </Badge>
            )}
            <Badge variant="secondary" className="ml-auto bg-background/70 backdrop-blur-md">
              {game.mode === "online" ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
              {game.mode}
            </Badge>
          </div>

          {/* Hover download overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
            <div className="flex flex-col items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
              <div className="h-12 w-12 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center backdrop-blur-sm">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-semibold text-white/90 uppercase tracking-widest">View Game</span>
            </div>
          </div>

          {/* Bottom gradient */}
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
        </div>

        <div className="flex flex-1 flex-col gap-1.5 p-4 relative z-10">
          <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors duration-300">
            {game.title}
          </h3>
          {game.genre && (
            <p className="text-xs text-muted-foreground line-clamp-1">{game.genre}</p>
          )}
          <div className="mt-auto flex items-center justify-between pt-2">
            <span className="text-sm font-bold text-accent">Free</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 group-hover:text-primary/60 transition-colors duration-300">
              Play now
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default GameCard;
