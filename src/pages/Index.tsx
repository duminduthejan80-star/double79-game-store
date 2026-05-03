import { useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";
import Navbar from "@/components/Navbar";
import GameCard from "@/components/GameCard";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGames } from "@/hooks/useGames";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

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

  const featured = useMemo(() => games?.filter((g) => g.featured) ?? [], [games]);
  const autoplay = useRef(Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true }));

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="relative overflow-hidden border-b border-border/60 bg-surface-1">
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
            <Carousel
              opts={{ align: "start", loop: true }}
              plugins={[autoplay.current]}
              className="w-full"
            >
              <CarouselContent className="-ml-5">
                {featured.map((g) => (
                  <CarouselItem key={g.id} className="pl-5 md:basis-1/2 lg:basis-1/3">
                    <GameCard game={g} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex -left-4" />
              <CarouselNext className="hidden md:flex -right-4" />
            </Carousel>
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
