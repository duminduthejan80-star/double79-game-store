import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const links = [
  { to: "/home", label: "store" },
  { to: "/library", label: "library" },
  { to: "/admin", label: "admin" },
];

const Navbar = () => {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [nearTop, setNearTop] = useState(true);

  useEffect(() => {
    const onScroll = () => setNearTop(window.scrollY < 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Hover trigger strip at the top */}
      <div
        className="fixed top-0 left-0 right-0 h-14 z-40"
        onMouseEnter={() => setOpen(true)}
      />

      <header
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className={cn(
          "fixed top-0 left-0 right-0 z-50",
          "transition-all duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          open || !nearTop ? "opacity-100 translate-y-0" : "opacity-30 -translate-y-0"
        )}
      >
        <div className="mx-auto max-w-6xl px-8 py-6 flex items-center justify-between">
          {/* Just a mark — no name */}
          <Link
            to="/home"
            className="text-[10px] tracking-[0.5em] uppercase text-muted-foreground hover:text-foreground"
          >
            d/79
          </Link>

          {/* Links — hidden until hover */}
          <nav
            className={cn(
              "flex items-center gap-10 text-[11px] tracking-[0.35em] uppercase",
              "transition-opacity duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
              open ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
          >
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/home"}
                className={({ isActive }) =>
                  cn(
                    "text-muted-foreground hover:text-foreground",
                    isActive && "text-foreground"
                  )
                }
              >
                {label}
              </NavLink>
            ))}
            <a
              href={`https://wa.me/94704962595?text=${encodeURIComponent("Request Game\n\nGame Name: ")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              request
            </a>
            {user && (
              <button
                onClick={signOut}
                className="text-muted-foreground hover:text-foreground"
              >
                exit
              </button>
            )}
          </nav>
        </div>
        <div
          className={cn(
            "mx-auto max-w-6xl h-px bg-border transition-opacity duration-[1200ms]",
            open ? "opacity-100" : "opacity-0"
          )}
        />
      </header>
    </>
  );
};

export default Navbar;
