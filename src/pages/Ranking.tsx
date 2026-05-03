import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy, FileText, Crown, Medal, Loader2, RefreshCw } from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { formatPoints, ordinal, MONTHS_PT } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useRanking, useSeasonRankingDelta, rowKey } from "@/hooks/useRanking";
import { recalcRankingAndXp } from "@/lib/recalc";
import { renderAndCapture } from "@/lib/reports";
import { RankingReport } from "@/components/Reports";
import { LinkTempPlayerDialog } from "@/components/LinkTempPlayerDialog";
import { LevelBadge, PositionDelta } from "@/components/RankIndicators";
import { useQueryClient } from "@tanstack/react-query";

export default function Ranking() {
  const year = new Date().getFullYear();
  const [tab, setTab] = useState<"season" | "month">("season");
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const { user, isAdmin } = useAuth();
  const { data: ranking, isLoading } = useRanking({ year, month: tab === "month" ? month : undefined });
  const { data: deltaMap } = useSeasonRankingDelta(year);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const list = ranking ?? [];
  const podium = list.slice(0, 3);

  const onRecalc = async () => {
    setBusy(true);
    try {
      const r = await recalcRankingAndXp();
      await qc.invalidateQueries();
      toast.success(`Recalculado: ${r.participations} participações, ${r.profiles} perfis.`);
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const onReport = async () => {
    if (list.length === 0) return toast.error("Sem dados para o relatório.");
    const title = tab === "month" ? `Ranking ${MONTHS_PT[month - 1]} ${year}` : `Ranking Temporada ${year}`;
    setBusy(true);
    try {
      const reportDelta = tab === "season" ? deltaMap : undefined;
      await renderAndCapture(<RankingReport title={title} subtitle={`${list.length} jogadores`} rows={list} deltaMap={reportDelta} />, `${title.replace(/\s+/g, "_")}.jpg`);
      toast.success("Relatório baixado.");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl fpc-text-gold">Ranking — Temporada {year}</h1>
          <p className="text-sm text-muted-foreground">Pontuação acumulada por partidas finalizadas.</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={onRecalc} disabled={busy}>
              <RefreshCw className={`size-4 mr-1 ${busy ? "animate-spin" : ""}`} />Recalcular
            </Button>
          )}
          <Button onClick={onReport} disabled={busy} className="bg-gradient-gold text-primary-foreground">
            <FileText className="size-4 mr-1" />Gerar Relatório
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="season">Temporada</TabsTrigger>
          <TabsTrigger value="month">Mês</TabsTrigger>
        </TabsList>
        <TabsContent value="month" className="mt-3">
          <div className="flex flex-wrap gap-2">
            {MONTHS_PT.map((m, i) => (
              <Button key={m} size="sm" variant={month === i + 1 ? "default" : "outline"} onClick={() => setMonth(i + 1)}>
                {m.slice(0, 3)}
              </Button>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="size-8 text-primary animate-spin" /></div>
      ) : list.length === 0 ? (
        <Card className="fpc-card"><CardContent className="p-10 text-center text-sm text-muted-foreground">Nenhuma partida finalizada {tab === "month" ? `em ${MONTHS_PT[month - 1]}` : "nesta temporada"}.</CardContent></Card>
      ) : (
        <>
          {podium.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {[1, 0, 2].map((order) => {
                const row = podium[order];
                if (!row) return <div key={order} />;
                const place = order + 1;
                const styles = place === 1 ? "scale-105 border-primary/60" : "";
                const icon = place === 1 ? <Crown className="size-6 text-warning" /> : place === 2 ? <Medal className="size-6 text-muted-foreground" /> : <Medal className="size-6 text-tournament" />;
                return (
                  <Card key={row.id} className={`fpc-card ${styles}`}>
                    <CardContent className="p-3 sm:p-4 flex flex-col items-center text-center gap-2">
                      {icon}
                      <PlayerAvatar avatarId={row.avatarId} name={row.nickname} size={place === 1 ? 64 : 52} />
                      <p className="font-medium text-sm break-words line-clamp-2">{row.nickname}</p>
                      <p className="font-display text-xl text-primary">{formatPoints(row.points)}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{ordinal(place)} lugar</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <Card className="fpc-card">
            <CardHeader><CardTitle className="font-display fpc-text-gold flex items-center gap-2"><Trophy className="size-5" />Classificação completa</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {list.map((row, i) => {
                const me = !row.isTemp && user?.id === row.id;
                return (
                  <div key={`${row.isTemp ? "t" : "u"}-${row.id}`} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${me ? "bg-primary/10 border border-primary/30" : "hover:bg-secondary/40"}`}>
                    <span className="font-display text-lg w-8 text-center text-primary">{i + 1}º</span>
                    <PlayerAvatar avatarId={row.avatarId} name={row.nickname} size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm break-words line-clamp-2">
                        {row.nickname}
                        {row.isTemp && <span className="ml-2 text-[10px] uppercase text-muted-foreground">temp</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">{row.games} partidas · {row.wins} vitórias</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {row.isTemp && <LinkTempPlayerDialog tempPlayerId={row.id} tempPlayerName={row.nickname} />}
                      <p className="font-display text-base text-primary">{formatPoints(row.points)}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
