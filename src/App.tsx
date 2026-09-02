import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Intro from "./pages/Intro.tsx";
import NotFound from "./pages/NotFound.tsx";
import Library from "./pages/Library.tsx";
import Admin from "./pages/Admin.tsx";
import GameDetail from "./pages/GameDetail.tsx";
import Downloads from "./pages/Downloads.tsx";
import Login from "./pages/Login.tsx";
import HowToDownload from "./pages/HowToDownload.tsx";
import { DownloadsProvider } from "@/lib/downloads";
import { HardwareProfileProvider } from "@/lib/hardwareProfile";
import SplashScreen from "@/components/SplashScreen";
import CinematicBackground from "@/components/CinematicBackground";
import { AuthProvider } from "@/lib/auth";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoginStreakTracker from "@/components/LoginStreakTracker";
import DesktopDownloadManager from "@/components/DesktopDownloadManager";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const queryClient = new QueryClient();

const AppShell = ({ children }: { children: React.ReactNode }) => {
  useScrollReveal();
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SplashScreen />
      
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AuthGateProvider>
          <DownloadsProvider>
            <HardwareProfileProvider>
              <AppShell>
              <LoginStreakTracker />
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Intro />} />
                <Route path="/home" element={<Index />} />
                <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
                <Route path="/d79-ctrl-x9k4m2" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                <Route path="/downloads" element={<Downloads />} />
                <Route path="/how-to-download" element={<HowToDownload />} />
                <Route path="/game/:id" element={<GameDetail />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <DesktopDownloadManager />
              </AppShell>

            </HardwareProfileProvider>
          </DownloadsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
