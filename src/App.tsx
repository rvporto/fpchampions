import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Partidas from "./pages/Partidas";
import Ranking from "./pages/Ranking";
import HallDaFama from "./pages/HallDaFama";
import Perfil from "./pages/Perfil";
import Estatisticas from "./pages/Estatisticas";
import AdminFinanceiro from "./pages/AdminFinanceiro";
import AdminVinculos from "./pages/AdminVinculos";
import Auth from "./pages/Auth";
import CompleteProfile from "./pages/CompleteProfile";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

const LayoutRoute = () => (
  <AppLayout>
    <Outlet />
  </AppLayout>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/complete-profile"
              element={
                <ProtectedRoute>
                  <CompleteProfile />
                </ProtectedRoute>
              }
            />
            <Route element={<LayoutRoute />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/partidas" element={<Partidas />} />
              <Route path="/ranking" element={<Ranking />} />
              <Route
                path="/hall-da-fama"
                element={
                  <ProtectedRoute>
                    <HallDaFama />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/perfil"
                element={
                  <ProtectedRoute>
                    <Perfil />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/estatisticas"
                element={
                  <ProtectedRoute adminOnly>
                    <Estatisticas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/financeiro"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminFinanceiro />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/vinculos"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminVinculos />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
