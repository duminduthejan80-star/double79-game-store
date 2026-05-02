import { Link, NavLink } from "react-router-dom";
import { Gamepad2, Library, Shield, Store, Download, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
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
  { to: "/", label: "Store", icon: Store },
  { to: "/library", label: "Library", icon: Library },
  { to: "/downloads", label: "Downloads", icon: Download },
  { to: "/admin", label: "Admin", icon: Shield },
];

const Navbar = () => {
  const { user, signOut } = useAuth();
  const avatar = (user?.user_metadata?.avatar_url as string) || "";
  const name = (user?.user_metadata?.full_name as string) || user?.email || "Player";

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-surface-1/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 gap-2">
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

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 px-2">
                {avatar ? (
                  <img src={avatar} alt={name} className="h-7 w-7 rounded-full" />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-primary-gradient flex items-center justify-center text-xs font-bold text-primary-foreground">
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="hidden md:inline text-sm">{name}</span>
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
    </header>
  );
};

export default Navbar;
