import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Play, Wifi, WifiOff, Gamepad2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Game } from "@/types/game";

const youtubeId = (url: string): string | null => {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2] || null;
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] || null;
    }
  } catch { /* ignore */ }
  return null;
};

type Slide = { kind: "video" | "image"; url: string; embedUrl?: string; thumb?: string };

const buildSlides = (game: Game): Slide[] => {
  const list: Slide[] = [];
  if (game.trailer_url) {
    const yt = youtubeId(game.trailer_url);
    if (yt) {
      list.push({
        kind: "video",
        url: game.trailer_url,
        embedUrl: `https://www.youtube.com/embed/${yt}?rel=0&autoplay=1&mute=1`,
        thumb: `https://img.youtube.com/vi/${yt}/hqdefault.jpg`,
      });
    } else {
      list.push({ kind: "video", url: game.trailer_url });
    }
  }
  if (game.image_url) list.push({ kind: "image", url: game.image_url });
  for (const s of game.screenshots ?? []) {
    if (s) list.push({ kind: "image", url: s });
  }
  return list;
};

const FeaturedShowcase = ({ games }: { games: Game[] }) => {
  const [activeGameId, setActiveGameId] = useState(games[0]?.id);
  const [slideIdx, setSlideIdx] = useState(0);
  const timer = useRef<number | null>(null);

  const activeGame = games.find((g) => g.id === activeGameId) ?? games[0];
  const slides = activeGame ? buildSlides(activeGame) : [];

  // Reset slide when game changes
  useEffect(() => {
    setSlideIdx(0);
  }, [activeGameId]);

  // Auto-advance slides
  useEffect(() => {
    if (slides.length <= 1) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setSlideIdx((i) => (i + 1) % slides.length);
    }, 5000);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [slideIdx, slides.length]);

  if (!activeGame) return null;

  const current = slides[slideIdx];

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-3 rounded-lg border border-border/60 bg-surface-1 p-3 shadow-card">
      {/* Main viewer */}
      <Link to={`/game/${activeGame.id}`} className="relative aspect-video rounded-md overflow-hidden bg-black group block">
        {current ? (
          current.kind === "video" && current.embedUrl ? (
            <iframe
              key={`${activeGame.id}-${slideIdx}`}
              src={current.embedUrl}
              title={activeGame.title}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="w-full h-full pointer-events-none"
            />
          ) : current.kind === "video" ? (
            <video
              key={`${activeGame.id}-${slideIdx}`}
              src={current.url}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              key={`${activeGame.id}-${slideIdx}`}
              src={current.url}
              alt={activeGame.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Gamepad2 className="h-16 w-16 opacity-30" />
          </div>
        )}

        {/* Overlay gradient + info */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 pointer-events-none">
          <div className="flex items-center gap-2 mb-1.5">
            <Badge className="bg-accent text-accent-foreground">Featured</Badge>
            <Badge variant="secondary" className="bg-background/70 backdrop-blur-md">
              {activeGame.mode === "online" ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
              {activeGame.mode}
            </Badge>
            {activeGame.genre && <Badge variant="outline" className="bg-background/40 border-white/20 text-white">{activeGame.genre}</Badge>}
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">{activeGame.title}</h3>
        </div>

        {/* Slide dots */}
        {slides.length > 1 && (
          <div className="absolute top-3 right-3 flex gap-1.5 pointer-events-none">
            {slides.map((s, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === slideIdx ? "w-6 bg-primary" : "w-1.5 bg-white/40"
                )}
              />
            ))}
          </div>
        )}
      </Link>

      {/* Game list (right sidebar) */}
      <div className="flex flex-col gap-1.5 max-h-[420px] overflow-y-auto pr-1">
        {games.map((g) => {
          const isActive = g.id === activeGame.id;
          return (
            <button
              key={g.id}
              onMouseEnter={() => setActiveGameId(g.id)}
              onClick={() => setActiveGameId(g.id)}
              className={cn(
                "flex items-center gap-3 p-2 rounded-md text-left transition-smooth border",
                isActive
                  ? "bg-primary/15 border-primary/40"
                  : "bg-surface-2/50 border-transparent hover:bg-surface-2 hover:border-border"
              )}
            >
              <div className="relative h-14 w-24 rounded overflow-hidden bg-surface-3 flex-shrink-0">
                {g.image_url ? (
                  <img src={g.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Gamepad2 className="h-5 w-5 opacity-40" />
                  </div>
                )}
                {g.trailer_url && (
                  <div className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-black/70 flex items-center justify-center">
                    <Play className="h-2.5 w-2.5 text-white fill-white" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className={cn("text-sm font-medium truncate", isActive ? "text-foreground" : "text-muted-foreground")}>
                  {g.title}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {g.genre || (g.mode === "online" ? "Online" : "Offline")}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FeaturedShowcase;
