import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gamepad2, Phone } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import EmailAuthForm from "@/components/EmailAuthForm";
import PhoneOtpStep from "@/components/PhoneOtpStep";

const PENDING_LIB_KEY = "d79_pending_library_game";

interface Ctx {
  /** Returns true when the user is already signed in. Otherwise opens the sign-in dialog. */
  requireAuth: (pendingGameId?: string) => boolean;
}

const AuthGateCtx = createContext<Ctx | undefined>(undefined);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export const AuthGateProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"signin" | "phone">("signin");

  const requireAuth = useCallback(
    (pendingGameId?: string) => {
      if (user) return true;
      if (pendingGameId) localStorage.setItem(PENDING_LIB_KEY, pendingGameId);
      setStep("signin");
      setOpen(true);
      return false;
    },
    [user],
  );

  // After a Google redirect back: finish the pending library add + require a phone number.
  useEffect(() => {
    if (loading || !user) return;
    const pending = localStorage.getItem(PENDING_LIB_KEY);
    (async () => {
      if (pending) {
        localStorage.removeItem(PENDING_LIB_KEY);
        const { error } = await supabase
          .from("user_library")
          .insert({ user_id: user.id, game_id: pending });
        if (!error || error.message.includes("duplicate")) {
          toast.success("Added to your library");
        }
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone_verified")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile?.phone_verified) {
        setStep("phone");
        setOpen(true);
      } else {
        setOpen(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, loading]);

  const phoneLocked = step === "phone" && !!user;

  return (
    <AuthGateCtx.Provider value={{ requireAuth }}>
      {children}
      <Dialog open={open} onOpenChange={(v) => { if (!phoneLocked) setOpen(v); }}>
        <DialogContent
          className={`max-w-sm text-center ${phoneLocked ? "[&>button]:hidden" : ""}`}
          onInteractOutside={(e) => { if (phoneLocked) e.preventDefault(); }}
          onEscapeKeyDown={(e) => { if (phoneLocked) e.preventDefault(); }}
        >
          {step === "signin" ? (
            <>
              <DialogHeader>
                <div className="flex justify-center mb-3">
                  <div className="h-14 w-14 rounded-2xl bg-primary-gradient flex items-center justify-center shadow-glow">
                    <Gamepad2 className="h-7 w-7 text-primary-foreground" />
                  </div>
                </div>
                <DialogTitle className="text-center">Sign in to save this game</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Your library is saved to your Google account.
              </p>
              <Button onClick={signInWithGoogle} size="lg" variant="outline" className="w-full gap-3 mt-2">
                <GoogleIcon /> Continue with Google
              </Button>
              <EmailAuthForm />
            </>
          ) : (
            <>
              <DialogHeader>
                <div className="flex justify-center mb-3">
                  <div className="h-14 w-14 rounded-2xl bg-primary-gradient flex items-center justify-center shadow-glow">
                    <Phone className="h-7 w-7 text-primary-foreground" />
                  </div>
                </div>
                <DialogTitle className="text-center">Verify your WhatsApp number</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                This is required. We'll send a 6-digit code to your WhatsApp.
              </p>
              <PhoneOtpStep onVerified={() => setOpen(false)} />
              <button type="button" onClick={() => signOut()} className="mt-3 text-xs text-muted-foreground hover:text-foreground">
                Sign out
              </button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AuthGateCtx.Provider>
  );
};

export const useAuthGate = () => {
  const c = useContext(AuthGateCtx);
  if (!c) throw new Error("useAuthGate must be inside AuthGateProvider");
  return c;
};
