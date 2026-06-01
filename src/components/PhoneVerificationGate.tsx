import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { ShieldCheck, Phone, LogOut } from "lucide-react";

type Status = "loading" | "verified" | "needs_phone" | "needs_otp";

export const PhoneVerificationGate = ({ children }: { children: React.ReactNode }) => {
  const { user, signOut } = useAuth();
  const [status, setStatus] = useState<Status>("loading");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("profiles").select("phone_verified").eq("id", user.id).maybeSingle();
      if (cancelled) return;
      setStatus(data?.phone_verified ? "verified" : "needs_phone");
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  if (!user) return <>{children}</>;
  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  }
  if (status === "verified") return <>{children}</>;

  const sendOtp = async () => {
    if (!/^\+\d{8,15}$/.test(phone.replace(/\s/g, ""))) {
      toast.error("Enter phone in E.164 format, e.g. +94771234567");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", { body: { phone: phone.replace(/\s/g, "") } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Verification code sent to your WhatsApp");
      setStatus("needs_otp");
      setResendIn(60);
    } catch (e: any) {
      toast.error(e.message || "Failed to send code");
    } finally {
      setSending(false);
    }
  };

  const verify = async () => {
    if (code.length !== 6) return;
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", { body: { code } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Phone verified!");
      setStatus("verified");
    } catch (e: any) {
      toast.error(e.message || "Verification failed");
      setCode("");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-hero">
      <div className="w-full max-w-md rounded-xl border border-border bg-card-gradient p-8 shadow-elevated">
        <div className="flex justify-center mb-5">
          <div className="h-14 w-14 rounded-2xl bg-primary-gradient flex items-center justify-center shadow-glow">
            <ShieldCheck className="h-7 w-7 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center mb-2">Verify your phone</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          We'll send a 6-digit code to your WhatsApp to keep your account secure.
        </p>

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
              />
            </div>
            <Button onClick={sendOtp} disabled={sending} className="w-full" size="lg">
              {sending ? "Sending..." : "Send code via WhatsApp"}
            </Button>
          </div>
        )}

        {status === "needs_otp" && (
          <div className="space-y-4">
            <p className="text-xs text-center text-muted-foreground">
              Code sent to <span className="text-foreground font-medium">{phone}</span>
            </p>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={code} onChange={setCode}>
                <InputOTPGroup>
                  {[0,1,2,3,4,5].map((i) => <InputOTPSlot key={i} index={i} />)}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button onClick={verify} disabled={code.length !== 6 || verifying} className="w-full" size="lg">
              {verifying ? "Verifying..." : "Verify"}
            </Button>
            <div className="flex items-center justify-between text-xs">
              <button
                onClick={() => { setStatus("needs_phone"); setCode(""); }}
                className="text-muted-foreground hover:text-foreground"
              >
                Change number
              </button>
              <button
                onClick={sendOtp}
                disabled={resendIn > 0 || sending}
                className="text-primary hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
              </button>
            </div>
          </div>
        )}

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
