import { useMemo, useState } from "react";
import { Search, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import GameCard from "@/components/GameCard";
import FeaturedShowcase from "@/components/FeaturedShowcase";
import VoiceSearchButton from "@/components/VoiceSearchButton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGames } from "@/hooks/useGames";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const Index = () => {
  const { data: games, isLoading } = useGames();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [flash, setFlash] = useState(false);
  const [voiceQuery, setVoiceQuery] = useState("");

  const filtered = useMemo(() => {
    if (!games) return [];
    return games.filter((g) => {
      const matchesQ =
        !q ||
        g.title.toLowerCase().includes(q.toLowerCase()) ||
        (g.genre || "").toLowerCase().includes(q.toLowerCase());
      const matchesF =
        filter === "all" ||
        (filter === "online" && g.mode === "online") ||
        (filter === "offline" && g.mode === "offline");
      return matchesQ && matchesF;
    });
  }, [games, q, filter]);

  const featured = useMemo(() => games?.filter((g) => g.featured) ?? [], [games]);

  return (
    <div className="min-h-screen relative">
      {/* Ambient glow orbs */}
      <div className="glow-orb glow-orb-primary" style={{ top: "10%", left: "5%", width: 500, height: 500 }} />
      <div className="glow-orb glow-orb-blue" style={{ top: "30%", right: "0%", width: 400, height: 400 }} />
      <div className="glow-orb glow-orb-accent" style={{ bottom: "20%", left: "30%", width: 350, height: 350 }} />

      <Navbar />

      {/* Hero section */}
      <section className="relative overflow-hidden border-b border-border/60 scene-3d">
        <video
          src="/hero-bg.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none"
        />
        {/* Vignette */}
        <div className="vignette absolute inset-0 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/75 to-background/30 pointer-events-none" />

        {/* Energy grid overlay */}
        <div className="energy-grid absolute inset-0 pointer-events-none opacity-30" />

        {/* Warp speed lines */}
        <div className="warp-line absolute top-[20%] left-0 right-0 pointer-events-none" style={{ animationDelay: "0s" }} />
        <div className="warp-line absolute top-[60%] left-0 right-0 pointer-events-none" style={{ animationDelay: "0.4s" }} />
        <div className="warp-line absolute top-[80%] left-0 right-0 pointer-events-none" style={{ animationDelay: "0.8s" }} />

        <div className="container relative mx-auto px-4 py-14 md:py-20 z-10">
          <div className="max-w-2xl">
            <div className="reveal-up reveal-up-1 flex items-center gap-2 mb-3">
              <Zap className="h-3 w-3 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-primary neon-text">
                Double79 Store
              </span>
            </div>
            <h1 className="reveal-up reveal-up-2 mt-2 text-4xl md:text-6xl font-bold leading-tight text-foreground cinematic-title">
              Discover. Download.{" "}
              <span className="gradient-text-animate">Play.</span>
            </h1>
            <p className="reveal-up reveal-up-3 mt-4 text-base text-muted-foreground max-w-xl leading-relaxed">
              Curated titles, free-to-play hits, and premium experiences — all in one place.
            </p>

            {/* Energy divider */}
            <div className="reveal-up reveal-up-4 energy-divider mt-8 mb-2" />
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10 relative z-10">

        {featured.length > 0 && (
          <div className="mb-12 depth-layer-1">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-primary-gradient rounded-full inline-block" />
              Featured
            </h2>
            <FeaturedShowcase games={featured} />
          </div>
        )}

        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <span className="w-1 h-6 bg-accent-gradient rounded-full inline-block" />
          {filter === "online" ? "Online Games" : filter === "offline" ? "Offline Games" : "All Games"}
        </h2>
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search games..."
              className={cn(
                "pl-9 pr-12 bg-surface-2 border-border transition-all",
                flash && "ring-2 ring-green-500 border-green-500"
              )}
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
              <VoiceSearchButton
                onResult={(t) => {
                  setQ(t);
                  setVoiceQuery(t);
                }}
                onSuccess={() => {
                  setFlash(true);
                  setTimeout(() => setFlash(false), 700);
                }}
              />
            </div>
          </div>
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="bg-surface-2">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="online">Online</TabsTrigger>
              <TabsTrigger value="offline">Offline</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[16/12] rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-16 text-center text-muted-foreground">
            {voiceQuery && q === voiceQuery
              ? `Could not find a match for "${voiceQuery}"`
              : "No games found. Add some from the Admin panel."}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filtered.map((g, i) => (
              <div
                key={g.id}
                className="card-animate-in"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <GameCard game={g} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Index;
