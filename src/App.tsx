import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Partidas from "./pages/Partidas";
import Ranking from "./pages/Ranking";
import HallDaFama from "./pages/HallDaFama";
import Perfil from "./pages/Perfil";
import Estatisticas from "./pages/Estatisticas";
import AdminFinanceiro from "./pages/AdminFinanceiro";
import AdminVinculos from "./pages/AdminVinculos";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route element={<LayoutRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/partidas" element={<Partidas />} />
            <Route path="/ranking" element={<Ranking />} />
            <Route path="/hall-da-fama" element={<HallDaFama />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/estatisticas" element={<Estatisticas />} />
            <Route path="/admin/financeiro" element={<AdminFinanceiro />} />
            <Route path="/admin/vinculos" element={<AdminVinculos />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

import { Outlet } from "react-router-dom";
const LayoutRoute = () => (<AppLayout><Outlet /></AppLayout>);

export default App;
