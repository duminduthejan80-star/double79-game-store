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
import Login from "./pages/Login.tsx";
import { DownloadsProvider } from "@/lib/downloads";
import { HardwareProfileProvider } from "@/lib/hardwareProfile";
import DownloadWidget from "@/components/DownloadWidget";
import SplashScreen from "@/components/SplashScreen";
import { AuthProvider } from "@/lib/auth";
import ProtectedRoute from "@/components/ProtectedRoute";
import PhoneVerificationGate from "@/components/PhoneVerificationGate";
import LoginStreakTracker from "@/components/LoginStreakTracker";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SplashScreen />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <DownloadsProvider>
            <HardwareProfileProvider>
            <PhoneVerificationGate>
              <LoginStreakTracker />
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                <Route path="/downloads" element={<ProtectedRoute><Downloads /></ProtectedRoute>} />
                <Route path="/game/:id" element={<ProtectedRoute><GameDetail /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <DownloadWidget />
            </PhoneVerificationGate>
            </HardwareProfileProvider>
          </DownloadsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
