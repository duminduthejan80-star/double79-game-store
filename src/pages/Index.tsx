import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import Navbar from "@/components/Navbar";
import GameCard from "@/components/GameCard";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGames } from "@/hooks/useGames";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const { data: games, isLoading } = useGames();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");

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

  const featured = useMemo(() => games?.filter((g) => g.featured).slice(0, 3) ?? [], [games]);

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="relative overflow-hidden bg-hero border-b border-border/60">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl">
            <div className="inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-widest text-primary-glow">
              Official Store
            </div>
            <h1 className="mt-4 text-4xl md:text-6xl font-bold leading-tight">
              Discover. Download. <span className="bg-primary-gradient bg-clip-text text-transparent">Play.</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-xl">
              The official Double79 game library — curated titles, free-to-play hits, and premium experiences.
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search games..."
              className="pl-9 bg-surface-2 border-border"
            />
          </div>
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="bg-surface-2">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="online">Online</TabsTrigger>
              <TabsTrigger value="offline">Offline</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {featured.length > 0 && filter === "all" && !q && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Featured</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {featured.map((g) => <GameCard key={g.id} game={g} />)}
            </div>
          </div>
        )}

        <h2 className="text-2xl font-bold mb-4">All Games</h2>
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
