import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Users, Coins, Trophy } from "lucide-react";
import { GAMES } from "@/lib/mockData";
import { formatBRL, formatDateTime } from "@/lib/format";
import { toast } from "sonner";

export default function Partidas() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl fpc-text-gold">Partidas</h1>
          <p className="text-sm text-muted-foreground">Histórico completo de torneios da liga.</p>
        </div>
        <Button onClick={() => toast.info("Modal de criar partida (mock)")} className="bg-gradient-gold text-primary-foreground">
          <Plus className="size-4 mr-1" />Nova Partida
        </Button>
      </div>

      <div className="space-y-3">
        {GAMES.map((g) => (
          <Card key={g.id} className="fpc-card fpc-hover-gold">
            <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display text-lg break-words">{g.name}</h3>
                  <Badge className="bg-gradient-tournament text-tournament-foreground border-0">Torneio</Badge>
                  <Badge variant={g.status === "finished" ? "default" : g.status === "in_progress" ? "secondary" : "outline"}>
                    {g.status === "finished" ? "Finalizada" : g.status === "in_progress" ? "Em andamento" : "Agendada"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground mt-2">
                  <span className="flex items-center gap-1"><Calendar className="size-3.5" />{formatDateTime(g.date)}</span>
                  <span className="flex items-center gap-1"><Users className="size-3.5" />{g.total_players} jogadores</span>
                  <span className="flex items-center gap-1"><Coins className="size-3.5" />Buy-in {formatBRL(g.buy_in)} · Rebuy {formatBRL(g.rebuy_value)}</span>
                  <span className="flex items-center gap-1"><Trophy className="size-3.5" />Pote {formatBRL(g.total_pot)}</span>
                </div>
              </div>
              <Link to={`/partidas`} onClick={(e) => { e.preventDefault(); toast.info("Modal de detalhes (mock)"); }}>
                <Button variant="outline" size="sm">Ver detalhes</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
