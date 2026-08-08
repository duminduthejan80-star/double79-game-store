import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Wifi, WifiOff, Check, Calendar, User, Building2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import MediaGallery from "@/components/MediaGallery";
import { useGame } from "@/hooks/useGames";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import CanIRunIt from "@/components/CanIRunIt";
import GameReviews from "@/components/GameReviews";
import { useLibrary, useAddToLibrary } from "@/hooks/useLibrary";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Row = ({ label, value }: { label: string; value: string | null }) =>
  value ? (
    <div className="flex justify-between py-2 border-b border-border/50 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium text-right">{value}</span>
    </div>
  ) : null;

const GameDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: game, isLoading } = useGame(id);
  const { data: ownedIds = [] } = useLibrary();
  const addLib = useAddToLibrary();
  const owned = id ? ownedIds.includes(id) : false;

  const heroImage = game?.image_url || game?.screenshots?.[0] || null;

  if (isLoading) return <div className="min-h-screen"><Navbar /><div className="container mx-auto p-10">Loading...</div></div>;
  if (!game) return <div className="min-h-screen"><Navbar /><div className="container mx-auto p-10">Game not found.</div></div>;

  const handleGet = async () => {
    try {
      await addLib.mutateAsync(game.id);
      toast.success(`${game.title} added to your library`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDownload = async () => {
    if (!game.download_url) {
      toast.error("No download link available");
      return;
    }
    // Desktop app: pick a folder (Steam-style) and download inside the app
    try {
      const res = await startDesktopDownload(game.download_url, game.title);
      if (res === "cancelled") return;
      if (res === "unavailable") {
        window.open(game.download_url, "_blank", "noopener,noreferrer");
      } else {
        toast.success(`Downloading ${game.title}`);
      }
    } catch (e: any) {
      toast.error(e?.message || "Download failed to start");
      return;
    }

    // Record download → 24h follow-up email will be triggered by cron
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

  return (
    <div className="min-h-screen relative">
      {heroImage && (
        <div
          className="game-hero-bg is-active"
          style={{ backgroundImage: `url(${heroImage})` }}
          aria-hidden="true"
        />
      )}
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back to store
        </button>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <MediaGallery
              title={game.title}
              cover={game.image_url}
              trailerUrl={game.trailer_url}
              screenshots={game.screenshots ?? []}
            />

            <div>
              <div className="flex items-center gap-2 mb-2">
                {game.featured && <Badge className="bg-accent text-accent-foreground">Featured</Badge>}
                <Badge variant="secondary">
                  {game.mode === "online" ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                  {game.mode}
                </Badge>
                {game.genre && <Badge variant="outline">{game.genre}</Badge>}
              </div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <h1 className="text-4xl font-bold">{game.title}</h1>
              </div>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{game.description}</p>
            </div>

            <CanIRunIt
              game={{
                min_cpu: game.min_cpu,
                min_gpu: game.min_gpu,
                min_ram: game.min_ram,
                min_storage: game.min_storage,
              }}
            />

            <div className="rounded-lg glass p-6">
              <h2 className="text-lg font-semibold mb-4">System Requirements (Minimum)</h2>
              <Row label="OS" value={game.min_os} />
              <Row label="CPU" value={game.min_cpu} />
              <Row label="RAM" value={game.min_ram} />
              <Row label="GPU" value={game.min_gpu} />
              <Row label="Storage" value={game.min_storage} />
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg glass p-6 shadow-glow sticky top-20">
              <div className="text-sm text-muted-foreground mb-1">Price</div>
              <div className="text-3xl font-bold mb-4 text-accent">Free</div>

              {!owned ? (
                <Button onClick={handleGet} className="w-full bg-primary-gradient text-primary-foreground hover:opacity-90" size="lg">
                  Add to Library
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 text-accent text-sm font-medium py-2">
                    <Check className="h-4 w-4" /> In your library
                  </div>
                  <Button onClick={handleDownload} className="w-full" size="lg">
                    <Download className="h-4 w-4 mr-2" /> Download
                  </Button>
                </div>
              )}

              <Separator className="my-5" />
              <div className="space-y-3 text-sm">
                {game.developer && <div className="flex items-center gap-2 text-muted-foreground"><User className="h-4 w-4" /> Developer: <span className="text-foreground">{game.developer}</span></div>}
                {game.publisher && <div className="flex items-center gap-2 text-muted-foreground"><Building2 className="h-4 w-4" /> Publisher: <span className="text-foreground">{game.publisher}</span></div>}
                {game.release_date && <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4" /> Released: <span className="text-foreground">{game.release_date}</span></div>}
              </div>
            </div>
          </aside>
        </div>

        <GameReviews gameId={game.id} />
      </div>
    </div>
  );
};

export default GameDetail;
