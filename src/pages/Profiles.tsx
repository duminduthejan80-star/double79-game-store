import { useState } from "react";
import Navbar from "@/components/Navbar";
import { usePublicProfiles, usePublicProfileGames, type PublicProfile } from "@/hooks/useProfiles";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Crown, Download, Gamepad2, Library, Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const Badge = ({ isPro }: { isPro: boolean }) => (
  <span
    className={cn(
      "glass-chip text-[10px] font-bold uppercase tracking-[0.15em]",
      isPro ? "text-amber-300" : "text-emerald-400",
    )}
  >
    {isPro ? (
      <>
        <Crown className="h-3 w-3 mr-1 inline" />
        Pro
      </>
    ) : (
      "Free"
    )}
  </span>
);

const ProfileDialog = ({ p, onClose }: { p: PublicProfile | null; onClose: () => void }) => {
  const { data: games = [], isLoading } = usePublicProfileGames(p?.id);
  const library = games.filter((g) => g.kind === "library");
  const downloads = games.filter((g) => g.kind === "download");

  const Section = ({ title, icon: Icon, items }: any) => (
    <div>
      <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
        <Icon className="h-4 w-4 text-primary" /> {title}
        <span className="text-muted-foreground font-normal">({items.length})</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nothing here yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map((g: any) => (
            <div key={`${title}-${g.game_id}`} className="rounded-xl overflow-hidden lg-panel">
              <div className="aspect-[16/10] bg-white/5 flex items-center justify-center">
                {g.image_url ? (
                  <img src={g.image_url} alt={g.title} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <Gamepad2 className="h-6 w-6 opacity-40" />
                )}
              </div>
              <div className="p-2 text-xs font-medium truncate">{g.title}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={!!p} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        {p && (
          <>
            <DialogHeader>
              <DialogTitle className="sr-only">{p.display_name}</DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full overflow-hidden border border-white/20 bg-white/5 flex items-center justify-center">
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt={p.display_name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xl font-bold">{p.display_name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div>
                <div className="text-xl font-bold">{p.display_name}</div>
                <div className="mt-1 flex items-center gap-2">
                  <Badge isPro={p.is_pro} />
                  <span className="text-xs text-muted-foreground">
                    Joined {new Date(p.joined_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-6 mt-4">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading games...</p>
              ) : (
                <>
                  <Section title="Library" icon={Library} items={library} />
                  <Section title="Downloaded" icon={Download} items={downloads} />
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

const Profiles = () => {
  const { data: profiles = [], isLoading } = usePublicProfiles();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<PublicProfile | null>(null);

  const filtered = profiles.filter((p) => p.display_name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Community Profiles</h1>
          <div className="relative ml-auto w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search players" className="pl-9" />
          </div>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading players...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">No players found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className="lg-panel rounded-2xl p-4 text-left transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full overflow-hidden border border-white/20 bg-white/5 flex items-center justify-center">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt={p.display_name} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-bold">{p.display_name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{p.display_name}</div>
                    <Badge isPro={p.is_pro} />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Library className="h-3.5 w-3.5" /> {p.library_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <Download className="h-3.5 w-3.5" /> {p.download_count}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
      <ProfileDialog p={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

export default Profiles;
