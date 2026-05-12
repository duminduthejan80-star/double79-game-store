import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * NOTE on tracks:
 * The user-supplied Pixabay CDN URLs (cdn.pixabay.com/audio/...) all return HTTP 403
 * (hotlinking blocked) and will not play in any browser. We substitute equivalent
 * royalty-free tracks from incompetech.com (Kevin MacLeod) — verified 200 OK,
 * CORS-friendly, and matched by mood to each requested category.
 */
const musicMap: Record<string, { url: string; label: string }> = {
  horror:     { url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/The%20House%20of%20Leaves.mp3", label: "Horror" },
  shooter:    { url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Industrial%20Cinematic.mp3",   label: "Shooter" },
  racing:     { url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Rocket.mp3",                   label: "Racing" },
  fighting:   { url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Cyborg%20Ninja.mp3",           label: "Fighting" },
  action:     { url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Hero%20Theme.mp3",             label: "Action" },
  adventure:  { url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Rising%20Game.mp3",            label: "Adventure" },
  simulation: { url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Healing.mp3",                  label: "Simulation" },
};

const TARGET_VOLUME = 0.4;
const FADE_MS = 1500; // 1.5s fade-in

// Tags we never use to decide music.
const BLOCKED = ["active", "live"];

const CATEGORY_RULES: { category: keyof typeof musicMap; keywords: string[] }[] = [
  { category: "horror",     keywords: ["horror", "mystery", "thriller", "psychological", "survival horror"] },
  { category: "racing",     keywords: ["racing", "race", "driving", "cars", "car", "sport", "sports", "high-speed"] },
  { category: "fighting",   keywords: ["fighting", "fighter", "beat 'em up", "arcade", "brawler"] },
  { category: "shooter",    keywords: ["shooting", "shooter", "fps", "tps", "war", "battle royale"] },
  { category: "action",     keywords: ["action", "combat", "hack and slash"] },
  { category: "adventure",  keywords: ["adventure", "rpg", "role-playing", "role playing", "mmorpg", "jrpg", "story"] },
  { category: "simulation", keywords: ["simulation", "sim", "strategy", "tycoon", "rts", "tactics", "management", "puzzle", "indie", "casual", "sandbox", "open world", "lo-fi", "lofi"] },
];

function pickCategory(genre?: string | null): keyof typeof musicMap | null {
  if (!genre) return null;
  const tags = genre.toLowerCase().split(/[,/|;]+/).map((t) => t.trim()).filter(Boolean).filter((t) => !BLOCKED.includes(t));
  if (tags.length === 0) return null;
  const joined = " " + tags.join(" ") + " ";
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => joined.includes(kw))) return rule.category;
  }
  return "simulation";
}

function fade(audio: HTMLAudioElement, to: number, ms: number, onDone?: () => void) {
  const from = audio.volume;
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / ms);
    audio.volume = Math.max(0, Math.min(1, from + (to - from) * t));
    if (t < 1) requestAnimationFrame(step);
    else onDone?.();
  };
  requestAnimationFrame(step);
}

type Status = "idle" | "loading" | "playing";

const GenreMusic = ({ genre }: { genre?: string | null }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState<boolean>(() => localStorage.getItem("genreMusicMuted") === "1");
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<Status>("idle");

  const category = pickCategory(genre);
  const label = category ? musicMap[category].label : null;

  // Global click/keyboard listener — unlocks audio after first user interaction.
  useEffect(() => {
    if (ready) return;
    const trigger = () => setReady(true);
    const opts = { once: true, capture: true } as AddEventListenerOptions;
    window.addEventListener("click", trigger, opts);
    window.addEventListener("pointerdown", trigger, opts);
    window.addEventListener("keydown", trigger, opts);
    window.addEventListener("touchstart", trigger, opts);
    return () => {
      window.removeEventListener("click", trigger, opts);
      window.removeEventListener("pointerdown", trigger, opts);
      window.removeEventListener("keydown", trigger, opts);
      window.removeEventListener("touchstart", trigger, opts);
    };
  }, [ready]);

  // Single audio instance + STRICT cleanup on unmount.
  useEffect(() => {
    const a = new Audio();
    a.loop = true;
    a.preload = "auto";
    a.volume = 0;
    audioRef.current = a;
    return () => {
      try { a.pause(); a.src = ""; a.removeAttribute("src"); a.load(); } catch {}
      audioRef.current = null;
    };
  }, []);

  // Load + play whenever genre, ready, or mute changes.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    console.log("[GenreMusic] Current Genre:", genre, "→ category:", category);

    if (!category) {
      try { a.pause(); a.src = ""; } catch {}
      setStatus("idle");
      return;
    }

    const { url } = musicMap[category];

    const onPlaying = () => setStatus("playing");
    const onWaiting = () => setStatus("loading");
    a.addEventListener("playing", onPlaying);
    a.addEventListener("waiting", onWaiting);

    const start = () => {
      if (!audioRef.current) return;
      try { a.pause(); } catch {}
      a.src = url;
      a.load();
      a.volume = 0;
      setStatus("loading");
      const target = muted ? 0 : TARGET_VOLUME;
      const p = a.play();
      if (p && typeof p.then === "function") {
        p.then(() => {
          setStatus("playing");
          fade(a, target, FADE_MS);
        }).catch((err) => {
          console.warn("[GenreMusic] play() blocked — waiting for click:", err?.message || err);
        });
      }
    };

    if (a.src && !a.paused) {
      fade(a, 0, 400, start);
    } else {
      start();
    }

    return () => {
      a.removeEventListener("playing", onPlaying);
      a.removeEventListener("waiting", onWaiting);
    };
  }, [genre, category, ready, muted]);

  // Mute toggle persistence.
  useEffect(() => {
    const a = audioRef.current;
    localStorage.setItem("genreMusicMuted", muted ? "1" : "0");
    if (!a) return;
    fade(a, muted ? 0 : TARGET_VOLUME, 300);
  }, [muted]);

  return (
    <div className="flex items-center gap-2">
      {category && (
        <span className="text-xs text-muted-foreground hidden sm:inline-block">
          {status === "loading" && "🎵 Loading Audio..."}
          {status === "playing" && !muted && `🎵 Playing ${label} Theme`}
          {status === "playing" && muted && `🔇 ${label} Theme (muted)`}
          {status === "idle" && "🎵 Click anywhere to start"}
        </span>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMuted((m) => !m)}
            className="h-9 w-9 rounded-full glass border-primary/30 hover:border-primary hover:shadow-glow transition-smooth"
            aria-label={muted ? "Unmute music" : "Mute music"}
          >
            {muted ? (
              <VolumeX className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Volume2 className="h-4 w-4 text-primary" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{muted ? "Unmute genre music" : "Mute genre music"}</TooltipContent>
      </Tooltip>
    </div>
  );
};

export default GenreMusic;
