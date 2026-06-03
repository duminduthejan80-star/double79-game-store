import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Library from "./pages/Library.tsx";
import Admin from "./pages/Admin.tsx";
import GameDetail from "./pages/GameDetail.tsx";
import Downloads from "./pages/Downloads.tsx";
import { DownloadsProvider } from "@/lib/downloads";
import { HardwareProfileProvider } from "@/lib/hardwareProfile";
import DownloadWidget from "@/components/DownloadWidget";
import SplashScreen from "@/components/SplashScreen";
import LoginStreakTracker from "@/components/LoginStreakTracker";
import ParticleField from "@/components/ParticleField";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ParticleField />
      <SplashScreen />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <DownloadsProvider>
          <HardwareProfileProvider>
            <LoginStreakTracker />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/library" element={<Library />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/downloads" element={<Downloads />} />
              <Route path="/game/:id" element={<GameDetail />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <DownloadWidget />
          </HardwareProfileProvider>
        </DownloadsProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
