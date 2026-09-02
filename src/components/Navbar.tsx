import { Link, NavLink } from "react-router-dom";
import { Library, Store, LogOut, MessageCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import { useAuth } from "@/lib/auth";
import { useProStatus } from "@/hooks/usePro";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const links = [
  { to: "/home", label: "Store", icon: Store },
  { to: "/library", label: "Library", icon: Library },
  { to: "/how-to-download", label: "How to Download", icon: HelpCircle },
  
];

const Navbar = () => {
  const { user, signOut } = useAuth();
  const { data: pro } = useProStatus();
  const avatar = (user?.user_metadata?.avatar_url as string) || "";
  const name = (user?.user_metadata?.full_name as string) || user?.email || "Player";

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 pb-1">
      {/* ambient refraction glows */}
      <div className="pointer-events-none absolute -top-24 left-1/4 h-[320px] w-[320px] rounded-full bg-primary/20 blur-[120px]" />
      <div className="pointer-events-none absolute -top-20 right-1/4 h-[260px] w-[260px] rounded-full bg-accent/10 blur-[100px]" />

      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-[2rem] border border-white/20 bg-white/[0.04] px-3 py-2 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.55),inset_0_1px_1px_rgba(255,255,255,0.2)] ring-1 ring-black/30 backdrop-blur-3xl">
        {/* top edge gloss */}
        <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-b from-white/15 via-transparent to-transparent" />

        <div className="relative flex items-center gap-3 pl-1">
          <Link to="/home" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full overflow-hidden ring-1 ring-primary/50 shadow-glow">
              <img src={logo} alt="Double79" className="h-full w-full object-cover" />
            </div>
            <div className="leading-tight hidden sm:block">
              <div className="text-sm font-bold tracking-widest text-foreground">DOUBLE79</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Game Store</div>
            </div>
          </Link>
          <a
            href="https://www.youtube.com/channel/UCeUlnTEhYCeZGm8xL9NMZMQ"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YouTube channel"
            className="inline-flex items-center justify-center transition-all duration-300 ease-out hover:scale-110 [filter:drop-shadow(0_0_8px_rgba(255,0,0,0.6))] hover:[filter:drop-shadow(0_0_16px_rgba(255,0,0,0.95))]"
          >
            <svg viewBox="0 0 28 20" className="h-6 w-auto" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path fill="#FF0000" d="M27.4 3.1a3.5 3.5 0 0 0-2.5-2.5C22.7 0 14 0 14 0S5.3 0 3.1.6A3.5 3.5 0 0 0 .6 3.1C0 5.3 0 10 0 10s0 4.7.6 6.9a3.5 3.5 0 0 0 2.5 2.5C5.3 20 14 20 14 20s8.7 0 10.9-.6a3.5 3.5 0 0 0 2.5-2.5C28 14.7 28 10 28 10s0-4.7-.6-6.9z"/>
              <path fill="#FFFFFF" d="M11.2 14.3 18.4 10l-7.2-4.3v8.6z"/>
            </svg>
          </a>
        </div>

        <nav className="relative flex items-center gap-1 rounded-full border border-white/5 bg-black/20 p-1 backdrop-blur-xl">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/home"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-all duration-300",
                  isActive
                    ? "bg-white/10 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                    : "text-muted-foreground hover:bg-white/[0.07] hover:text-foreground"
                )
              }
            >
              <Icon className="h-4 w-4" />
              <span className="hidden md:inline">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="relative flex items-center gap-3 pr-1">
          <a
            href={`https://wa.me/94704962595?text=${encodeURIComponent("Request Game\n\nGame Name: ")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold bg-[hsl(142_70%_45%)] text-slate-950 hover:bg-[hsl(142_70%_52%)] transition-all duration-300 active:scale-95 shadow-[0_0_20px_hsl(142_70%_45%/0.35)]"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Request Game</span>
          </a>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-3 rounded-full border-l border-white/15 pl-3 pr-2 hover:bg-white/[0.06]">
                  <span className="hidden md:flex flex-col items-end leading-tight">
                    <span className="text-xs font-semibold text-foreground/90 max-w-[180px] truncate">{name}</span>
                    <span className={cn(
                      "text-[9px] font-bold uppercase tracking-[0.2em]",
                      pro?.isPro ? "text-amber-300" : "text-emerald-400"
                    )}>
                      {pro?.isPro ? `Pro · ${pro.daysLeft}d` : "Free"}
                    </span>
                  </span>
                  <span className="relative">
                    <span className="absolute -inset-1 rounded-full bg-primary/40 blur-md opacity-40" />
                    {avatar ? (
                      <img src={avatar} alt={name} className="relative h-8 w-8 rounded-full border border-white/30" />
                    ) : (
                      <span className="relative flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-primary-gradient text-xs font-bold text-primary-foreground">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );

};

export default Navbar;
