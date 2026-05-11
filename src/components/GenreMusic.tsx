import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Direct, CORS-friendly royalty-free MP3s (Pixabay CDN).
const musicMap: Record<string, string> = {
  horror:     "https://cdn.pixabay.com/download/audio/2022/10/25/audio_946203c81e.mp3", // eerie ambient
  shooter:    "https://cdn.pixabay.com/download/audio/2022/03/10/audio_270f49b83e.mp3", // fast industrial
  racing:     "https://cdn.pixabay.com/download/audio/2022/05/16/audio_1d3c0f6ea1.mp3", // high-energy rock
  simulation: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0c6ff1bdd.mp3", // calm lo-fi
};

const TARGET_VOLUME = 0.5;
const FADE_MS = 800;

const BLOCKED = ["active", "adventure"];

const CATEGORY_RULES: { category: keyof typeof musicMap; keywords: string[] }[] = [
  { category: "horror",     keywords: ["horror", "mystery", "psychological", "survival horror"] },
  { category: "shooter",    keywords: ["shooting", "shooter", "fps", "tps", "action", "battle royale", "fighting", "fighter"] },
  { category: "racing",     keywords: ["racing", "race", "driving", "cars", "car", "sport", "sports"] },
  { category: "simulation", keywords: ["simulation", "sim", "indie", "casual", "strategy", "rpg", "puzzle", "open world", "sandbox", "stealth", "survival"] },
];

function pickCategory(genre?: string | null): keyof typeof musicMap | null {
  if (!genre) return null;
  const tags = genre
    .toLowerCase()
    .split(/[,/|;]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => !BLOCKED.includes(t));
  if (tags.length === 0) return null;
  const joined = " " + tags.join(" ") + " ";
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => joined.includes(kw))) return rule.category;
  }
  return "simulation"; // default to calm lo-fi for unmapped non-blocked genres
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

const GenreMusic = ({ genre }: { genre?: string | null }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState<boolean>(() => localStorage.getItem("genreMusicMuted") === "1");
  const [ready, setReady] = useState(false);

  // Listen for the first user interaction so play() is allowed by the browser.
  useEffect(() => {
    if (ready) return;
    const trigger = () => {
      console.log("[GenreMusic] user interaction detected → enabling audio");
      setReady(true);
    };
    const opts = { once: true, capture: true } as AddEventListenerOptions;
    window.addEventListener("pointerdown", trigger, opts);
    window.addEventListener("keydown", trigger, opts);
    window.addEventListener("touchstart", trigger, opts);
    window.addEventListener("click", trigger, opts);
    return () => {
      window.removeEventListener("pointerdown", trigger, opts);
      window.removeEventListener("keydown", trigger, opts);
      window.removeEventListener("touchstart", trigger, opts);
      window.removeEventListener("click", trigger, opts);
    };
  }, [ready]);

  // Single audio instance + STRICT cleanup on unmount (leaving the page).
  useEffect(() => {
    const a = new Audio();
    a.loop = true;
    a.preload = "auto";
    a.crossOrigin = "anonymous";
    a.volume = 0;
    audioRef.current = a;
    console.log("[GenreMusic] audio element created");
    return () => {
      console.log("[GenreMusic] cleanup → stopping audio");
      try {
        a.pause();
        a.src = "";
        a.removeAttribute("src");
        a.load();
      } catch {}
      audioRef.current = null;
    };
  }, []);

  // Play / swap track when genre or readiness changes.
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !ready) return;

    const category = pickCategory(genre);
    console.log("[GenreMusic] Current Genre:", genre, "→ category:", category);

    if (!category) {
      try { a.pause(); a.src = ""; } catch {}
      return;
    }

    const url = musicMap[category];
    const start = () => {
      if (!audioRef.current) return;
      try { a.pause(); } catch {}
      a.src = url;
      a.load();
      a.volume = 0;
      const target = muted ? 0 : TARGET_VOLUME;
      console.log(`[GenreMusic] Playing ${category} music →`, url);
      const p = a.play();
      if (p && typeof p.then === "function") {
        p.then(() => fade(a, target, FADE_MS))
         .catch((err) => console.warn("[GenreMusic] play() blocked:", err));
      }
    };

    if (a.src && !a.paused) {
      fade(a, 0, FADE_MS, start);
    } else {
      start();
    }
  }, [genre, ready, muted]);

  // Mute toggle persists
  useEffect(() => {
    const a = audioRef.current;
    localStorage.setItem("genreMusicMuted", muted ? "1" : "0");
    if (!a) return;
    fade(a, muted ? 0 : TARGET_VOLUME, 300);
  }, [muted]);

  return (
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
  );
};

export default GenreMusic;
