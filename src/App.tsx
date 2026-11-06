import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import GameDetail from "./pages/GameDetail";
import NotFound from "./pages/NotFound";
import { HardwareProfileProvider } from "@/lib/hardwareProfile";
import { useScrollReveal } from "@/hooks/useScrollReveal";
const queryClient = new QueryClient();
function AppShell({ children }: { children: React.ReactNode }) { useScrollReveal(); return <>{children}</>; }
export default function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><Toaster /><Sonner /><BrowserRouter><HardwareProfileProvider><AppShell><Routes>
    <Route path="/" element={<Index />} /><Route path="/home" element={<Index />} />
    <Route path="/game/:id" element={<GameDetail />} /><Route path="/d79-ctrl-x9k4m2" element={<Admin />} />
    {["/login", "/library", "/downloads", "/how-to-download", "/profiles"].map(path => <Route key={path} path={path} element={<Navigate to="/home" replace />} />)}
    <Route path="*" element={<NotFound />} />
  </Routes></AppShell></HardwareProfileProvider></BrowserRouter></TooltipProvider></QueryClientProvider>;
}
