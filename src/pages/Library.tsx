import Navbar from "@/components/Navbar";
import GameCard from "@/components/GameCard";
import { useGames } from "@/hooks/useGames";
import { getLibrary } from "@/lib/library";
import { useMemo } from "react";
import { Library as LibraryIcon } from "lucide-react";

const Library = () => {
  const { data: games } = useGames();
  const ids = getLibrary();
  const owned = useMemo(() => games?.filter((g) => ids.includes(g.id)) ?? [], [games, ids]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="container mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <LibraryIcon className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold">My Library</h1>
        </div>
        {owned.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-16 text-center text-muted-foreground">
            Your library is empty. Get games from the store to see them here.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {owned.map((g) => <GameCard key={g.id} game={g} />)}
          </div>
        )}
      </section>
    </div>
  );
};

export default Library;
