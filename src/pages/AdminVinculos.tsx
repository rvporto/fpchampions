import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Check, X } from "lucide-react";
import { toast } from "sonner";

export default function AdminVinculos() {
  const requests = [
    { id: "r-1", user: "VocêPoker", temp: "Bia (temporário)", date: "há 2 dias" },
  ];
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl fpc-text-gold flex items-center gap-2"><Users className="size-7" />Vínculos de Jogadores</h1>
      <Card className="fpc-card">
        <CardHeader><CardTitle className="font-display fpc-text-gold">Solicitações Pendentes</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {requests.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl px-3 py-3 fpc-card">
              <div>
                <p className="text-sm"><span className="font-medium">{r.user}</span> ↔ <span className="text-muted-foreground">{r.temp}</span></p>
                <p className="text-xs text-muted-foreground">{r.date}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => toast.error("Rejeitado")}><X className="size-4" /></Button>
                <Button size="sm" className="bg-gradient-gold text-primary-foreground" onClick={() => toast.success("Aprovado e participações migradas")}><Check className="size-4" /></Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
