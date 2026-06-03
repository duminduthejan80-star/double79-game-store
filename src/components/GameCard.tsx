import { Link } from "react-router-dom";
import { Wifi, WifiOff, Gamepad2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Game } from "@/types/game";

const GameCard = ({ game }: { game: Game }) => {
  return (
    <Link
      to={`/game/${game.id}`}
      className="group relative flex flex-col overflow-hidden rounded-lg bg-card-gradient border border-border/60 shadow-card transition-smooth hover:border-primary/50 hover:shadow-glow hover:-translate-y-1"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-surface-2">
        {game.image_url ? (
          <img
            src={game.image_url}
            alt={game.title}
            loading="lazy"
            className="h-full w-full object-cover transition-smooth group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Gamepad2 className="h-12 w-12 opacity-30" />
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2">
          {game.featured && (
            <Badge className="bg-accent text-accent-foreground border-0">Featured</Badge>
          )}
          <Badge variant="secondary" className="ml-auto bg-background/70 backdrop-blur-md">
            {game.mode === "online" ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
            {game.mode}
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground line-clamp-1">{game.title}</h3>
        </div>
        {game.genre && (
          <p className="text-xs text-muted-foreground line-clamp-1">{game.genre}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-sm font-bold text-accent">Free</span>
        </div>
      </div>
    </Link>
  );
};

export default GameCard;
