import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
  e.preventDefault();
  setBusy(true);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  setBusy(false);
  
  if (error) {
    if (error.message.includes("Email not confirmed")) {
      return toast.error("Por favor, confirme seu e-mail antes de entrar.");
    }
    return toast.error(error.message);
  }
  
  toast.success("Bem-vindo de volta!");
  navigate("/", { replace: true });
};

  const handleSignUp = async (e: React.FormEvent) => {
  e.preventDefault();
  setBusy(true);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Importante: Redireciona o usuário de volta para o seu site após clicar no link
      emailRedirectTo: `${window.location.origin}/auth`,
      data: { nickname: nickname || email.split("@")[0] },
    },
  });
  
  setBusy(false);

  if (error) return toast.error(error.message);

  // Se a confirmação de e-mail estiver ativa, data.session será null
  if (data.user && !data.session) {
    toast.success("Verifique sua caixa de entrada para confirmar seu e-mail!", {
      duration: 10000, // Deixa a mensagem por mais tempo (10s)
    });
    // Limpa os campos para o usuário saber que o processo parou aqui
    setPassword("");
  } else {
    toast.success("Conta criada e logada!");
    navigate("/", { replace: true });
  }
};

const handleForgotPassword = async () => {
    if (!email) {
      return toast.error("Digite seu e-mail para receber o link de recuperação.");
  }
  
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
  });

    if (error) {
    toast.error(error.message);
  } else {
    toast.success("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
  }
};

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) toast.error(error.message);
  };

  return (
  <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-bg">
    <Card className="fpc-card w-full max-w-md">
      <CardContent className="p-8">
        <div className="flex justify-center mb-6">
          <Logo size={64} />
        </div>
        <h1 className="font-display text-2xl text-center fpc-text-gold">Família Poker Champions</h1>
        <p className="text-sm text-muted-foreground text-center mt-1">Acompanhe partidas, rankings e conquistas.</p>

        <Tabs defaultValue="signin" className="mt-6">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="signin">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Cadastrar</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-3 mt-4">
            <form onSubmit={handleSignIn} className="space-y-3">
              <div>
                <Label>E-mail</Label>
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
              </div>
              <div>
                <Label>Senha</Label>
                <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                <div className="flex justify-end">
                  <Button 
                    variant="link" 
                    type="button" 
                    onClick={handleForgotPassword}
                    className="px-0 font-normal text-[10px] text-muted-foreground hover:text-gold"
                  >
                    Esqueceu sua senha?
                  </Button>
                </div>
              </div> 

              <Button type="submit" disabled={busy} className="w-full bg-gradient-gold text-primary-foreground">
                {busy ? <Loader2 className="size-4 animate-spin" /> : "Entrar"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="space-y-3 mt-4">
            <form onSubmit={handleSignUp} className="space-y-3">
              <div>
                <Label>Apelido</Label>
                <Input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Como te chamam na mesa" />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
              </div>
              <div>
                <Label>Senha</Label>
                <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
              </div>
              <Button type="submit" disabled={busy} className="w-full bg-gradient-gold text-primary-foreground">
                {busy ? <Loader2 className="size-4 animate-spin" /> : "Criar conta"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center"><span className="bg-card px-2 text-xs text-muted-foreground">ou</span></div>
        </div>

        <Button variant="outline" className="w-full" onClick={handleGoogle}>
          Continuar com Google
        </Button>

        <p className="text-xs text-muted-foreground text-center mt-5">
          <Link to="/" className="text-primary hover:underline">Voltar ao site</Link>
        </p>
      </CardContent>
    </Card>
  </div>
);
}

