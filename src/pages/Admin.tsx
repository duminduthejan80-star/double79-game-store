import { useEffect, useState } from "react";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { useQueryClient } from "@tanstack/react-query";
import { adminAuth, saveAppDownloadUrl } from "@/lib/firebaseStore";
import { useAppDownload } from "@/hooks/useAppDownload";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Save, LogOut } from "lucide-react";
import { toast } from "sonner";

export default function Admin() {
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const query = useQueryClient();
  const settings = useAppDownload();
  useEffect(() => { if (settings.data) setUrl(settings.data); }, [settings.data]);
  useEffect(() => {
    try { return onAuthStateChanged(adminAuth(), async user => {
      try { setAllowed(user ? (await user.getIdTokenResult()).claims.admin === true : false); }
      catch { setAllowed(false); }
      finally { setChecking(false); }
    }); } catch (e) { setError(e instanceof Error ? e.message : "Admin unavailable"); setChecking(false); }
  }, []);
  async function login(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const result = await signInWithEmailAndPassword(adminAuth(), email.trim(), password);
      if ((await result.user.getIdTokenResult(true)).claims.admin !== true) { await signOut(adminAuth()); throw new Error("මෙම ගිණුමට admin අවසර නැහැ."); }
      setAllowed(true); setPassword("");
    } catch (e) { setError(e instanceof Error ? e.message : "Sign-in failed"); }
    finally { setBusy(false); }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { await saveAppDownloadUrl(url); await query.invalidateQueries({ queryKey: ["app-download-url"] }); toast.success("App download link එක සුරැකුවා."); }
    catch (e) { setError(e instanceof Error ? e.message : "Save failed"); }
    finally { setBusy(false); }
  }
  return <div className="min-h-screen"><Navbar /><main className="container mx-auto px-4 py-12 max-w-2xl">
    <div className="flex items-center justify-between gap-4 mb-8"><h1 className="text-2xl font-bold flex items-center gap-3"><Shield className="h-6 w-6 text-primary" />App Download Link</h1>{allowed && <Button variant="ghost" size="icon" aria-label="Sign out" onClick={() => void signOut(adminAuth())}><LogOut className="h-5 w-5" /></Button>}</div>
    {checking ? <p>Checking access…</p> : allowed ? <form onSubmit={save} className="space-y-5">
      <div className="space-y-2"><Label htmlFor="app-url">Google Drive app link</Label><Input id="app-url" type="url" required value={url} onChange={e => setUrl(e.target.value)} placeholder="https://drive.google.com/file/d/…/view" /></div>
      <Button disabled={busy || settings.isLoading}><Save className="h-4 w-4 mr-2" />{busy ? "Saving…" : "Save Link"}</Button>
    </form> : <form onSubmit={login} className="space-y-5 max-w-sm">
      <h2 className="text-lg font-semibold">Admin access</h2>
      <div className="space-y-2"><Label htmlFor="admin-email">Email</Label><Input id="admin-email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="admin-password">Password</Label><Input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
      <Button disabled={busy}>{busy ? "Checking…" : "Admin Sign In"}</Button>
    </form>}
    {error && <p role="alert" className="text-destructive text-sm mt-4 break-words">{error}</p>}
  </main></div>;
}
