import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  nickname: string | null;
  full_name: string | null;
  phone: string | null;
  gender: string | null;
  avatar_url: string | null;
  level: number;
  xp: number;
  current_rank: number | null;
  lifetime_winnings: number;
  profile_completed: boolean;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Função agora retorna os dados para serem usados de forma síncrona no fluxo de carregamento
  const loadExtras = async (uid: string) => {
    try {
      const [{ data: prof }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);
      setProfile((prof as Profile | null) ?? null);
      setIsAdmin(!!roles?.some((r: any) => r.role === "admin"));
    } catch (error) {
      console.error("Erro ao carregar dados extras:", error);
    }
  };

  useEffect(() => {
    // Monitora mudanças de estado (Login/Logout)
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      
      if (sess?.user) {
        setLoading(true); // Garante que volta ao estado de loading ao mudar usuário
        await loadExtras(sess.user.id);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
      setLoading(false); // Só libera o loading após processar o perfil
    });

    // Inicialização da sessão atual
    const initSession = async () => {
      try {
        const { data: { session: sess } } = await supabase.auth.getSession();
        setSession(sess);
        setUser(sess?.user ?? null);
        
        if (sess?.user) {
          await loadExtras(sess.user.id);
        }
      } catch (error) {
        console.error("Erro na sessão inicial:", error);
      } finally {
        setLoading(false); // Finaliza o loading inicial
      }
    };

    initSession();

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdmin(false);
    setLoading(false);
  };

  const refreshProfile = async () => {
    if (user) await loadExtras(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, isAdmin, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}

