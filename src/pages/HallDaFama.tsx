import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Crown, Trophy, Spade, Award, Sparkles } from "lucide-react";
import { HALL_OF_FAME, playerById } from "@/lib/mockData";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { toast } from "sonner";

export default function HallDaFama() {
  const [tab, setTab] = useState("rounds");
  const isAdmin = true;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl fpc-text-gold flex items-center gap-2"><Award className="size-7" />Hall da Fama</h1>
        <p className="text-sm text-muted-foreground">Os campeões que escreveram a história da Família Poker Champions.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full">
          <TabsTrigger value="rounds"><Spade className="size-4 mr-1" />Rodadas</TabsTrigger>
          <TabsTrigger value="months"><Sparkles className="size-4 mr-1" />Meses</TabsTrigger>
          <TabsTrigger value="as">🂡 Ás</TabsTrigger>
          <TabsTrigger value="year"><Crown className="size-4 mr-1" />K do Poker</TabsTrigger>
        </TabsList>

        <TabsContent value="rounds" className="mt-4">
          <CountList title="Vencedores de Rodada" icon={<Trophy className="size-5" />} entries={HALL_OF_FAME.rounds()} unit="vitórias" />
        </TabsContent>
        <TabsContent value="months" className="mt-4">
          <CountList title="Vencedores do Mês" icon={<Sparkles className="size-5" />} entries={HALL_OF_FAME.months()} unit="meses" />
        </TabsContent>
        <TabsContent value="as" className="mt-4 space-y-4">
          {isAdmin && (
            <Button onClick={() => toast.info("Indicar vencedor do Ás (mock)")} className="bg-gradient-gold text-primary-foreground">
              Indicar vencedor do Ás
            </Button>
          )}
          <ChampionGrid title="Ás do Poker" entries={HALL_OF_FAME.asWinners()} />
        </TabsContent>
        <TabsContent value="year" className="mt-4">
          <ChampionGrid title="K do Poker — Campeões do Ano" entries={HALL_OF_FAME.yearChampions()} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CountList({ title, icon, entries, unit }: any) {
  return (
    <Card className="fpc-card">
      <CardHeader><CardTitle className="font-display fpc-text-gold flex items-center gap-2">{icon}{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {entries.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Ainda sem registros.</p>}
        {entries.map((e: any, i: number) => {
          const p = playerById(e.playerId);
          if (!p) return null;
          return (
            <div key={e.playerId} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-secondary/40">
              <span className="font-display w-8 text-center text-primary">{i + 1}º</span>
              <PlayerAvatar avatarId={p.avatarId} name={p.nickname} size={40} />
              <div className="flex-1 min-w-0">
                <p className="font-medium break-words line-clamp-2">{p.nickname}</p>
                <p className="text-xs text-muted-foreground">{p.full_name}</p>
              </div>
              <span className="fpc-chip">{e.count} {unit}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ChampionGrid({ title, entries }: any) {
  return (
    <Card className="fpc-card">
      <CardHeader><CardTitle className="font-display fpc-text-gold">{title}</CardTitle></CardHeader>
      <CardContent className="grid sm:grid-cols-2 gap-4">
        {entries.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center col-span-2">Aguardando o primeiro campeão.</p>}
        {entries.map((e: any) => {
          const p = playerById(e.playerId);
          if (!p) return null;
          return (
            <div key={e.year} className="fpc-card fpc-hover-gold p-6 text-center">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Temporada {e.year}</p>
              <Crown className="size-8 mx-auto mt-2 text-warning" />
              <PlayerAvatar avatarId={p.avatarId} name={p.nickname} size={96} className="mx-auto mt-3" />
              <p className="font-display text-xl mt-3 fpc-text-gold break-words">{p.nickname}</p>
              <p className="text-sm text-muted-foreground break-words">{p.full_name}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
