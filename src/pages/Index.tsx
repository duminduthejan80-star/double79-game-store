import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import CinematicHero from "@/components/CinematicHero";
import GameCard from "@/components/GameCard";
import { useGames } from "@/hooks/useGames";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const Index = () => {
  const { data: games, isLoading } = useGames();
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Press "/" to reveal the hidden search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !searchOpen) {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape" && searchOpen) {
        setSearchOpen(false);
        setQ("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  const filtered = useMemo(() => {
    if (!games) return [];
    return games.filter((g) => {
      if (!q) return true;
      const s = q.toLowerCase();
      return (
        g.title.toLowerCase().includes(s) ||
        (g.genre || "").toLowerCase().includes(s)
      );
    });
  }, [games, q]);

  return (
    <div className="min-h-screen">
      <Navbar />

      <CinematicHero />

      <section className="mx-auto max-w-6xl px-8 py-24">
        {/* barely-there section marker */}
        <div className="flex items-baseline justify-between mb-16">
          <div className="text-[10px] tracking-[0.5em] uppercase text-muted-foreground">
            the collection
          </div>
          <button
            onClick={() => setSearchOpen((v) => !v)}
            className="text-[10px] tracking-[0.5em] uppercase text-muted-foreground hover:text-foreground"
          >
            {searchOpen ? "close" : "search"}
          </button>
        </div>

        {/* Hidden search — slides in only when asked */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
            searchOpen ? "max-h-24 opacity-100 mb-12" : "max-h-0 opacity-0"
          )}
        >
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="type a title, or press esc"
            className="w-full bg-transparent border-0 border-b border-border py-4 text-lg font-light tracking-wide text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/40 transition-colors duration-[900ms]"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-16">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-32 text-center text-[10px] tracking-[0.4em] uppercase text-muted-foreground/50">
            nothing found · quiet here
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-16">
            {filtered.map((g, i) => (
              <div
                key={g.id}
                className="reveal-on-scroll is-visible"
                style={{ transitionDelay: `${Math.min(i, 12) * 120}ms` }}
              >
                <GameCard game={g} />
              </div>
            ))}
          </div>
        )}

        <div className="mt-32 text-center text-[9px] tracking-[0.5em] uppercase text-muted-foreground/30">
          press / to search · hover top to navigate
        </div>
      </section>
    </div>
  );
};

export default Index;
