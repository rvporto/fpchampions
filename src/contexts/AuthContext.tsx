import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
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
  const authLoadId = useRef(0);

  const loadExtras = async (uid: string, loadId: number) => {
    try {
      const [{ data: prof }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);

      if (authLoadId.current !== loadId) return;

      setProfile((prof as Profile | null) ?? null);
      setIsAdmin(!!roles?.some((r: { role: string }) => r.role === "admin"));
    } catch (err) {
      if (authLoadId.current !== loadId) return;

      console.error("Erro ao carregar perfil:", err);
      setProfile(null);
      setIsAdmin(false);
    } finally {
      if (authLoadId.current === loadId) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const handleSession = (sess: Session | null) => {
      const loadId = ++authLoadId.current;

      setLoading(true);
      setSession(sess);
      setUser(sess?.user ?? null);

      if (sess?.user) {
        setTimeout(() => {
          loadExtras(sess.user.id, loadId);
        }, 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      handleSession(sess);
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      handleSession(sess);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdmin(false);
  };

  const refreshProfile = async () => {
    if (user) {
      const loadId = ++authLoadId.current;
      setLoading(true);
      await loadExtras(user.id, loadId);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, session, profile, isAdmin, loading, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}

