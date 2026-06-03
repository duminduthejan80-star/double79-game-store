import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const Login = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const from = (loc.state as any)?.from || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!loading && user) nav(from, { replace: true });
  }, [user, loading, nav, from]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
        toast.success("Account created! Please sign in");
        setIsSignUp(false);
        setPassword("");
      } else {
        await signIn(email, password);
        toast.success("Signed in successfully");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-hero">
      <div className="w-full max-w-md rounded-xl border border-border bg-card-gradient p-10 shadow-elevated">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-2xl bg-primary-gradient flex items-center justify-center shadow-glow">
            <Gamepad2 className="h-8 w-8 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-2 text-center">Welcome to Double79</h1>
        <p className="text-muted-foreground mb-8 text-sm text-center">
          {isSignUp ? "Create an account to get started" : "Sign in to access your library"}
        </p>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Email</label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-surface-2 border-border"
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-surface-2 border-border"
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : isSignUp ? "Create Account" : "Sign In"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setPassword("");
              }}
              className="text-primary hover:underline font-medium"
              type="button"
            >
              {isSignUp ? "Sign in" : "Create one"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
