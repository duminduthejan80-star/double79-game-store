import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import Navbar from "@/components/Navbar";
import CinematicHero from "@/components/CinematicHero";
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
      const matchesF = filter === "all" || (g.categories || []).includes(filter);
      return matchesQ && matchesF;
    });
  }, [games, q, filter]);

  const featured = useMemo(() => games?.filter((g) => g.featured) ?? [], [games]);

  return (
    <div className="min-h-screen">
      <Navbar />


      <CinematicHero />

      <section className="container mx-auto px-4 py-10">

        {featured.length > 0 && (
          <div className="mb-12 reveal-on-scroll">
            <h2 className="text-2xl font-bold mb-4">Featured</h2>
            <FeaturedShowcase games={featured} />
          </div>
        )}

        <h2 className="text-2xl font-bold mb-4 reveal-on-scroll">{filter === "online" ? "Online Games" : filter === "offline" ? "Offline Games" : "All Games"}</h2>
        <div className="liquid-glass rounded-2xl p-3 flex flex-col md:flex-row md:items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search games..."
              className={cn(
                "pl-9 pr-12 bg-white/5 border-white/10 backdrop-blur-xl transition-all",
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
            <TabsList className="liquid-glass border-0">
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
                className="reveal-on-scroll reveal-3d"
                style={{ transitionDelay: `${Math.min(i, 12) * 60}ms` }}
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
