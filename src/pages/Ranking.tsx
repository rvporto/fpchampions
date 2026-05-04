import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy, FileText, Crown, Medal, Award as AwardIcon, Loader2, RefreshCw } from "lucide-react";
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
            <Card className="fpc-card">
              <CardHeader className="pb-2">
                <CardTitle className="font-display fpc-text-gold flex items-center justify-center gap-2 text-xl">
                  <Crown className="size-5 text-warning" /> Pódio dos Campeões
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-6">
                  {[1, 0, 2].map((order) => {
                    const row = podium[order];
                    if (!row) return <div key={order} />;
                    const place = order + 1;
                    const cfg =
                      place === 1
                        ? { ring: "ring-warning", border: "border-warning/60 shadow-[0_0_40px_-8px_hsl(var(--warning)/0.55)]", bg: "bg-warning/15", icon: <Crown className="size-5 text-warning" />, accent: "text-warning" }
                        : place === 2
                        ? { ring: "ring-muted-foreground", border: "border-muted-foreground/40", bg: "bg-muted/40", icon: <Medal className="size-5 text-muted-foreground" />, accent: "text-muted-foreground" }
                        : { ring: "ring-tournament", border: "border-tournament/50", bg: "bg-tournament/15", icon: <AwardIcon className="size-5 text-tournament" />, accent: "text-tournament" };
                    const avatarSize = place === 1 ? 88 : 72;
                    return (
                      <div key={row.id} className={`relative rounded-2xl border ${cfg.border} bg-card/60 px-2 sm:px-4 pt-10 pb-4 flex flex-col items-center text-center`}>
                        <div className={`absolute -top-6 left-1/2 -translate-x-1/2 size-12 rounded-full ${cfg.bg} border border-border flex items-center justify-center`}>
                          {cfg.icon}
                        </div>
                        <div className={`rounded-full ring-2 ${cfg.ring} ring-offset-2 ring-offset-card`}>
                          <PlayerAvatar avatarId={row.avatarId} name={row.nickname} size={avatarSize} />
                        </div>
                        <p className="font-medium text-sm sm:text-base mt-3 break-words line-clamp-2">{row.nickname}</p>
                        {!row.isTemp && <LevelBadge level={row.level} className="mt-1" />}
                        <p className={`font-display text-xl sm:text-2xl mt-2 ${cfg.accent}`}>{formatPoints(row.points)} <span className="text-xs sm:text-sm opacity-80">pts</span></p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="fpc-card">
            <CardHeader><CardTitle className="font-display fpc-text-gold flex items-center gap-2"><Trophy className="size-5" />Classificação completa</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {list.map((row, i) => {
                const me = !row.isTemp && user?.id === row.id;
                const delta = tab === "season" ? deltaMap?.get(rowKey(row)) : undefined;
                return (
                  <div key={`${row.isTemp ? "t" : "u"}-${row.id}`} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${me ? "bg-primary/10 border border-primary/30" : "hover:bg-secondary/40"}`}>
                    <span className="font-display text-lg w-8 text-center text-primary">{i + 1}º</span>
                    {tab === "season" && (
                      <span className="w-8 flex justify-center"><PositionDelta delta={delta} /></span>
                    )}
                    <PlayerAvatar avatarId={row.avatarId} name={row.nickname} size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm break-words line-clamp-2 flex items-center gap-2 flex-wrap">
                        <span>{row.nickname}</span>
                        {!row.isTemp && <LevelBadge level={row.level} />}
                        {row.isTemp && <span className="text-[10px] uppercase text-muted-foreground">temp</span>}
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
