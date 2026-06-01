import { useEffect, useRef, useState, useCallback } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from "firebase/auth";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { ShieldCheck, Phone, LogOut } from "lucide-react";

// ─── Firebase setup (module-level singleton, survives hot-reloads) ────────────
const firebaseConfig = {
  apiKey: "AIzaSyDCbccJpsw_lOnlLaEkgEtBzLKkWdwn77M",
  authDomain: "double79-game-store.firebaseapp.com",
  projectId: "double79-game-store",
  storageBucket: "double79-game-store.firebasestorage.app",
  messagingSenderId: "112135204551",
  appId: "1:112135204551:web:be40cdb19fe25503f3d8e2",
};

const firebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const firebaseAuth = getAuth(firebaseApp);

// ─── Module-level reCAPTCHA instance ─────────────────────────────────────────
// Kept outside React state/refs so it survives StrictMode double-invocations
// and Vite HMR re-renders without leaking a second instance into the same DOM node.
let globalRecaptchaVerifier: RecaptchaVerifier | null = null;

function destroyRecaptcha() {
  try {
    globalRecaptchaVerifier?.clear();
  } catch {
    // ignore errors during cleanup — the widget may already be gone
  }
  globalRecaptchaVerifier = null;

  // Also wipe the DOM node so Firebase doesn't see a "used" element next time
  const el = document.getElementById("recaptcha-container");
  if (el) el.innerHTML = "";
}

function getOrCreateRecaptcha(): RecaptchaVerifier {
  if (!globalRecaptchaVerifier) {
    globalRecaptchaVerifier = new RecaptchaVerifier(
      firebaseAuth,
      "recaptcha-container",
      {
        size: "invisible",
        callback: () => {
          // reCAPTCHA solved — signInWithPhoneNumber continues automatically
        },
        "expired-callback": () => {
          // Token expired; destroy so it's freshly created on the next attempt
          destroyRecaptcha();
          toast.error("reCAPTCHA expired. Please try again.");
        },
      }
    );
  }
  return globalRecaptchaVerifier;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Status = "loading" | "verified" | "needs_phone" | "needs_otp";

// ─── Component ────────────────────────────────────────────────────────────────
export const PhoneVerificationGate = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user, signOut } = useAuth();
  const [status, setStatus] = useState<Status>("loading");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  // ── Destroy reCAPTCHA on unmount ─────────────────────────────────────────
  // Handles both StrictMode teardown and normal unmounts.
  useEffect(() => {
    return () => {
      destroyRecaptcha();
    };
  }, []);

  // ── Check Supabase for existing phone_verified flag ──────────────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("phone_verified")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setStatus(data?.phone_verified ? "verified" : "needs_phone");
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // ── Resend countdown ─────────────────────────────────────────────────────
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // ── Send OTP ─────────────────────────────────────────────────────────────
  const sendOtp = useCallback(async () => {
    const cleaned = phone.replace(/\s/g, "");
    if (!/^\+\d{8,15}$/.test(cleaned)) {
      toast.error("Enter phone in E.164 format, e.g. +94771234567");
      return;
    }

    setSending(true);
    try {
      // Always get-or-create; never blindly create a second instance.
      const verifier = getOrCreateRecaptcha();
      const result = await signInWithPhoneNumber(firebaseAuth, cleaned, verifier);
      confirmationRef.current = result;
      toast.success("OTP sent via SMS");
      setStatus("needs_otp");
      setResendIn(60);
    } catch (e: any) {
      // On any failure, nuke the instance so the next attempt starts clean.
      destroyRecaptcha();
      toast.error(e.message || "Failed to send OTP");
    } finally {
      setSending(false);
    }
  }, [phone]);

  // ── Verify OTP ───────────────────────────────────────────────────────────
  const verify = useCallback(async () => {
    if (code.length !== 6 || !confirmationRef.current) return;
    setVerifying(true);
    try {
      await confirmationRef.current.confirm(code);

      // Mark phone as verified in Supabase
      if (user) {
        await supabase
          .from("profiles")
          .update({ phone_verified: true, phone: phone.replace(/\s/g, "") })
          .eq("id", user.id);
      }

      // Clean up reCAPTCHA — no longer needed after a successful verify
      destroyRecaptcha();
      toast.success("Phone verified!");
      setStatus("verified");
    } catch (e: any) {
      toast.error(e.message || "Invalid code. Please try again.");
      setCode("");
    } finally {
      setVerifying(false);
    }
  }, [code, phone, user]);

  // ── Resend: destroy existing instance first, then re-send ────────────────
  const handleResend = useCallback(async () => {
    destroyRecaptcha();
    confirmationRef.current = null;
    await sendOtp();
  }, [sendOtp]);

  // ── Change number: go back to step 1 and clean up ────────────────────────
  const handleChangeNumber = useCallback(() => {
    destroyRecaptcha();
    confirmationRef.current = null;
    setCode("");
    setStatus("needs_phone");
  }, []);

  // ── Render guards ────────────────────────────────────────────────────────
  if (!user) return <>{children}</>;
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }
  if (status === "verified") return <>{children}</>;

  // ── Verification UI ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-hero">
      {/*
        Invisible reCAPTCHA anchor.
        - Must exist in the DOM before sendOtp is called.
        - Kept outside the card so the hidden iframe never shifts layout.
        - innerHTML is wiped by destroyRecaptcha() before each fresh init.
      */}
      <div id="recaptcha-container" aria-hidden="true" />

      <div className="w-full max-w-md rounded-xl border border-border bg-card-gradient p-8 shadow-elevated">
        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="h-14 w-14 rounded-2xl bg-primary-gradient flex items-center justify-center shadow-glow">
            <ShieldCheck className="h-7 w-7 text-primary-foreground" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center mb-2">
          Verify your phone
        </h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          We'll send a 6-digit code via SMS to keep your account secure.
        </p>

        {/* ── Step 1: enter phone number ── */}
        {status === "needs_phone" && (
          <div className="space-y-4">
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="tel"
                placeholder="+94771234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-10"
                disabled={sending}
                onKeyDown={(e) => e.key === "Enter" && sendOtp()}
              />
            </div>
            <Button
              onClick={sendOtp}
              disabled={sending}
              className="w-full"
              size="lg"
            >
              {sending ? "Sending..." : "Send OTP via SMS"}
            </Button>
          </div>
        )}

        {/* ── Step 2: enter OTP ── */}
        {status === "needs_otp" && (
          <div className="space-y-4">
            <p className="text-xs text-center text-muted-foreground">
              Code sent to{" "}
              <span className="text-foreground font-medium">{phone}</span>
            </p>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={code} onChange={setCode}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button
              onClick={verify}
              disabled={code.length !== 6 || verifying}
              className="w-full"
              size="lg"
            >
              {verifying ? "Verifying..." : "Verify"}
            </Button>
            <div className="flex items-center justify-between text-xs">
              <button
                onClick={handleChangeNumber}
                className="text-muted-foreground hover:text-foreground"
              >
                Change number
              </button>
              <button
                onClick={handleResend}
                disabled={resendIn > 0 || sending}
                className="text-primary hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
              </button>
            </div>
          </div>
        )}

        {/* ── Sign out ── */}
        <button
          onClick={signOut}
          className="mt-6 w-full text-xs text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1"
        >
          <LogOut className="h-3 w-3" /> Sign out
        </button>
      </div>
    </div>
  );
};

export default PhoneVerificationGate;
