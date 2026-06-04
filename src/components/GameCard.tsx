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
      rx: (py - 0.5) * -10,
      ry: (px - 0.5) * 12,
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
      className="group relative flex flex-col overflow-hidden rounded-lg bg-card-gradient border border-border/60 shadow-card will-change-transform animate-fade-in-up"
      style={{
        transformStyle: "preserve-3d",
        transform: `perspective(900px) rotateX(${t.rx}deg) rotateY(${t.ry}deg) translateZ(0) ${t.active ? "scale(1.03)" : ""}`,
        transition: "transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease, border-color 0.3s ease",
        boxShadow: t.active
          ? "0 20px 50px -15px hsl(210 95% 55% / 0.55), 0 0 30px hsl(var(--primary) / 0.4)"
          : undefined,
        borderColor: t.active ? "hsl(210 95% 60% / 0.6)" : undefined,
      }}
    >
      {/* Neon glare overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(420px circle at ${t.gx}% ${t.gy}%, hsl(210 95% 70% / 0.18), transparent 45%)`,
          mixBlendMode: "screen",
        }}
      />
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
