import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Crown, Trophy, Spade, Award, Sparkles, Loader2, FileText } from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useHallOfFame, type HallEntry } from "@/hooks/useHallOfFame";
import { useAuth } from "@/contexts/AuthContext";
import { AddHallChampionDialog } from "@/components/AddHallChampionDialog";
import { renderAndCapture } from "@/lib/reports";
import { HallReport } from "@/components/HallReport";
import { toast } from "sonner";

export default function HallDaFama() {
  const [tab, setTab] = useState("rounds");
  const { data, isLoading } = useHallOfFame();
  const { isAdmin } = useAuth();

  const currentYear = new Date().getFullYear();
  const [roundsYear, setRoundsYear] = useState<string>(String(currentYear));
  const [monthsYear, setMonthsYear] = useState<string>(String(currentYear));

  const yearOptions = data?.years ?? [];

  const roundsList = useMemo<HallEntry[]>(() => {
    if (!data) return [];
    if (roundsYear === "all") return data.roundsAll;
    return data.roundsByYear[Number(roundsYear)] ?? [];
  }, [data, roundsYear]);

  const monthsList = useMemo<HallEntry[]>(() => {
    if (!data) return [];
    if (monthsYear === "all") return data.monthsAll;
    return data.monthsByYear[Number(monthsYear)] ?? [];
  }, [data, monthsYear]);

  const [genRounds, setGenRounds] = useState(false);
  const handleRoundsReport = async () => {
    if (!data) return;
    if (roundsList.length === 0) {
      toast.info("Sem dados para gerar relatório.");
      return;
    }
    const monthsForFilter = roundsYear === "all" ? data.monthsAll : (data.monthsByYear[Number(roundsYear)] ?? []);
    const monthsByPlayerKey = new Map<string, number>();
    for (const m of monthsForFilter) monthsByPlayerKey.set(m.key, m.count);
    setGenRounds(true);
    try {
      await renderAndCapture(
        <HallReport rounds={roundsList} monthsByPlayerKey={monthsByPlayerKey} year={roundsYear === "all" ? null : Number(roundsYear)} />,
        `hall-rodadas-${roundsYear === "all" ? "todas" : roundsYear}.jpg`
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao gerar relatório.");
    } finally {
      setGenRounds(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl fpc-text-gold flex items-center gap-2"><Award className="size-7" />Hall da Fama</h1>
        <p className="text-sm text-muted-foreground">Os campeões que escreveram a história da Família Poker Champions.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="size-8 text-primary animate-spin" /></div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="rounds"><Spade className="size-4 mr-1" />Rodadas</TabsTrigger>
            <TabsTrigger value="months"><Sparkles className="size-4 mr-1" />Meses</TabsTrigger>
            <TabsTrigger value="as">🂡 Ás</TabsTrigger>
            <TabsTrigger value="year"><Crown className="size-4 mr-1" />K</TabsTrigger>
          </TabsList>

          <TabsContent value="rounds" className="mt-4 space-y-3">
            <SeasonFilter value={roundsYear} onChange={setRoundsYear} years={yearOptions} />
            <CountList title="Vencedores de Rodada" icon={<Trophy className="size-5" />} entries={roundsList} unit="vitórias" />
          </TabsContent>
          <TabsContent value="months" className="mt-4 space-y-3">
            <SeasonFilter value={monthsYear} onChange={setMonthsYear} years={yearOptions} />
            <CountList title="Vencedores do Mês" icon={<Sparkles className="size-5" />} entries={monthsList} unit="meses" />
          </TabsContent>
          <TabsContent value="as" className="mt-4 space-y-3">
            {isAdmin && <div className="flex justify-end"><AddHallChampionDialog kind="as" /></div>}
            <ChampionGrid title="Ás do Poker — Indicados" entries={data?.asChampions ?? []} />
          </TabsContent>
          <TabsContent value="year" className="mt-4 space-y-3">
            {isAdmin && <div className="flex justify-end"><AddHallChampionDialog kind="k" /></div>}
            <ChampionGrid title="K do Poker — Campeões do Ano" entries={data?.yearChampions ?? []} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function SeasonFilter({ value, onChange, years }: { value: string; onChange: (v: string) => void; years: number[] }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">Temporada</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as temporadas</SelectItem>
          {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function CountList({ title, icon, entries, unit }: { title: string; icon: any; entries: HallEntry[]; unit: string }) {
  return (
    <Card className="fpc-card">
      <CardHeader><CardTitle className="font-display fpc-text-gold flex items-center gap-2">{icon}{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {entries.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Ainda sem registros.</p>}
        {entries.map((e, i) => (
          <div key={e.key} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-secondary/40">
            <span className="font-display w-8 text-center text-primary">{i + 1}º</span>
            <PlayerAvatar avatarId={e.avatarId} name={e.nickname} size={40} />
            <div className="flex-1 min-w-0">
              <p className="font-medium break-words line-clamp-2">
                {e.nickname}
                {e.isTemp && <span className="ml-2 text-[10px] uppercase text-muted-foreground">temp</span>}
              </p>
            </div>
            <span className="fpc-chip">{e.count} {unit}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ChampionGrid({ title, entries }: { title: string; entries: HallEntry[] }) {
  return (
    <Card className="fpc-card">
      <CardHeader><CardTitle className="font-display fpc-text-gold">{title}</CardTitle></CardHeader>
      <CardContent className="grid sm:grid-cols-2 gap-4">
        {entries.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center col-span-2">Aguardando o primeiro campeão.</p>}
        {entries.map((e) => (
          <div key={`${e.year}-${e.key}`} className="fpc-card fpc-hover-gold p-6 text-center">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Temporada {e.year}</p>
            <Crown className="size-8 mx-auto mt-2 text-warning" />
            <PlayerAvatar avatarId={e.avatarId} name={e.nickname} size={96} className="mx-auto mt-3" />
            <p className="font-display text-xl mt-3 fpc-text-gold break-words">{e.nickname}</p>
            {e.isTemp && <p className="text-[10px] uppercase text-muted-foreground mt-1">jogador temporário</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
