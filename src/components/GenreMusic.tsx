import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Royalty-free tracks (Pixabay CDN, direct .mp3) — distinct vibe per category.
const musicMap: Record<string, string> = {
  horror:     "https://cdn.pixabay.com/download/audio/2022/10/25/audio_946203c81e.mp3", // scary eerie ambient
  shooter:    "https://cdn.pixabay.com/download/audio/2022/03/10/audio_270f49b83e.mp3", // intense combat beats
  racing:     "https://cdn.pixabay.com/download/audio/2022/05/16/audio_1d3c0f6ea1.mp3", // energetic rock / electronic
  simulation: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0c6ff1bdd.mp3", // calm lo-fi
  survival:   "https://cdn.pixabay.com/download/audio/2022/11/22/audio_febc508a42.mp3", // tense atmospheric loop
  fighting:   "https://cdn.pixabay.com/download/audio/2023/06/06/audio_2d68f9a54c.mp3",
  rpg:        "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
};

const TARGET_VOLUME = 0.3;
const FADE_MS = 1200;

// Keywords that must NEVER trigger music. They are stripped from the genre
// before category matching.
const BLOCKED_KEYWORDS = ["active", "adventure"];

// Priority order: most intense / specific first. Horror always wins.
// NOTE: "action" intentionally maps to shooter (intense combat beats) per spec.
const CATEGORY_RULES: { category: string; keywords: string[] }[] = [
  { category: "horror",     keywords: ["horror", "psychological horror", "mystery", "survival horror"] },
  { category: "shooter",    keywords: ["shooter", "shooting", "fps", "tps", "battle royale", "action"] },
  { category: "racing",     keywords: ["racing", "driving", "sport", "sports"] },
  { category: "survival",   keywords: ["survival", "open world", "open-world", "sandbox", "stealth"] },
  { category: "fighting",   keywords: ["fighting", "fighter", "brawler", "beat 'em up", "beat em up"] },
  { category: "rpg",        keywords: ["rpg", "role-playing", "role playing"] },
  { category: "simulation", keywords: ["simulation", "strategy", "indie", "rts", "turn-based", "tactics", "casual", "puzzle"] },
];

// Returns category, or null if the genre is empty / only contains blocked keywords.
function pickCategory(genre?: string | null): string | null {
  if (!genre) return null;
  // Split by common separators, lowercase, drop blocked tags entirely.
  const tags = genre
    .toLowerCase()
    .split(/[,/|;]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => !BLOCKED_KEYWORDS.some((b) => t === b || t.includes(b)));

  if (tags.length === 0) return null; // only "Active" / "Adventure" → silent
  const joined = tags.join(" ");
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => joined.includes(kw))) return rule.category;
  }
  return null;
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

  // STRICT cleanup: destroy the audio element on unmount so leaving the
  // Game Details page (or clicking Back) immediately kills the audio.
  useEffect(() => {
    const a = new Audio();
    a.loop = true;
    a.preload = "auto";
    a.volume = 0;
    audioRef.current = a;
    return () => {
      try {
        a.pause();
        a.removeAttribute("src");
        a.src = "";
        a.load();
      } catch {}
      audioRef.current = null;
    };
  }, []);

  // Start on first user interaction (autoplay bypass)
  useEffect(() => {
    if (ready) return;
    const trigger = () => {
      setReady(true);
      window.removeEventListener("pointerdown", trigger);
      window.removeEventListener("keydown", trigger);
      window.removeEventListener("touchstart", trigger);
    };
    window.addEventListener("pointerdown", trigger, { once: true });
    window.addEventListener("keydown", trigger, { once: true });
    window.addEventListener("touchstart", trigger, { once: true });
    return () => {
      window.removeEventListener("pointerdown", trigger);
      window.removeEventListener("keydown", trigger);
      window.removeEventListener("touchstart", trigger);
    };
  }, [ready]);

  // Pick + crossfade the right track. If category is null → stay silent.
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !ready) return;
    const category = pickCategory(genre);
    console.log("Current Genre:", genre);
    console.log("Playing Music for:", category ?? "(silent — blocked or unmapped)");

    if (!category) {
      // Silence: fade out and clear src so nothing plays.
      if (!a.paused) {
        fade(a, 0, FADE_MS, () => {
          try { a.pause(); a.src = ""; a.load(); } catch {}
        });
      }
      return;
    }

    const url = musicMap[category];
    const swap = (src: string) => {
      if (!audioRef.current) return;
      try { a.pause(); } catch {}
      a.src = src;
      a.volume = 0;
      const target = muted ? 0 : TARGET_VOLUME;
      a.play().then(() => fade(a, target, FADE_MS)).catch(() => {});
    };
    a.onerror = () => { /* silent on failure — no fallback per spec */ };

    if (a.src && !a.paused) {
      fade(a, 0, FADE_MS, () => swap(url));
    } else {
      swap(url);
    }
  }, [genre, ready]);

  // Respond to mute toggle
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    localStorage.setItem("genreMusicMuted", muted ? "1" : "0");
    fade(a, muted ? 0 : TARGET_VOLUME, 400);
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
