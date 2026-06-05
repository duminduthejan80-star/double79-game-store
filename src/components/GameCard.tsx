import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Wifi, WifiOff, Gamepad2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Game } from "@/types/game";

const GameCard = ({ game }: { game: Game }) => {
  const ref = useRef<HTMLAnchorElement>(null);
  const [t, setT] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, active: false });

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setT({
      rx: (py - 0.5) * -16,
      ry: (px - 0.5) * 18,
      gx: px * 100,
      gy: py * 100,
      active: true,
    });
  };
  const handleLeave = () => setT({ rx: 0, ry: 0, gx: 50, gy: 50, active: false });

  return (
    <Link
      ref={ref}
      to={`/game/${game.id}`}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="group relative flex flex-col overflow-hidden rounded-xl bg-card-gradient border border-border/60 shadow-card will-change-transform animate-fade-in-up"
      style={{
        transformStyle: "preserve-3d",
        transform: `perspective(1000px) rotateX(${t.rx}deg) rotateY(${t.ry}deg) translateZ(0) ${t.active ? "scale(1.06) translateY(-6px)" : ""}`,
        transition: "transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.35s ease, border-color 0.35s ease",
        boxShadow: t.active
          ? "0 30px 70px -20px hsl(210 95% 55% / 0.7), 0 0 50px hsl(var(--primary) / 0.55), 0 0 0 1px hsl(210 95% 65% / 0.4) inset"
          : undefined,
        borderColor: t.active ? "hsl(210 95% 65% / 0.8)" : undefined,
      }}
    >
      {/* Animated neon border gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-xl z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `conic-gradient(from ${t.gx * 3.6}deg, hsl(204 100% 60% / 0.6), hsl(180 100% 60% / 0.4), hsl(265 95% 65% / 0.5), hsl(204 100% 60% / 0.6))`,
          filter: "blur(8px)",
          zIndex: -1,
        }}
      />
      {/* Neon glare overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(500px circle at ${t.gx}% ${t.gy}%, hsl(210 100% 75% / 0.28), transparent 45%)`,
          mixBlendMode: "screen",
        }}
      />
      {/* Specular shine sweep */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-xl"
        style={{ transform: "translateZ(40px)" }}
      >
        <div
          className="absolute -inset-y-10 -left-1/2 w-1/3 opacity-0 group-hover:opacity-70 transition-opacity duration-500"
          style={{
            background: "linear-gradient(115deg, transparent 0%, hsl(0 0% 100% / 0.25) 50%, transparent 100%)",
            transform: `translateX(${t.gx * 4}%) skewX(-20deg)`,
            transition: "transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
        />
      </div>

      <div className="relative aspect-[16/9] overflow-hidden bg-surface-2">
        {game.image_url ? (
          <img
            src={game.image_url}
            alt={game.title}
            loading="lazy"
            className="h-full w-full object-cover transition-smooth group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Gamepad2 className="h-12 w-12 opacity-30" />
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2">
          {game.featured && (
            <Badge className="bg-accent text-accent-foreground border-0">Featured</Badge>
          )}
          <Badge variant="secondary" className="ml-auto bg-background/70 backdrop-blur-md">
            {game.mode === "online" ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
            {game.mode}
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground line-clamp-1">{game.title}</h3>
        </div>
        {game.genre && (
          <p className="text-xs text-muted-foreground line-clamp-1">{game.genre}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-sm font-bold text-accent">Free</span>
        </div>
      </div>
    </Link>
  );
};

export default GameCard;
