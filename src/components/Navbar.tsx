import { Link, NavLink } from "react-router-dom";
import { Library, Shield, Store, Download, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

const links = [
  { to: "/", label: "Store", icon: Store },
  { to: "/library", label: "Library", icon: Library },
  { to: "/downloads", label: "Downloads", icon: Download },
  { to: "/admin", label: "Admin", icon: Shield },
];

const Navbar = () => {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-surface-1/80 backdrop-blur-xl cinematic-nav">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 gap-2">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full overflow-hidden ring-1 ring-primary/50 shadow-glow">
              <img src={logo} alt="Double79" className="h-full w-full object-cover" />
            </div>
            <div className="leading-tight">
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
            <svg viewBox="0 0 28 20" className="h-7 w-auto" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path fill="#FF0000" d="M27.4 3.1a3.5 3.5 0 0 0-2.5-2.5C22.7 0 14 0 14 0S5.3 0 3.1.6A3.5 3.5 0 0 0 .6 3.1C0 5.3 0 10 0 10s0 4.7.6 6.9a3.5 3.5 0 0 0 2.5 2.5C5.3 20 14 20 14 20s8.7 0 10.9-.6a3.5 3.5 0 0 0 2.5-2.5C28 14.7 28 10 28 10s0-4.7-.6-6.9z"/>
              <path fill="#FFFFFF" d="M11.2 14.3 18.4 10l-7.2-4.3v8.6z"/>
            </svg>
          </a>
        </div>

        <nav className="flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-smooth",
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )
              }
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
        </nav>

        <a
          href={`https://wa.me/94704962595?text=${encodeURIComponent("Request Game\n\nGame Name: ")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold bg-[hsl(142_70%_40%)] text-white hover:bg-[hsl(142_70%_35%)] transition-smooth shadow-glow"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Request Game</span>
        </a>
      </div>
    </header>
  );
};

export default Navbar;
