import { useMemo, useState } from "react";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type MediaItem = { type: "video" | "image"; url: string; embedUrl?: string; thumb?: string };

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

const buildVideo = (url: string): MediaItem => {
  const yt = youtubeId(url);
  if (yt) {
    return {
      type: "video",
      url,
      embedUrl: `https://www.youtube.com/embed/${yt}?rel=0`,
      thumb: `https://img.youtube.com/vi/${yt}/hqdefault.jpg`,
    };
  }
  return { type: "video", url };
};

interface Props {
  cover?: string | null;
  trailerUrl?: string | null;
  screenshots?: string[];
  title: string;
}

const MediaGallery = ({ cover, trailerUrl, screenshots = [], title }: Props) => {
  const items = useMemo<MediaItem[]>(() => {
    const list: MediaItem[] = [];
    if (trailerUrl) list.push(buildVideo(trailerUrl));
    const imgs = [...(cover ? [cover] : []), ...screenshots].filter(Boolean);
    const seen = new Set<string>();
    for (const u of imgs) {
      if (!seen.has(u)) {
        seen.add(u);
        list.push({ type: "image", url: u });
      }
    }
    return list;
  }, [cover, trailerUrl, screenshots]);

  const [active, setActive] = useState(0);

  if (items.length === 0) {
    return <div className="aspect-video rounded-lg bg-surface-2" />;
  }

  const current = items[active];
  const go = (dir: 1 | -1) => setActive((i) => (i + dir + items.length) % items.length);

  return (
    <div className="space-y-3">
      <div className="relative aspect-video rounded-lg overflow-hidden bg-black shadow-elevated group">
        {current.type === "video" ? (
          current.embedUrl ? (
            <iframe
              key={current.url}
              src={current.embedUrl}
              title={`${title} trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          ) : (
            <video key={current.url} src={current.url} controls className="w-full h-full object-contain bg-black" />
          )
        ) : (
          <>
            <img
              src={current.url}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-50"
            />
            <img
              src={current.url}
              alt={`${title} screenshot`}
              loading="eager"
              decoding="async"
              className="relative w-full h-full object-contain"
            />
          </>
        )}


        {items.length > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {items.length > 1 && (
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 gap-2">
          {items.map((it, i) => (
            <button
              key={it.url + i}
              onClick={() => setActive(i)}
              className={cn(
                "relative aspect-video rounded overflow-hidden bg-surface-2 ring-2 transition-smooth",
                i === active ? "ring-primary" : "ring-transparent hover:ring-border"
              )}
              aria-label={`View media ${i + 1}`}
            >
              {it.type === "video" ? (
                <>
                  {it.thumb ? (
                    <img src={it.thumb} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-surface-3" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Play className="h-4 w-4 text-white fill-white" />
                  </div>
                </>
              ) : (
                <img src={it.url} alt="" className="w-full h-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaGallery;
