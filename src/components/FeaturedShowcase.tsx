import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Play, Wifi, WifiOff, Gamepad2, ChevronLeft, ChevronRight } from "lucide-react";
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
  if (game.image_url) list.push({ kind: "image", url: game.image_url });
  for (const s of game.screenshots ?? []) {
    if (s) list.push({ kind: "image", url: s });
  }
  if (game.trailer_url) {
    const yt = youtubeId(game.trailer_url);
    if (yt) {
      list.push({
        kind: "video",
        url: game.trailer_url,
        embedUrl: `https://www.youtube.com/embed/${yt}?rel=0&autoplay=1&mute=1&controls=0&modestbranding=1&vq=hd1080&hd=1`,
        thumb: `https://img.youtube.com/vi/${yt}/maxresdefault.jpg`,
      });
    } else {
      list.push({ kind: "video", url: game.trailer_url, thumb: game.image_url || undefined });
    }
  }
  return list;
};

const FeaturedShowcase = ({ games }: { games: Game[] }) => {
  const [gameIdx, setGameIdx] = useState(0);
  const [slideIdx, setSlideIdx] = useState(0);
  const timer = useRef<number | null>(null);

  const activeGame = games[gameIdx];
  const slides = activeGame ? buildSlides(activeGame) : [];
  const current = slides[slideIdx];

  // Reset slide when game changes
  useEffect(() => {
    setSlideIdx(0);
  }, [gameIdx]);

  // Auto-advance: cycle through slides; when reaching end, move to next game
  useEffect(() => {
    if (!activeGame) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (slideIdx < slides.length - 1) {
        setSlideIdx(slideIdx + 1);
      } else if (games.length > 1) {
        setGameIdx((gameIdx + 1) % games.length);
      } else {
        setSlideIdx(0);
      }
    }, 6000);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [slideIdx, gameIdx, slides.length, games.length, activeGame]);

  if (!activeGame) return null;

  const goGame = (dir: 1 | -1) => setGameIdx((i) => (i + dir + games.length) % games.length);

  return (
    <div className="space-y-3">
      {/* Game switcher header (only if multiple featured games) */}
      {games.length > 1 && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-foreground font-semibold">{gameIdx + 1}</span>
            <span>/ {games.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goGame(-1)}
              className="h-8 w-8 rounded-md bg-surface-2 hover:bg-surface-3 flex items-center justify-center transition-smooth"
              aria-label="Previous game"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => goGame(1)}
              className="h-8 w-8 rounded-md bg-surface-2 hover:bg-surface-3 flex items-center justify-center transition-smooth"
              aria-label="Next game"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_220px] gap-3 rounded-lg border border-border/60 bg-surface-1 p-3 shadow-card">
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

          {/* Overlay info */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 pointer-events-none">
            <div className="flex items-center gap-2 mb-1.5">
              <Badge className="bg-accent text-accent-foreground">Featured</Badge>
              <Badge variant="secondary" className="bg-background/70 backdrop-blur-md">
                {activeGame.mode === "online" ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                {activeGame.mode}
              </Badge>
              {activeGame.genre && (
                <Badge variant="outline" className="bg-background/40 border-white/20 text-white">{activeGame.genre}</Badge>
              )}
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">{activeGame.title}</h3>
          </div>
        </Link>

        {/* Right: this game's media thumbnails (Steam-style) */}
        <div className="flex flex-col gap-1.5 max-h-[420px] overflow-y-auto pr-1">
          {slides.length === 0 && (
            <div className="text-xs text-muted-foreground p-3 text-center">No media</div>
          )}
          {slides.map((s, i) => {
            const isActive = i === slideIdx;
            return (
              <button
                key={s.url + i}
                onMouseEnter={() => setSlideIdx(i)}
                onClick={() => setSlideIdx(i)}
                className={cn(
                  "relative aspect-video rounded overflow-hidden bg-surface-3 ring-2 transition-smooth flex-shrink-0",
                  isActive ? "ring-primary" : "ring-transparent hover:ring-border"
                )}
                aria-label={`View media ${i + 1}`}
              >
                {s.kind === "video" ? (
                  <>
                    {s.thumb ? (
                      <img src={s.thumb} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-surface-3" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Play className="h-5 w-5 text-white fill-white" />
                    </div>
                  </>
                ) : (
                  <img src={s.url} alt="" className="w-full h-full object-cover" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FeaturedShowcase;
