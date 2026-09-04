import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const ProfileSettingsDialog = ({ open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, phone")
        .eq("id", user.id)
        .maybeSingle();
      setName(data?.display_name || (user.user_metadata?.full_name as string) || "");
      setPhone(data?.phone || "");
      setAvatar(data?.avatar_url || (user.user_metadata?.avatar_url as string) || null);
    })();
  }, [open, user]);

  const pickFile = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: signed } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (!signed?.signedUrl) throw new Error("Could not create image link");
      setAvatar(signed.signedUrl);
      toast.success("Photo ready — press Save");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!user) return;
    if (!name.trim()) return toast.error("Enter a display name");
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim(), avatar_url: avatar, phone: phone.replace(/[^\d+]/g, "") || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["public-profiles"] });
    qc.invalidateQueries({ queryKey: ["my-profile"] });
    toast.success("Profile updated");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Customize your profile</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="relative h-24 w-24 rounded-full overflow-hidden border border-white/20 bg-white/5 group"
          >
            {avatar ? (
              <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-muted-foreground">
                {(name || "P").charAt(0).toUpperCase()}
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])}
          />
          <span className="text-xs text-muted-foreground">Tap the photo to change it</span>
        </div>

        <div className="space-y-3">
          <div>
            <Label>Display name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
          </div>
          <div>
            <Label>Phone number</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} placeholder="+94 70 496 2595" />
          </div>
        </div>

        <Button
          className="w-full bg-primary-gradient text-primary-foreground hover:opacity-90 mt-2"
          disabled={saving || uploading}
          onClick={save}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileSettingsDialog;
