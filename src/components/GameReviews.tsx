import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Star, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Feedback {
  id: string;
  user_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

const Stars = ({ n, onPick }: { n: number; onPick?: (v: number) => void }) => (
  <div className="inline-flex gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <button
        key={i}
        type="button"
        onClick={onPick ? () => onPick(i) : undefined}
        disabled={!onPick}
        className={onPick ? "cursor-pointer" : "cursor-default"}
        aria-label={`${i} star`}
      >
        <Star className={`h-4 w-4 ${i <= n ? "fill-accent text-accent" : "text-muted-foreground/40"}`} />
      </button>
    ))}
  </div>
);

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

export const GameReviews = ({ gameId }: { gameId: string }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<Feedback[]>([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("game_feedback_public" as any)
      .select("id, user_name, rating, comment, created_at")
      .eq("game_id", gameId)
      .order("created_at", { ascending: true })
      .limit(200)
      .then(({ data }) => { if (mounted && data) setItems(data as Feedback[]); });


    const ch = supabase
      .channel(`feedback-${gameId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "game_feedback", filter: `game_id=eq.${gameId}` },
        (payload) => setItems((r) => [...r, payload.new as Feedback]))
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [gameId]);

  const submit = async () => {
    if (!user) { toast.error("Sign in to leave a review"); return; }
    if (rating < 1) { toast.error("Pick a rating from 1 to 5 stars"); return; }
    setPosting(true);
    const userName = (user.user_metadata?.full_name as string) ||
                     (user.user_metadata?.name as string) ||
                     user.email?.split("@")[0] || "Player";
    const { error } = await supabase.from("game_feedback").insert({
      game_id: gameId,
      user_id: user.id,
      user_name: userName,
      user_email: user.email!,
      rating,
      comment: comment.trim() || null,
    });
    setPosting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Thanks for your review!");
    setRating(0); setComment("");
  };

  const avg = items.length ? items.reduce((s, r) => s + r.rating, 0) / items.length : 0;

  return (
    <section className="rounded-lg glass p-6 mt-8">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-accent" /> User Reviews &amp; Ratings
        </h2>
        {items.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Stars n={Math.round(avg)} />
            <span className="text-muted-foreground">{avg.toFixed(1)} · {items.length} reviews</span>
          </div>
        )}
      </div>

      {user && (
        <div className="rounded-md border border-border/50 bg-surface-2 p-4 mb-5 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Your rating:</span>
            <Stars n={rating} onPick={setRating} />
          </div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your thoughts about this game..."
            rows={3}
            maxLength={500}
          />
          <div className="flex justify-end">
            <Button onClick={submit} disabled={posting || rating < 1} size="sm">
              <Send className="h-4 w-4 mr-2" /> {posting ? "Posting..." : "Post review"}
            </Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No reviews yet. Be the first to share your thoughts!
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r.id} className="rounded-md border border-border/50 bg-surface-2 p-4">
              <div className="flex items-start justify-between gap-4 mb-1.5">
                <div>
                  <div className="font-medium text-sm">{r.user_name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{formatTime(r.created_at)}</div>
                </div>
                <Stars n={r.rating} />
              </div>
              {r.comment && <p className="text-sm text-foreground/90 mt-2 whitespace-pre-wrap">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default GameReviews;
