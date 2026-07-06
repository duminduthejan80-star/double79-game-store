import { useMemo, useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useGames } from "@/hooks/useGames";
import { useLibrary, useRemoveFromLibrary } from "@/hooks/useLibrary";
import { supabase } from "@/integrations/supabase/client";
import { Library as LibraryIcon, Search, Download, Wifi, WifiOff, Gamepad2, Trash2, Calendar, User as UserIcon, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Game } from "@/types/game";

const Library = () => {
  const { data: games } = useGames();
  const { data: ownedIds = [] } = useLibrary();
  const remove = useRemoveFromLibrary();
  
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const owned = useMemo<Game[]>(
    () => (games ?? []).filter((g) => ownedIds.includes(g.id)),
    [games, ownedIds]
  );

  const filtered = useMemo(
    () => owned.filter((g) => !q || g.title.toLowerCase().includes(q.toLowerCase())),
    [owned, q]
  );

  useEffect(() => {
    if (!selectedId && filtered.length > 0) setSelectedId(filtered[0].id);
    if (selectedId && !owned.find((g) => g.id === selectedId)) {
      setSelectedId(filtered[0]?.id ?? null);
    }
  }, [filtered, owned, selectedId]);

  const selected = owned.find((g) => g.id === selectedId) ?? null;

  const handleDownload = async (game: Game) => {
    if (!game.download_url) return toast.error("No download link available");
    window.open(game.download_url, "_blank", "noopener,noreferrer");
    try {
      const { data: auth } = await supabase.auth.getUser();
      const u = auth?.user;
      if (u) {
        const userName = (u.user_metadata?.full_name as string) ||
                         (u.user_metadata?.name as string) ||
                         u.email?.split("@")[0] || "Player";
        await supabase.from("game_downloads").insert({
          user_id: u.id,
          user_email: u.email!,
          user_name: userName,
          game_id: game.id,
          game_title: game.title,
        });
      }
    } catch (e) {
      console.warn("Failed to record download", e);
    }
  };


  const handleRemove = async (game: Game) => {
    if (!confirm(`Remove "${game.title}" from your library?`)) return;
    try {
      await remove.mutateAsync(game.id);
      toast.success("Removed from library");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 container mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-5">
          <LibraryIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">My Library</h1>
          <span className="text-sm text-muted-foreground">({owned.length})</span>
        </div>

        {owned.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-16 text-center text-muted-foreground">
            Your library is empty. Get games from the store to see them here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4 rounded-lg border border-border bg-card-gradient overflow-hidden min-h-[600px]">
            {/* Sidebar */}
            <aside className="border-r border-border/60 bg-surface-1/50 flex flex-col">
              <div className="p-3 border-b border-border/60">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search library"
                    className="pl-8 h-9 bg-surface-2 border-border text-sm"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto py-1 max-h-[600px]">
                {filtered.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedId(g.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-sm transition-smooth",
                      selectedId === g.id
                        ? "bg-primary/15 text-foreground border-l-2 border-primary"
                        : "text-muted-foreground hover:bg-surface-2 hover:text-foreground border-l-2 border-transparent"
                    )}
                  >
                    <div className="h-6 w-6 rounded-sm overflow-hidden bg-surface-2 flex-shrink-0 flex items-center justify-center">
                      {g.image_url ? (
                        <img src={g.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Gamepad2 className="h-3 w-3 opacity-50" />
                      )}
                    </div>
                    <span className="truncate">{g.title}</span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                    No matches
                  </div>
                )}
              </div>
            </aside>

            {/* Main */}
            <main className="overflow-y-auto">
              {selected ? (
                <div>
                  <div className="relative aspect-[21/9] bg-surface-2 overflow-hidden">
                    {selected.image_url ? (
                      <img
                        src={selected.image_url}
                        alt={selected.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <Gamepad2 className="h-16 w-16 opacity-30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="bg-background/70 backdrop-blur-md">
                          {selected.mode === "online" ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                          {selected.mode}
                        </Badge>
                        {selected.genre && <Badge variant="outline">{selected.genre}</Badge>}
                      </div>
                      <h2 className="text-3xl md:text-4xl font-bold">{selected.title}</h2>
                    </div>
                  </div>

                  <div className="p-6 space-y-5">
                    <div className="flex flex-wrap gap-3">
                      <Button
                        size="lg"
                        onClick={() => handleDownload(selected)}
                        className="bg-primary-gradient text-primary-foreground hover:opacity-90 px-8"
                      >
                        <Download className="h-5 w-5 mr-2" /> Download
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => handleRemove(selected)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Remove
                      </Button>
                    </div>

                    {selected.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {selected.description}
                      </p>
                    )}

                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      {selected.developer && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <UserIcon className="h-4 w-4" /> Developer:{" "}
                          <span className="text-foreground">{selected.developer}</span>
                        </div>
                      )}
                      {selected.publisher && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building2 className="h-4 w-4" /> Publisher:{" "}
                          <span className="text-foreground">{selected.publisher}</span>
                        </div>
                      )}
                      {selected.release_date && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" /> Released:{" "}
                          <span className="text-foreground">{selected.release_date}</span>
                        </div>
                      )}
                    </div>

                    {(selected.min_os || selected.min_cpu || selected.min_ram || selected.min_gpu || selected.min_storage) && (
                      <div className="rounded-lg border border-border bg-surface-1 p-4">
                        <h3 className="text-sm font-semibold mb-3">System Requirements (Minimum)</h3>
                        <div className="space-y-1.5 text-sm">
                          {selected.min_os && <div className="flex justify-between"><span className="text-muted-foreground">OS</span><span>{selected.min_os}</span></div>}
                          {selected.min_cpu && <div className="flex justify-between"><span className="text-muted-foreground">CPU</span><span>{selected.min_cpu}</span></div>}
                          {selected.min_ram && <div className="flex justify-between"><span className="text-muted-foreground">RAM</span><span>{selected.min_ram}</span></div>}
                          {selected.min_gpu && <div className="flex justify-between"><span className="text-muted-foreground">GPU</span><span>{selected.min_gpu}</span></div>}
                          {selected.min_storage && <div className="flex justify-between"><span className="text-muted-foreground">Storage</span><span>{selected.min_storage}</span></div>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground p-10">
                  Select a game from the sidebar
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;
