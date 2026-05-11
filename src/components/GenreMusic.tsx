import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Royalty-free tracks (Pixabay CDN, direct .mp3) — distinct vibe per category.
const musicMap: Record<string, string> = {
  horror:     "https://cdn.pixabay.com/download/audio/2022/10/25/audio_946203c81e.mp3", // dark eerie ambient pad
  shooter:    "https://cdn.pixabay.com/download/audio/2022/03/10/audio_270f49b83e.mp3", // heavy industrial / electronic
  fighting:   "https://cdn.pixabay.com/download/audio/2023/06/06/audio_2d68f9a54c.mp3", // hybrid orchestral / trap
  action:     "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3", // epic cinematic orchestral
  racing:     "https://cdn.pixabay.com/download/audio/2022/05/16/audio_1d3c0f6ea1.mp3", // high-tempo synthwave / rock
  stealth:    "https://cdn.pixabay.com/download/audio/2022/11/22/audio_febc508a42.mp3", // calm but tense atmospheric
  simulation: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0c6ff1bdd.mp3", // relaxing lo-fi / acoustic
  rpg:        "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3", // epic fantasy
  strategy:   "https://cdn.pixabay.com/download/audio/2022/10/18/audio_4d92b67b88.mp3", // ambient strategy
  puzzle:     "https://cdn.pixabay.com/download/audio/2022/10/18/audio_4d92b67b88.mp3", // chill
  default:    "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3", // general gaming
};

const TARGET_VOLUME = 0.3;
const FADE_MS = 1200;

// Priority order: most intense / specific first. Horror always wins over Action, etc.
const CATEGORY_RULES: { category: string; keywords: string[] }[] = [
  { category: "horror",     keywords: ["horror", "mystery", "survival horror"] },
  { category: "fighting",   keywords: ["fighting", "fighter", "brawler", "beat 'em up", "beat em up"] },
  { category: "shooter",    keywords: ["shooter", "fps", "tps", "battle royale"] },
  { category: "racing",     keywords: ["racing", "driving", "sport", "sports"] },
  { category: "stealth",    keywords: ["stealth", "open world", "open-world", "sandbox"] },
  { category: "rpg",        keywords: ["rpg", "role-playing", "role playing", "role"] },
  { category: "action",     keywords: ["action", "adventure", "platformer", "hack and slash"] },
  { category: "simulation", keywords: ["simulation", "sim", "indie", "casual", "life sim"] },
  { category: "strategy",   keywords: ["strategy", "rts", "turn-based", "tactics"] },
  { category: "puzzle",     keywords: ["puzzle", "trivia", "word"] },
];

// Pick a category from genre keywords with a clear priority order.
function pickCategory(genre?: string | null): string {
  if (!genre) return "default";
  const g = genre.toLowerCase();
  const tokens = g.split(/[,\/|;&+]+|\s-\s/).map((t) => t.trim()).filter(Boolean);
  const haystack = tokens.length ? tokens : [g];
  const match = CATEGORY_RULES.find((rule) =>
    rule.keywords.some((kw) => haystack.some((t) => t.includes(kw)) || g.includes(kw))
  );
  return match?.category ?? "default";
}

function pickTrack(genre?: string | null): { url: string; label: string; category: string } {
  const category = pickCategory(genre);
  const url = musicMap[category] ?? musicMap.default;
  const label = category === "default" ? "General Gaming" : category.charAt(0).toUpperCase() + category.slice(1);
  console.log("Current Genre:", genre);
  console.log("Playing Music for:", category);
  return { url, label, category };
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

  // Create audio element once
  useEffect(() => {
    const a = new Audio();
    a.loop = true;
    a.preload = "auto";
    a.volume = 0;
    audioRef.current = a;
    return () => {
      try { fade(a, 0, FADE_MS, () => { a.pause(); a.src = ""; }); } catch {}
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

  // Crossfade when track or readiness changes
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !ready) return;
    const { url, label } = pickTrack(genre);
    const swap = (src: string, isFallback = false) => {
      a.src = src;
      a.volume = 0;
      const target = muted ? 0 : TARGET_VOLUME;
      console.log(`Playing ${isFallback ? "General Gaming (fallback)" : label} music`);
      a.play().then(() => fade(a, target, FADE_MS)).catch(() => {});
    };
    const onErr = () => {
      if (a.src !== musicMap.default) {
        console.warn(`Failed to load ${label} track, switching to default`);
        swap(musicMap.default, true);
      }
    };
    a.onerror = onErr;
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
