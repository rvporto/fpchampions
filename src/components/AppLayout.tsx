import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Crown, LayoutDashboard, Trophy, Spade, Users, BarChart3, Wallet, LogOut, Menu, Award, UserCircle2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, public: true },
  { to: "/partidas", label: "Partidas", icon: Spade, public: true },
  { to: "/ranking", label: "Ranking", icon: Trophy, public: true },
  { to: "/hall-da-fama", label: "Hall da Fama", icon: Award, public: false },
  { to: "/perfil", label: "Perfil", icon: UserCircle2, public: false },
];

const adminItems = [
  { to: "/admin/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/estatisticas", label: "Estatísticas", icon: BarChart3 },
  { to: "/admin/vinculos", label: "Vínculos", icon: Users },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const isLogged = !!user;
  const handleSignOut = async () => { await signOut(); navigate("/auth"); };
  return (
    <div className="min-h-screen flex flex-col">
      <DesktopHeader isAdmin={isAdmin} isLogged={isLogged} onSignOut={handleSignOut} />
      <MobileHeader isAdmin={isAdmin} isLogged={isLogged} onSignOut={handleSignOut} />
      <main className="flex-1 container max-w-6xl py-6 sm:py-10 pb-10 animate-fade-in">{children}</main>
      <Footer />
    </div>
  );
}

function DesktopHeader({ isAdmin, isLogged, onSignOut }: { isAdmin: boolean; isLogged: boolean; onSignOut: () => void }) {
  return (
    <header className="hidden md:block sticky top-0 z-40 glass-effect">
      <div className="container max-w-6xl h-20 flex items-center gap-4">
        <Link to="/" className="shrink-0">
          <Logo size={56} />
        </Link>
        <nav className="flex-1 flex items-center justify-center gap-1 lg:gap-1.5">
          {navItems.filter((i) => i.public || isLogged).map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
          {isAdmin && adminItems.map((item) => <NavItem key={item.to} {...item} admin />)}
        </nav>
        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && <Badge className="bg-gradient-gold text-primary-foreground border-0"><Crown className="size-3 mr-1" />Admin</Badge>}
          {isLogged ? (
            <Button variant="ghost" size="sm" onClick={onSignOut} className="text-muted-foreground hover:bg-secondary hover:text-foreground"><LogOut className="size-4 mr-1" />Sair</Button>
          ) : (
            <Link to="/auth"><Button size="sm" className="bg-gradient-gold text-primary-foreground"><LogIn className="size-4 mr-1" />Entrar</Button></Link>
          )}
        </div>
      </div>
    </header>
  );
}

function NavItem({ to, label, icon: Icon, admin }: { to: string; label: string; icon: any; admin?: boolean }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        cn(
          "px-2.5 py-2 rounded-lg text-[13px] lg:text-sm font-medium flex items-center gap-1.5 whitespace-nowrap transition-all",
          isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
          admin && "border border-primary/20"
        )
      }
    >
      <Icon className="size-4 shrink-0" />
      {label}
    </NavLink>
  );
}

function Ornament({ side }: { side: "left" | "right" }) {
  return (
    <div className={cn("flex-1 flex items-center gap-2", side === "right" && "scale-x-[-1]")}>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/60 to-primary/80" />
      <svg width="22" height="10" viewBox="0 0 22 10" fill="none" className="text-primary">
        <path d="M0 5 H8 L11 1 L14 5 L17 9 L22 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.8)]" />
    </div>
  );
}

function MobileHeader({ isAdmin, isLogged, onSignOut }: { isAdmin: boolean; isLogged: boolean; onSignOut: () => void }) {
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "md:hidden relative z-30 transition-all duration-300 ease-out",
          scrolled ? "pointer-events-none -translate-y-full opacity-0" : "translate-y-0 opacity-100",
        )}
      >
        <div className="flex items-center justify-center gap-3 bg-background/95 backdrop-blur px-4 py-3">
          <Ornament side="left" />
          <Link to="/" className="shrink-0">
            <Logo size={44} withText={false} />
          </Link>
          <Ornament side="right" />
        </div>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
      </div>
      <SheetTrigger asChild>
        <button
          aria-label="Abrir menu"
          className={cn(
            "md:hidden fixed right-3 z-50 size-12 rounded-full bg-gradient-gold flex items-center justify-center text-primary-foreground active:scale-95 transition-all duration-300 ease-out ring-2 ring-primary/40",
            "shadow-[0_4px_18px_-2px_hsl(var(--primary)/0.55)]",
            scrolled ? "top-3" : "top-4",
          )}
        >
          <Menu className="size-6" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[85%] max-w-sm bg-card border-border">
        <div className="mt-2 mb-6"><Logo /></div>
        <nav className="flex flex-col gap-1">
          {navItems.filter((i) => i.public || isLogged).map((i) => <NavItem key={i.to} {...i} />)}
          {isAdmin && (
            <>
              <div className="fpc-divider my-3" />
              <p className="px-3 text-xs uppercase tracking-wider text-muted-foreground mb-1">Administração</p>
              {adminItems.map((i) => <NavItem key={i.to} {...i} admin />)}
            </>
          )}
          <div className="fpc-divider my-3" />
          {isLogged ? (
            <Button variant="ghost" onClick={onSignOut} className="justify-start text-muted-foreground"><LogOut className="size-4 mr-2" />Sair</Button>
          ) : (
            <Link to="/auth"><Button className="w-full bg-gradient-gold text-primary-foreground"><LogIn className="size-4 mr-2" />Entrar</Button></Link>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
      <span className="fpc-text-gold font-display">Família Poker Champions</span> · Liga de Torneios · {new Date().getFullYear()}
    </footer>
  );
}
