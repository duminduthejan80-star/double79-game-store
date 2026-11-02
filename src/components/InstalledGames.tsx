import { useState } from "react";
import { Play, FolderOpen, Trash2, HardDrive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDesktopGames } from "@/hooks/useDesktopDownloads";
import {
  playDesktopGame,
  uninstallDesktopGame,
  openDesktopGameFolder,
  formatMB,
} from "@/lib/desktopBridge";
import { toast } from "sonner";

/** Steam-style "Installed on this PC" section — only visible inside the PC app. */
const InstalledGames = () => {
  const { available, games } = useDesktopGames();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!available || games.length === 0) return null;

  const play = async (id: string, title: string) => {
    setBusyId(id);
    const err = await playDesktopGame(id);
    setBusyId(null);
    if (err) toast.error(err);
    else toast.success(`Starting ${title}…`);
  };

  const uninstall = async (id: string, title: string) => {
    if (!confirm(`Uninstall "${title}"? All its files will be deleted from this PC.`)) return;
    setBusyId(id);
    const err = await uninstallDesktopGame(id);
    setBusyId(null);
    if (err) toast.error(err);
    else toast.success(`${title} uninstalled`);
  };

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <HardDrive className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Installed on this PC</h2>
        <span className="text-sm text-muted-foreground">({games.length})</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((g) => (
          <div
            key={g.id}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl"
          >
            <div className="truncate font-bold">{g.title}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {g.missing ? "Files missing" : formatMB(g.sizeBytes)}
              {g.exe ? "" : " · no game .exe found"}
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                className="flex-1 bg-primary-gradient text-primary-foreground hover:opacity-90"
                disabled={busyId === g.id || g.missing || !g.exe}
                onClick={() => play(g.id, g.title)}
              >
                {busyId === g.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                Play
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Open game folder"
                disabled={g.missing}
                onClick={() => openDesktopGameFolder(g.id)}
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Uninstall"
                className="text-destructive hover:text-destructive"
                disabled={busyId === g.id}
                onClick={() => uninstall(g.id, g.title)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default InstalledGames;
