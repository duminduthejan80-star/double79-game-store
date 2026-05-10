import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Royalty-free ambient tracks (Pixabay CDN, direct .mp3)
const GENRE_TRACKS: Record<string, string> = {
  horror: "https://cdn.pixabay.com/download/audio/2022/10/25/audio_946203c81e.mp3",
  action: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3",
  racing: "https://cdn.pixabay.com/download/audio/2022/08/23/audio_d16737dc28.mp3",
  rpg: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
  adventure: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
  shooter: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3",
  fps: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3",
  strategy: "https://cdn.pixabay.com/download/audio/2022/10/18/audio_4d92b67b88.mp3",
  puzzle: "https://cdn.pixabay.com/download/audio/2022/10/18/audio_4d92b67b88.mp3",
  sports: "https://cdn.pixabay.com/download/audio/2022/08/23/audio_d16737dc28.mp3",
  simulation: "https://cdn.pixabay.com/download/audio/2022/10/18/audio_4d92b67b88.mp3",
  default: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
};

const TARGET_VOLUME = 0.3;
const FADE_MS = 1200;

function pickTrack(genre?: string | null): { url: string; label: string } {
  if (!genre) return { url: GENRE_TRACKS.default, label: "General Gaming" };
  const g = genre.toLowerCase();
  for (const key of Object.keys(GENRE_TRACKS)) {
    if (key === "default") continue;
    if (g.includes(key)) return { url: GENRE_TRACKS[key], label: key.charAt(0).toUpperCase() + key.slice(1) };
  }
  return { url: GENRE_TRACKS.default, label: "General Gaming" };
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
  const trackUrl = pickTrack(genre);

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
      if (a.src !== GENRE_TRACKS.default) {
        console.warn(`Failed to load ${label} track, switching to default`);
        swap(GENRE_TRACKS.default, true);
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
