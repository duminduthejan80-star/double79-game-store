import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

const todayStr = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);

export const LoginStreakTracker = () => {
  const { user } = useAuth();
  const [milestone, setMilestone] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = todayStr();
      const { data: existing } = await supabase
        .from("login_streaks")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      let current_streak = 1, total_visits = 1, last_milestone_shown = 0;

      if (!existing) {
        await supabase.from("login_streaks").insert({
          user_id: user.id, last_visit_date: today, current_streak: 1, total_visits: 1, last_milestone_shown: 0,
        });
      } else {
        const diff = daysBetween(existing.last_visit_date, today);
        if (diff === 0) {
          current_streak = existing.current_streak;
          total_visits = existing.total_visits;
          last_milestone_shown = existing.last_milestone_shown;
        } else {
          current_streak = diff === 1 ? existing.current_streak + 1 : 1;
          total_visits = existing.total_visits + 1;
          last_milestone_shown = existing.last_milestone_shown;
          await supabase.from("login_streaks").update({
            last_visit_date: today,
            current_streak,
            total_visits,
            updated_at: new Date().toISOString(),
          }).eq("user_id", user.id);
        }
      }

      if (current_streak > 0 && current_streak % 7 === 0 && current_streak > last_milestone_shown) {
        setMilestone(current_streak);
        await supabase.from("login_streaks").update({ last_milestone_shown: current_streak }).eq("user_id", user.id);
      }
    })();
  }, [user]);

  return (
    <Dialog open={milestone !== null} onOpenChange={(o) => !o && setMilestone(null)}>
      <DialogContent className="sm:max-w-md text-center overflow-hidden">
        <div className="absolute inset-0 bg-primary-gradient opacity-10 pointer-events-none" />
        <DialogHeader className="relative">
          <div className="mx-auto mb-3 h-20 w-20 rounded-full bg-primary-gradient flex items-center justify-center shadow-glow">
            <Trophy className="h-10 w-10 text-primary-foreground" />
          </div>
          <DialogTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" /> Congratulations!
          </DialogTitle>
          <DialogDescription className="text-base text-foreground/80">
            You have visited our website for{" "}
            <span className="font-bold text-accent">{milestone} days</span>!
          </DialogDescription>
        </DialogHeader>
        <div className="relative pt-2">
          <p className="text-sm text-muted-foreground mb-4">
            Thanks for being a loyal Double79 gamer. Keep the streak going!
          </p>
          <Button onClick={() => setMilestone(null)} className="w-full bg-primary-gradient">
            Awesome!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoginStreakTracker;
