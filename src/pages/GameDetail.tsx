import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Download, Wifi, WifiOff, Check, Calendar, User, Building2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useGame } from "@/hooks/useGames";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { addToLibrary, inLibrary } from "@/lib/library";
import { toast } from "sonner";
import { useState } from "react";

const Row = ({ label, value }: { label: string; value: string | null }) =>
  value ? (
    <div className="flex justify-between py-2 border-b border-border/50 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium text-right">{value}</span>
    </div>
  ) : null;

const GameDetail = () => {
  const { id } = useParams();
  const { data: game, isLoading } = useGame(id);
  const [owned, setOwned] = useState(id ? inLibrary(id) : false);

  if (isLoading) return <div className="min-h-screen"><Navbar /><div className="container mx-auto p-10">Loading...</div></div>;
  if (!game) return <div className="min-h-screen"><Navbar /><div className="container mx-auto p-10">Game not found.</div></div>;

  const handleGet = () => {
    addToLibrary(game.id);
    setOwned(true);
    toast.success(`${game.title} added to your library`);
  };

  const handleDownload = () => {
    if (game.download_url) window.open(game.download_url, "_blank");
    else toast.error("No download link available");
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to store
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="aspect-video rounded-lg overflow-hidden bg-surface-2 shadow-elevated">
              {game.image_url && <img src={game.image_url} alt={game.title} className="w-full h-full object-cover" />}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                {game.featured && <Badge className="bg-accent text-accent-foreground">Featured</Badge>}
                <Badge variant="secondary">
                  {game.mode === "online" ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                  {game.mode}
                </Badge>
                {game.genre && <Badge variant="outline">{game.genre}</Badge>}
              </div>
              <h1 className="text-4xl font-bold mb-3">{game.title}</h1>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{game.description}</p>
            </div>

            <div className="rounded-lg border border-border bg-card-gradient p-6">
              <h2 className="text-lg font-semibold mb-4">System Requirements (Minimum)</h2>
              <Row label="OS" value={game.min_os} />
              <Row label="CPU" value={game.min_cpu} />
              <Row label="RAM" value={game.min_ram} />
              <Row label="GPU" value={game.min_gpu} />
              <Row label="Storage" value={game.min_storage} />
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg border border-border bg-card-gradient p-6 shadow-card sticky top-20">
              <div className="text-sm text-muted-foreground mb-1">Price</div>
              <div className={`text-3xl font-bold mb-4 ${game.is_free ? "text-accent" : "text-primary-glow"}`}>
                {game.is_free ? "Free to Play" : `$${Number(game.price).toFixed(2)}`}
              </div>

              {!owned ? (
                <Button onClick={handleGet} className="w-full bg-primary-gradient text-primary-foreground hover:opacity-90" size="lg">
                  {game.is_free ? "Add to Library" : "Buy & Add to Library"}
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
      </div>
    </div>
  );
};

export default GameDetail;
