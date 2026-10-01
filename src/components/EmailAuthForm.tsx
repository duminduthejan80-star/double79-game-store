import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const EmailAuthForm = () => {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error("Enter a valid email");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    setBusy(true);
    const err = mode === "signin" ? await signInWithEmail(email, password) : await signUpWithEmail(email, password);
    setBusy(false);
    if (err) return toast.error(err);
    if (mode === "signup") toast.success("Account created — check your email to confirm, then sign in.");
  };

  return (
    <form onSubmit={submit} className="space-y-3 text-left">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" /> or use email <div className="h-px flex-1 bg-border" />
      </div>
      <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} autoComplete="email" />
      <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={72} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
      <Button type="submit" disabled={busy} className="w-full bg-primary-gradient text-primary-foreground hover:opacity-90">
        {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
      </Button>
      <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">
        {mode === "signin" ? "No account? Sign up" : "Have an account? Sign in"}
      </button>
    </form>
  );
};

export default EmailAuthForm;
