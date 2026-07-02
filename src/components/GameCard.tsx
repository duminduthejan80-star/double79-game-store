import { Link } from "react-router-dom";
import { Gamepad2 } from "lucide-react";
import type { Game } from "@/types/game";

const GameCard = ({ game }: { game: Game }) => {
  return (
    <Link
      to={`/game/${game.id}`}
      className="group block reveal-hover"
    >
      <div className="img-zoom relative aspect-[3/4] overflow-hidden bg-surface-1">
        {game.image_url ? (
          <img
            src={game.image_url}
            alt={game.title}
            loading="lazy"
            className="h-full w-full object-cover grayscale-[40%] group-hover:grayscale-0 transition-[filter] duration-[1600ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
            <Gamepad2 className="h-8 w-8" strokeWidth={1} />
          </div>
        )}
        {/* dark veil that lifts on hover */}
        <div className="absolute inset-0 bg-background/40 group-hover:bg-background/0 transition-colors duration-[1400ms]" />
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-light tracking-wide text-foreground/80 group-hover:text-foreground line-clamp-1 transition-colors duration-[900ms]">
          {game.title}
        </h3>
        <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground/60">
          {game.mode === "online" ? "on" : "off"}
        </span>
      </div>
      {game.genre && (
        <p className="mt-1 text-[10px] tracking-[0.3em] uppercase text-muted-foreground/40 line-clamp-1">
          {game.genre}
        </p>
      )}
    </Link>
  );
};

export default GameCard;
