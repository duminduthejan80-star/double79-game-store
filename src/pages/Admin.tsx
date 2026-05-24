import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useGames, useUpsertGame, useDeleteGame } from "@/hooks/useGames";
import { Shield, Plus, Pencil, Trash2, LogOut, Users, ChevronDown, Download as DownloadIcon, Library as LibraryIcon, Sparkles, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Game, GameInput } from "@/types/game";

const ADMIN_CODE = "7997";
const SESSION_KEY = "d79_admin_ok";
const STORE_BASE_URL = "https://double79-game-store.lovable.app/games/";

const empty: GameInput = {
  title: "", description: "", image_url: "", download_url: "",
  price: 0, is_free: true, mode: "offline",
  genre: "", developer: "", publisher: "", release_date: null,
  min_os: "", min_cpu: "", min_ram: "", min_gpu: "", min_storage: "",
  featured: false,
  screenshots: [],
  trailer_url: "",
};

const Admin = () => {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");
  const [code, setCode] = useState("");

  const { data: games } = useGames();
  const upsert = useUpsertGame();
  const del = useDeleteGame();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Game | null>(null);
  const [form, setForm] = useState<GameInput>(empty);
  const [autoUpscale, setAutoUpscale] = useState(true);
  const [upscaling, setUpscaling] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0, current: "" });

  const isAlreadyUpscaled = (url: string) =>
    !!url && url.includes("/storage/v1/object/public/game-media/");

  const upscaleOne = async (url: string): Promise<string> => {
    if (isAlreadyUpscaled(url)) return url;
    const { data, error } = await supabase.functions.invoke("upscale-image", {
      headers: { "x-admin-code": "7997" },
      body: { imageUrl: url },
    });
    if (error) throw new Error(error.message);
    if (!data?.url) throw new Error("No URL returned");
    return data.url as string;
  };

  const upscaleField = async (field: "image_url" | "screenshots") => {
    setUpscaling(true);
    try {
      if (field === "image_url" && form.image_url) {
        const url = await upscaleOne(form.image_url);
        setForm((f) => ({ ...f, image_url: url }));
        toast.success("Cover upscaled to 4K");
      } else if (field === "screenshots" && form.screenshots?.length) {
        const out: string[] = [];
        for (let i = 0; i < form.screenshots.length; i++) {
          try { out.push(await upscaleOne(form.screenshots[i])); }
          catch (e: any) { toast.error(`Screenshot ${i + 1}: ${e.message}`); out.push(form.screenshots[i]); }
        }
        setForm((f) => ({ ...f, screenshots: out }));
        toast.success("Screenshots upscaled");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUpscaling(false);
    }
  };

  const bulkUpscaleAll = async () => {
    if (!games?.length) return;
    if (!confirm(`Upscale all images for ${games.length} games? This uses AI credits.`)) return;
    setBulkRunning(true);
    const tasks: { game: Game; total: number }[] = games.map((g) => ({
      game: g,
      total:
        (g.image_url && !isAlreadyUpscaled(g.image_url) ? 1 : 0) +
        (g.screenshots?.filter((s) => !isAlreadyUpscaled(s)).length ?? 0),
    }));
    const total = tasks.reduce((a, t) => a + t.total, 0);
    setBulkProgress({ done: 0, total, current: "" });
    let done = 0;
    let skipped = 0;

    for (const { game } of tasks) {
      const updates: Partial<GameInput> = {};
      if (game.image_url) {
        if (isAlreadyUpscaled(game.image_url)) {
          skipped++;
        } else {
          setBulkProgress((p) => ({ ...p, current: `${game.title} (cover)` }));
          try { updates.image_url = await upscaleOne(game.image_url); }
          catch (e: any) { toast.error(`${game.title} cover: ${e.message}`); }
          done++; setBulkProgress((p) => ({ ...p, done }));
        }
      }
      const newShots: string[] = [];
      let shotsChanged = false;
      for (let i = 0; i < (game.screenshots?.length ?? 0); i++) {
        const s = game.screenshots[i];
        if (isAlreadyUpscaled(s)) {
          newShots.push(s);
          skipped++;
          continue;
        }
        setBulkProgress((p) => ({ ...p, current: `${game.title} (shot ${i + 1})` }));
        try {
          const up = await upscaleOne(s);
          newShots.push(up);
          if (up !== s) shotsChanged = true;
        }
        catch (e: any) { toast.error(`${game.title} shot ${i + 1}: ${e.message}`); newShots.push(s); }
        done++; setBulkProgress((p) => ({ ...p, done }));
      }
      if (shotsChanged) updates.screenshots = newShots;
      if (Object.keys(updates).length) {
        await supabase.from("games").update(updates).eq("id", game.id);
      }
    }
    setBulkRunning(false);
    setBulkProgress({ done: 0, total: 0, current: "" });
    toast.success(`Bulk upscale complete${skipped ? ` (skipped ${skipped} already-4K)` : ""}`);
    window.location.reload();
  };

  useEffect(() => {
    if (editing) {
      const { id, created_at, updated_at, ...rest } = editing;
      setForm(rest);
    } else {
      setForm(empty);
    }
  }, [editing]);

  const login = (e: React.FormEvent) => {
    e.preventDefault();
    if (code === ADMIN_CODE) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setAuthed(true);
      toast.success("Welcome, admin");
    } else toast.error("Invalid admin code");
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Title required");
    try {
      let payload: GameInput = { ...form };

      if (autoUpscale) {
        const orig = editing;
        const newCover = payload.image_url && payload.image_url !== orig?.image_url;
        const newShots = (payload.screenshots ?? []).filter(
          (s) => !orig?.screenshots?.includes(s),
        );
        if (newCover || newShots.length) {
          setUpscaling(true);
          toast.info("Auto-upscaling new images to 4K...");
        }
        if (newCover && payload.image_url) {
          try { payload.image_url = await upscaleOne(payload.image_url); }
          catch (e: any) { toast.error(`Cover upscale: ${e.message}`); }
        }
        if (newShots.length) {
          const updated = [...(payload.screenshots ?? [])];
          for (let i = 0; i < updated.length; i++) {
            if (newShots.includes(updated[i])) {
              try { updated[i] = await upscaleOne(updated[i]); }
              catch (e: any) { toast.error(`Shot upscale: ${e.message}`); }
            }
          }
          payload.screenshots = updated;
        }
        setUpscaling(false);
      }

      // 1. Save or Update the game first
      const isNewGame = !editing;
      const savedGame = await upsert.mutateAsync({ ...payload, id: editing?.id });
      toast.success(isNewGame ? "Game added" : "Game updated");

      // 2. WhatsApp Notification Trigger (Only for brand new games)
      if (isNewGame) {
        try {
          // Fetch the latest added game ID just to be absolutely safe
          const { data: latestGame, error: fetchErr } = await supabase
            .from("games")
            .select("id")
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          const gameId = latestGame?.id || (savedGame as any)?.id || (savedGame as any)?.[0]?.id;

          if (gameId) {
            console.log("Triggering WhatsApp Edge Function for Game ID:", gameId);
            
            const { data: waData, error: waError } = await supabase.functions.invoke("notify-whatsapp", {
              body: {
                gameName: payload.title,
                imageUrl: payload.image_url || "https://placehold.co/600x400?text=" + encodeURIComponent(payload.title),
                link: STORE_BASE_URL + gameId,
              },
            });

            if (waError) {
              console.error("Supabase function invoke error:", waError);
              throw new Error(waError.message || "Edge function invocation failed");
            }
            
            console.log("Edge function response:", waData);
            toast.success("WhatsApp group notified ✅");
          } else {
            toast.warning("Game saved, but could not determine Game ID for WhatsApp notification.");
          }
        } catch (waErr: any) {
          console.error("WhatsApp notification crash:", waErr);
          toast.error("WhatsApp notification failed: " + waErr.message);
        }
      }

      setOpen(false);
      setEditing(null);
    } catch (err: any) {
      setUpscaling(false);
      toast.error(err.message);
    }
  };

  const remove = async (g: Game) => {
    if (!confirm(`Delete "${g.title}"?`)) return;
    try {
      await del.mutateAsync(g.id);
      toast.success("Game deleted");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-20 flex justify-center">
          <form onSubmit={login} className="w-full max-w-sm rounded-lg border border-border bg-card-gradient p-8 shadow-elevated">
            <div className="flex justify-center mb-4">
              <div className="h-14 w-14 rounded-full bg-primary-gradient flex items-center justify-center shadow-glow">
                <Shield className="h-7 w-7 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-center text-2xl font-bold mb-1">Admin Access</h1>
            <p className="text-center text-sm text-muted-foreground mb-6">Enter the admin code to continue</p>
            <Input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Admin code"
              className="bg-surface-2"
              autoFocus
            />
            <Button type="submit" className="w-full mt-4 bg-primary-gradient text-primary-foreground hover:opacity-90">
              Unlock
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="h-7 w-7 text-primary" /> Admin Panel
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your game catalog</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={bulkUpscaleAll}
              disabled={bulkRunning || !games?.length}
            >
              {bulkRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Upscale all to 4K
            </Button>
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
              <DialogTrigger asChild>
                <Button className="bg-primary-gradient text-primary-foreground hover:opacity-90">
                  <Plus className="h-4 w-4 mr-2" /> Add Game
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editing ? "Edit Game" : "Add New Game"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
                    <div className="col-span-2"><Label>Description</Label><Textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                    <div className="col-span-2">
                      <div className="flex items-center justify-between">
                        <Label>Image URL (cover)</Label>
                        <Button type="button" size="sm" variant="ghost" disabled={!form.image_url || upscaling} onClick={() => upscaleField("image_url")}>
                          {upscaling ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                          Upscale to 4K
                        </Button>
                      </div>
                      <Input value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center justify-between">
                        <Label>Screenshots (one URL per line)</Label>
                        <Button type="button" size="sm" variant="ghost" disabled={!form.screenshots?.length || upscaling} onClick={() => upscaleField("screenshots")}>
                          {upscaling ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                          Upscale all
                        </Button>
                      </div>
                      <Textarea
                        rows={3}
                        value={(form.screenshots ?? []).join("\n")}
                        onChange={(e) => setForm({ ...form, screenshots: e.target.value.split("\n").map(s => s.trim()).filter(Boolean) })}
                        placeholder={"https://...\nhttps://..."}
                      />
                    </div>
                    <div className="col-span-2 flex items-center gap-2 text-sm bg-surface-2/50 rounded-md p-3">
                      <Switch checked={autoUpscale} onCheckedChange={setAutoUpscale} />
                      <span>Auto-upscale new images to 4K when saving</span>
                    </div>
                    <div className="col-span-2">
                      <Label>Trailer URL (YouTube link or .mp4)</Label>
                      <Input value={form.trailer_url ?? ""} onChange={(e) => setForm({ ...form, trailer_url: e.target.value })} placeholder="https://youtube.com/watch?v=... or https://.../video.mp4" />
                    </div>
                    <div className="col-span-2"><Label>Download URL</Label><Input value={form.download_url ?? ""} onChange={(e) => setForm({ ...form, download_url: e.target.value })} placeholder="https://..." /></div>

                    <div><Label>Genre</Label><Input value={form.genre ?? ""} onChange={(e) => setForm({ ...form, genre: e.target.value })} /></div>
                    <div>
                      <Label>Mode</Label>
                      <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="offline">Offline</SelectItem>
                          <SelectItem value="online">Online</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div><Label>Developer</Label><Input value={form.developer ?? ""} onChange={(e) => setForm({ ...form, developer: e.target.value })} /></div>
                    <div><Label>Publisher</Label><Input value={form.publisher ?? ""} onChange={(e) => setForm({ ...form, publisher: e.target.value })} /></div>
                    <div><Label>Release Date</Label><Input type="date" value={form.release_date ?? ""} onChange={(e) => setForm({ ...form, release_date: e.target.value || null })} /></div>

                    <div className="col-span-2 flex gap-6 pt-2">
                      <label className="flex items-center gap-2 text-sm">
                        <Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} /> Featured
                      </label>
                    </div>

                    <div className="col-span-2 pt-2 border-t border-border">
                      <Label className="text-base">Minimum System Requirements</Label>
                    </div>
                    <div><Label>OS</Label><Input value={form.min_os ?? ""} onChange={(e) => setForm({ ...form, min_os: e.target.value })} placeholder="Windows 10 64-bit" /></div>
                    <div><Label>CPU</Label><Input value={form.min_cpu ?? ""} onChange={(e) => setForm({ ...form, min_cpu: e.target.value })} placeholder="Intel i5-4460" /></div>
                    <div><Label>RAM</Label><Input value={form.min_ram ?? ""} onChange={(e) => setForm({ ...form, min_ram: e.target.value })} placeholder="8 GB" /></div>
                    <div><Label>GPU</Label><Input value={form.min_gpu ?? ""} onChange={(e) => setForm({ ...form, min_gpu: e.target.value })} placeholder="GTX 960" /></div>
                    <div className="col-span-2"><Label>Storage</Label><Input value={form.min_storage ?? ""} onChange={(e) => setForm({ ...form, min_storage: e.target.value })} placeholder="50 GB available space" /></div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={upsert.isPending || upscaling} className="bg-primary-gradient text-primary-foreground hover:opacity-90">
                      {upscaling ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Upscaling...</> : (editing ? "Save Changes" : "Add Game")}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={logout}><LogOut className="h-4 w-4 mr-2" /> Logout</Button>
          </div>
        </div>

        {bulkRunning && (
          <div className="mb-6 rounded-lg border border-primary/40 bg-surface-2 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Upscaling images to 4K
              </span>
              <span className="text-muted-foreground">
                {bulkProgress.done} / {bulkProgress.total}
              </span>
            </div>
            <Progress value={bulkProgress.total ? (bulkProgress.done / bulkProgress.total) * 100 : 0} />
            <div className="text-xs text-muted-foreground truncate">{bulkProgress.current}</div>
          </div>
        )}

        <Tabs defaultValue="games" className="w-full">
          <TabsList>
            <TabsTrigger value="games">Games</TabsTrigger>
            <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" /> Users</TabsTrigger>
          </TabsList>

          <TabsContent value="games">
            <div className="rounded-lg border border-border bg-card-gradient overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-3 text-left">
                  <tr>
                    <th className="p-3">Game</th>
                    <th className="p-3">Mode</th>
                    <th className="p-3">Featured</th>
                    <th className="p-3 w-32">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {games?.length === 0 && (
                    <tr><td colSpan={4} className="p-10 text-center text-muted-foreground">No games yet. Click "Add Game" to start.</td></tr>
                  )}
                  {games?.map((g) => (
                    <tr key={g.id} className="border-t border-border/50 hover:bg-surface-2/50">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-16 rounded bg-surface-2 overflow-hidden flex-shrink-0">
                            {g.image_url && <img src={g.image_url} alt="" className="h-full w-full object-cover" />}
                          </div>
                          <div>
                            <div className="font-medium">{g.title}</div>
                            <div className="text-xs text-muted-foreground">{g.genre}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 capitalize">{g.mode}</td>
                      <td className="p-3">{g.featured ? "Yes" : "—"}</td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => { setEditing(g); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => remove(g)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <UsersPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

interface UserStats {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  joined_at: string;
  library_count: number;
  download_count: number;
  library: { game_id: string; title: string; added_at: string }[];
  downloads: { game_id: string; title: string; at: string }[];
}

const fmt = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
};

const UsersPanel = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ total_users: number; total_downloads: number; users: UserStats[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const { data: res, error } = await supabase.functions.invoke("admin-stats", {
        headers: { "x-admin-code": "7997" },
      });
      if (error) throw error;
      setData(res);
    } catch (e: any) {
      setErr(e.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="p-10 text-center text-muted-foreground">Loading users...</div>;
  if (err) return <div className="p-10 text-center text-destructive">{err}</div>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card-gradient p-4">
          <div className="text-xs text-muted-foreground">Total users</div>
          <div className="text-2xl font-bold">{data.total_users}</div>
        </div>
        <div className="rounded-lg border border-border bg-card-gradient p-4">
          <div className="text-xs text-muted-foreground">Total downloads</div>
          <div className="text-2xl font-bold">{data.total_downloads}</div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card-gradient overflow-hidden">
        {data.users.length === 0 && (
          <div className="p-10 text-center text-muted-foreground">No users yet.</div>
        )}
        {data.users.map((u) => (
          <Collapsible key={u.id} className="border-b border-border/50 last:border-b-0">
            <CollapsibleTrigger className="w-full flex items-center gap-4 p-4 hover:bg-surface-2/50 text-left">
              <Avatar className="h-10 w-10">
                {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                <AvatarFallback>{(u.display_name ?? u.email ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{u.display_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground truncate">{u.email}</div>
              </div>
              <div className="hidden sm:flex gap-4 text-sm">
                <div className="flex items-center gap-1 text-muted-foreground"><LibraryIcon className="h-4 w-4" /> {u.library_count}</div>
                <div className="flex items-center gap-1 text-muted-foreground"><DownloadIcon className="h-4 w-4" /> {u.download_count}</div>
              </div>
              <div className="hidden md:block text-xs text-muted-foreground w-40 text-right">Joined {fmt(u.joined_at)}</div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4 bg-surface-1/40">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-semibold mb-2 flex items-center gap-2"><LibraryIcon className="h-4 w-4" /> Library ({u.library.length})</div>
                  {u.library.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No games in library.</div>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {u.library.map((g) => (
                        <li key={g.game_id + g.added_at} className="flex justify-between gap-2 border-b border-border/30 py-1">
                          <span className="truncate">{g.title}</span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{fmt(g.added_at)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold mb-2 flex items-center gap-2"><DownloadIcon className="h-4 w-4" /> Downloads ({u.downloads.length})</div>
                  {u.downloads.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No downloads yet.</div>
                  ) : (
                    <ul className="space-y-1 text-sm max-h-60 overflow-y-auto">
                      {u.downloads.map((d, i) => (
                        <li key={i} className="flex justify-between gap-2 border-b border-border/30 py-1">
                          <span className="truncate">{d.title}</span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{fmt(d.at)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  );
};

export default Admin;
