import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useGames, useUpsertGame, useDeleteGame } from "@/hooks/useGames";
import { Shield, Plus, Pencil, Trash2, LogOut } from "lucide-react";
import { toast } from "sonner";
import type { Game, GameInput } from "@/types/game";

const ADMIN_CODE = "7997";
const SESSION_KEY = "d79_admin_ok";

const empty: GameInput = {
  title: "", description: "", image_url: "", download_url: "",
  price: 0, is_free: true, mode: "offline",
  genre: "", developer: "", publisher: "", release_date: null,
  min_os: "", min_cpu: "", min_ram: "", min_gpu: "", min_storage: "",
  featured: false,
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
                    <div><Label>Price ($)</Label><Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} disabled={form.is_free} /></div>

                    <div className="col-span-2 flex gap-6 pt-2">
                      <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_free} onCheckedChange={(v) => setForm({ ...form, is_free: v, price: v ? 0 : form.price })} /> Free game</label>
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

        <div className="rounded-lg border border-border bg-card-gradient overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-3 text-left">
              <tr>
                <th className="p-3">Game</th>
                <th className="p-3">Mode</th>
                <th className="p-3">Price</th>
                <th className="p-3">Featured</th>
                <th className="p-3 w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {games?.length === 0 && (
                <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">No games yet. Click "Add Game" to start.</td></tr>
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
                  <td className="p-3">{g.is_free ? <span className="text-accent">Free</span> : `$${Number(g.price).toFixed(2)}`}</td>
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
      </div>
    </div>
  );
};

export default Admin;
