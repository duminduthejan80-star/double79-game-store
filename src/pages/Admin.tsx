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
import { Shield, Plus, Pencil, Trash2, LogOut, Users, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Game, GameInput } from "@/types/game";
import { GAME_CATEGORIES } from "@/lib/categories";

const ADMIN_CODE = "4998";
const SESSION_KEY = "d79_admin_ok";
const STORE_BASE_URL = "https://double79-game-store.lovable.app/games/";

const empty: GameInput = {
  title: "", description: "", image_url: "", download_url: "", download_url_pro: "",
  price: 0, is_free: true, mode: "offline",
  genre: "", developer: "", publisher: "", release_date: null,
  min_os: "", min_cpu: "", min_ram: "", min_gpu: "", min_storage: "",
  featured: false,
  categories: [],
  screenshots: [],
  trailer_url: "",
};

const Admin = () => {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");
  const [code, setCode] = useState("");
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return setIsAdmin(false);
      const { data } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
      setIsAdmin(!!data);
    })();
  }, []);


  const { data: games } = useGames();
  const upsert = useUpsertGame();
  const del = useDeleteGame();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Game | null>(null);
  const [form, setForm] = useState<GameInput>(empty);
  const [autoUpscale, setAutoUpscale] = useState(false);

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

      // 1. Save Game First (AI Upscale එක 402 හින්දා සම්පූර්ණයෙන්ම අයින් කරා මචං)
      const isNewGame = !editing;
      const savedGame = await upsert.mutateAsync({ ...payload, id: editing?.id });
      toast.success(isNewGame ? "Game added" : "Game updated");

      // 2. WhatsApp Notification Trigger (AI එක ක්‍රැෂ් වුණත් මේක දැන් 100% වැඩ)
      if (isNewGame) {
        try {
          const { data: latestGame } = await supabase
            .from("games")
            .select("id")
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          const gameId = latestGame?.id || (savedGame as any)?.id;

          if (gameId) {
            console.log("Triggering WhatsApp notification...");
            const finalImageUrl = payload.image_url && payload.image_url.startsWith('http') 
              ? payload.image_url 
              : "https://placehold.co/600x400?text=" + encodeURIComponent(payload.title);

            // කෙළින්ම වට්සැප් ෆන්ක්ෂන් එක විතරක් සේෆ්ලි කෝල් කරනවා
            await supabase.functions.invoke("notify-whatsapp", {
              body: {
                gameName: payload.title,
                imageUrl: finalImageUrl,
                link: STORE_BASE_URL + gameId,
              },
            });
            toast.success("WhatsApp group notified ✅");
          }
        } catch (waErr: any) {
          console.error("WhatsApp notification trigger failed:", waErr);
          toast.error("WhatsApp delivery issue: " + waErr.message);
        }
      }

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

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Checking access...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-bold mb-2">404 — Page not found</h1>
          <p className="text-muted-foreground text-sm">This page does not exist.</p>
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-20 flex justify-center">
          <form onSubmit={login} className="w-full max-w-sm rounded-2xl lg-strong p-8">
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
                    <div className="col-span-2"><Label>Image URL (cover)</Label><Input value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." /></div>
                    <div className="col-span-2">
                      <Label>Screenshots (one URL per line)</Label>
                      <Textarea
                        rows={3}
                        value={(form.screenshots ?? []).join("\n")}
                        onChange={(e) => setForm({ ...form, screenshots: e.target.value.split("\n").map(s => s.trim()).filter(Boolean) })}
                        placeholder={"https://...\nhttps://..."}
                      />
                    </div>
                    <div className="col-span-2"><Label>Trailer URL (YouTube link or .mp4)</Label><Input value={form.trailer_url ?? ""} onChange={(e) => setForm({ ...form, trailer_url: e.target.value })} placeholder="https://..." /></div>
                    <div className="col-span-2"><Label>Download URL (Free)</Label><Input value={form.download_url ?? ""} onChange={(e) => setForm({ ...form, download_url: e.target.value })} placeholder="https://..." /></div>
                    <div className="col-span-2"><Label>Download URL (Pro)</Label><Input value={form.download_url_pro ?? ""} onChange={(e) => setForm({ ...form, download_url_pro: e.target.value })} placeholder="https://... (fast, no-ads link)" /></div>

                    <div className="col-span-2">
                      <Label>Categories (select any number)</Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {GAME_CATEGORIES.map((c) => {
                          const active = (form.categories ?? []).includes(c);
                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={() => {
                                const next = active
                                  ? (form.categories ?? []).filter((x) => x !== c)
                                  : [...(form.categories ?? []), c];
                                setForm({ ...form, categories: next, genre: next.join(", ") });
                              }}
                              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                                active
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "lg-field text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {active ? "✓ " : ""}{c}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <Label>Genre (auto from categories)</Label>
                      <Input value={form.genre ?? ""} readOnly placeholder="Select categories above" />
                    </div>

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
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="pro">Pro</TabsTrigger>
            <TabsTrigger value="email">Email Test</TabsTrigger>
          </TabsList>


          <TabsContent value="games">
            <div className="rounded-2xl lg-panel overflow-hidden">
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
                    <tr><td colSpan={4} className="p-10 text-center text-muted-foreground">No games yet.</td></tr>
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

          <TabsContent value="pro">
            <ProPanel />
          </TabsContent>

          <TabsContent value="email">
            <EmailTestPanel />
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
};

const EmailTestPanel = () => {
  const [to, setTo] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<
    | { ok: true; to: string; at: string }
    | { ok: false; to: string; error: string; at: string }
    | null
  >(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setTo(data.user.email);
    });
  }, []);

  const sendTest = async () => {
    if (!to.trim()) {
      toast.error("Enter a recipient email");
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("send-feedback-email", {
        body: {
          test: true,
          to: to.trim(),
          name: "Admin Test",
          gameTitle: "Sample Game",
          gameId: "00000000-0000-0000-0000-000000000000",
        },
      });
      if (error) throw error;
      if (data?.ok && data?.delivered) {
        setResult({ ok: true, to: data.to ?? to.trim(), at: new Date().toLocaleString() });
        toast.success("Test email delivered ✅");
      } else {
        const msg = data?.error ?? "Delivery failed";
        setResult({ ok: false, to: data?.to ?? to.trim(), error: msg, at: new Date().toLocaleString() });
        toast.error("Delivery failed: " + msg);
      }
    } catch (e: any) {
      setResult({ ok: false, to: to.trim(), error: e?.message ?? "Unknown error", at: new Date().toLocaleString() });
      toast.error(e?.message ?? "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-xl rounded-2xl lg-panel p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Feedback Email Test</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Sends a sample feedback email via Gmail SMTP to verify delivery.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="test-email">Recipient email</Label>
        <Input
          id="test-email"
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="you@example.com"
        />
      </div>
      <Button
        onClick={sendTest}
        disabled={sending}
        className="bg-primary-gradient text-primary-foreground hover:opacity-90"
      >
        {sending ? "Sending..." : "Send test email"}
      </Button>

      {result && (
        <div
          className={
            "rounded-md border p-3 text-sm " +
            (result.ok
              ? "border-accent/40 bg-accent/10 text-accent-foreground"
              : "border-destructive/40 bg-destructive/10 text-destructive")
          }
        >
          {result.ok === true ? (
            <div>
              <div className="font-medium">✅ Delivered</div>
              <div className="text-xs opacity-80 mt-1">
                To: {result.to} · {result.at}
              </div>
            </div>
          ) : (
            <div>
              <div className="font-medium">❌ Failed</div>
              <div className="text-xs opacity-80 mt-1">To: {result.to} · {result.at}</div>
              <div className="text-xs mt-2 break-words">{(result as { error: string }).error}</div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};


interface UserStats {
  id: string; email: string | null; display_name: string | null; avatar_url: string | null;
  joined_at: string; library_count: number; download_count: number;
  library: { game_id: string; title: string; added_at: string }[];
  downloads: { game_id: string; title: string; at: string }[];
}

const UsersPanel = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ total_users: number; total_downloads: number; users: UserStats[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setErr(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Please sign in again");
      const { data: res, error } = await supabase.functions.invoke("admin-stats", {
        headers: { "x-admin-code": ADMIN_CODE, Authorization: `Bearer ${token}` },
      });
      if (error) throw error;
      setData(res);
    } catch (e: any) { setErr(e.message ?? "Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  if (loading) return <div className="p-10 text-center text-muted-foreground">Loading users...</div>;
  if (err) return <div className="p-10 text-center text-destructive">{err}</div>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="rounded-2xl lg-panel p-4">
          <div className="text-xs text-muted-foreground">Total users</div>
          <div className="text-2xl font-bold">{data.total_users}</div>
        </div>
        <div className="rounded-2xl lg-panel p-4">
          <div className="text-xs text-muted-foreground">Total downloads</div>
          <div className="text-2xl font-bold">{data.total_downloads}</div>
        </div>
      </div>
      <div className="rounded-2xl lg-panel overflow-hidden">
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
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4 bg-white/[0.04]">
              <div className="grid md:grid-cols-2 gap-4 pt-2">
                <div>
                  <div className="text-sm font-semibold mb-2">Library ({u.library.length})</div>
                  <ul className="space-y-1 text-sm">
                    {u.library.map((g, i) => <li key={i} className="border-b border-border/30 py-1">{g.title}</li>)}
                  </ul>
                </div>
                <div>
                  <div className="text-sm font-semibold mb-2">Downloads ({u.downloads.length})</div>
                  <ul className="space-y-1 text-sm">
                    {u.downloads.map((d, i) => <li key={i} className="border-b border-border/30 py-1">{d.title}</li>)}
                  </ul>
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
