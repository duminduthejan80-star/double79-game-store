import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, MessageSquare } from "lucide-react";

interface Review {
  id: string;
  username: string;
  rating: number;
  created_at: string;
}

const Stars = ({ n }: { n: number }) => (
  <div className="inline-flex">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star key={i} className={`h-4 w-4 ${i <= n ? "fill-accent text-accent" : "text-muted-foreground/40"}`} />
    ))}
  </div>
);

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) +
    " · " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

export const GameReviews = ({ gameId }: { gameId: string }) => {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("game_reviews")
      .select("id, username, rating, created_at")
      .eq("game_id", gameId)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => { if (mounted && data) setReviews(data); });

    const ch = supabase
      .channel(`reviews-${gameId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "game_reviews", filter: `game_id=eq.${gameId}` },
        (payload) => setReviews((r) => [payload.new as Review, ...r]))
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [gameId]);

  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0;

  return (
    <section className="rounded-lg glass p-6 mt-8">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-accent" /> User Reviews & Ratings
        </h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Stars n={Math.round(avg)} />
            <span className="text-muted-foreground">{avg.toFixed(1)} · {reviews.length} reviews</span>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No reviews yet. Be the first to rate this game via WhatsApp after downloading!
        </p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-4 rounded-md border border-border/50 bg-surface-2 p-4">
              <div>
                <div className="font-medium text-sm">{r.username}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{formatTime(r.created_at)}</div>
              </div>
              <Stars n={r.rating} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default GameReviews;
