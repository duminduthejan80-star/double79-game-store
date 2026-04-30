import { Link, NavLink } from "react-router-dom";
import { Gamepad2, Library, Shield, Store } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Store", icon: Store },
  { to: "/library", label: "Library", icon: Library },
  { to: "/admin", label: "Admin", icon: Shield },
];

const Navbar = () => {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-surface-1/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-gradient shadow-glow">
            <Gamepad2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-widest text-foreground">DOUBLE79</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Game Store</div>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-smooth",
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
      </div>
    </header>
  );
};

export default Navbar;
