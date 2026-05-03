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
import { Shield, Plus, Pencil, Trash2, LogOut, Users, ChevronDown, Download as DownloadIcon, Library as LibraryIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Game, GameInput } from "@/types/game";

const ADMIN_CODE = "7997";
const SESSION_KEY = "d79_admin_ok";

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
      await upsert.mutateAsync({ ...form, id: editing?.id });
      toast.success(editing ? "Game updated" : "Game added");
      setOpen(false);
      setEditing(null);
    } catch (err: any) {
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
            <h1 className="text-3xl font-bold flex items-center gap-3"><Shield className="h-7 w-7 text-primary" /> Admin Panel</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your game catalog</p>
          </div>
          <div className="flex gap-2">
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
                    <div className="col-span-2"><Label>Image URL</Label><Input value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." /></div>
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
                      <label className="flex items-center gap-2 text-sm"><Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} /> Featured</label>
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
                    <Button type="submit" disabled={upsert.isPending} className="bg-primary-gradient text-primary-foreground hover:opacity-90">
                      {editing ? "Save Changes" : "Add Game"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={logout}><LogOut className="h-4 w-4 mr-2" /> Logout</Button>
          </div>
        </div>

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
