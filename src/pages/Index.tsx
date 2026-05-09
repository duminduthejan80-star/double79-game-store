import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import Navbar from "@/components/Navbar";
import GameCard from "@/components/GameCard";
import FeaturedShowcase from "@/components/FeaturedShowcase";
import VoiceSearchButton from "@/components/VoiceSearchButton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGames } from "@/hooks/useGames";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const { data: games, isLoading } = useGames();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [flash, setFlash] = useState(false);

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
    <div className="min-h-screen">
      <Navbar />


      <section className="relative overflow-hidden border-b border-border/60 bg-surface-1">
        <video
          src="/hero-bg.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/40 pointer-events-none" />
        <div className="container relative mx-auto px-4 py-12 md:py-16">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Double79 Store
            </div>
            <h1 className="mt-3 text-3xl md:text-5xl font-bold leading-tight text-foreground">
              Discover. Download. <span className="text-primary">Play.</span>
            </h1>
            <p className="mt-3 text-base text-muted-foreground max-w-xl">
              Curated titles, free-to-play hits, and premium experiences — all in one place.
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">

        {featured.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Featured</h2>
            <FeaturedShowcase games={featured} />
          </div>
        )}

        <h2 className="text-2xl font-bold mb-4">{filter === "online" ? "Online Games" : filter === "offline" ? "Offline Games" : "All Games"}</h2>
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search games..."
              className="pl-9 pr-12 bg-surface-2 border-border"
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
              <VoiceSearchButton onResult={(t) => setQ(t)} />
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
            No games found. Add some from the Admin panel.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filtered.map((g) => <GameCard key={g.id} game={g} />)}
          </div>
        )}
      </section>
    </div>
  );
};

export default Index;
