import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Auth() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="fpc-card w-full max-w-md">
        <CardContent className="p-8">
          <div className="flex justify-center mb-6"><Logo size={64} /></div>
          <h1 className="font-display text-2xl text-center fpc-text-gold">Entre na liga</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">Faça login para acompanhar partidas, rankings e conquistas.</p>

          <div className="space-y-3 mt-6">
            <div><Label>E-mail</Label><Input type="email" placeholder="seu@email.com" /></div>
            <div><Label>Senha</Label><Input type="password" placeholder="••••••••" /></div>
            <Button className="w-full bg-gradient-gold text-primary-foreground">Entrar</Button>
            <Button variant="outline" className="w-full">Continuar com Google</Button>
            <p className="text-xs text-muted-foreground text-center">
              Ainda sem conta? <Link to="/" className="text-primary hover:underline">Cadastre-se</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
