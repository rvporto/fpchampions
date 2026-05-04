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
                <div className="grid grid-cols-3 gap-2 sm:gap-5 items-end">
                  {[1, 0, 2].map((order) => {
                    const row = podium[order];
                    if (!row) return <div key={order} />;
                    const place = (order + 1) as 1 | 2 | 3;
                    const me = !row.isTemp && user?.id === row.id;
                    const cfg =
                      place === 1
                        ? {
                            ring: "ring-warning",
                            border: "border-warning",
                            bg: "bg-[linear-gradient(180deg,hsl(var(--warning)/0.18)_0%,hsl(var(--warning)/0.04)_100%)]",
                            badgeBg: "bg-gradient-gold shadow-[0_4px_16px_-2px_hsl(var(--warning)/0.6)]",
                            iconColor: "text-primary-foreground",
                            glow: "shadow-[0_0_24px_-4px_hsl(var(--warning)/0.55)]",
                            icon: Crown,
                            accent: "text-warning",
                          }
                        : place === 2
                        ? {
                            ring: "ring-muted-foreground",
                            border: "border-border",
                            bg: "bg-card",
                            badgeBg: "bg-secondary border border-border",
                            iconColor: "text-foreground/80",
                            glow: "",
                            icon: Medal,
                            accent: "text-muted-foreground",
                          }
                        : {
                            ring: "ring-tournament",
                            border: "border-tournament/60",
                            bg: "bg-[linear-gradient(180deg,hsl(var(--tournament)/0.22)_0%,hsl(var(--tournament)/0.05)_100%)]",
                            badgeBg: "bg-tournament/20 border border-tournament/50",
                            iconColor: "text-tournament",
                            glow: "",
                            icon: AwardIcon,
                            accent: "text-tournament",
                          };
                    const Icon = cfg.icon;
                    const avatarSize = place === 1 ? 96 : 80;
                    const avatarSizeMobile = place === 1 ? 48 : 44;
                    return (
                      <div key={row.id} className="relative flex flex-col items-center pt-5 sm:pt-7">
                        <div className={`absolute top-0 z-10 flex h-9 w-9 items-center justify-center rounded-full sm:h-12 sm:w-12 ${cfg.badgeBg}`}>
                          <Icon className={`h-4 w-4 sm:h-6 sm:w-6 ${cfg.iconColor}`} />
                        </div>
                        <div className={`w-full rounded-2xl border-2 p-2.5 pt-6 sm:p-4 sm:pt-8 transition-all ${cfg.border} ${cfg.bg} ${cfg.glow}`}>
                          <div className="flex justify-center">
                            <div className={`rounded-full ring-2 ring-offset-2 ring-offset-background ${cfg.ring}`}>
                              <span className="hidden sm:block">
                                <PlayerAvatar avatarId={row.avatarId} name={row.nickname} size={avatarSize} />
                              </span>
                              <span className="sm:hidden block">
                                <PlayerAvatar avatarId={row.avatarId} name={row.nickname} size={avatarSizeMobile} />
                              </span>
                            </div>
                          </div>
                          <div className="mt-2 text-center sm:mt-3">
                            <div className="flex flex-col items-center gap-1 sm:flex-row sm:flex-wrap sm:justify-center">
                              <span
                                className="line-clamp-2 break-words text-[10px] font-bold leading-tight sm:line-clamp-1 sm:truncate sm:text-base"
                                title={row.nickname}
                              >
                                {row.nickname}
                              </span>
                              <div className="flex items-center gap-1">
                                {!row.isTemp && <LevelBadge level={row.level} />}
                                {me && (
                                  <span className="rounded-full bg-primary/20 px-1 py-0.5 text-[8px] font-bold uppercase text-primary sm:px-1.5 sm:text-[9px]">
                                    Você
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className={`mt-0.5 text-sm font-extrabold sm:text-xl ${cfg.accent}`}>
                              {formatPoints(row.points)} <span className="text-[10px] sm:text-xs opacity-80">pts</span>
                            </div>
                          </div>
                        </div>
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
                const isTop3 = i < 3;
                const delta = tab === "season" ? deltaMap?.get(rowKey(row)) : undefined;
                return (
                  <div key={`${row.isTemp ? "t" : "u"}-${row.id}`} className={`rounded-xl px-3 py-2 ${me ? "bg-primary/10 border border-primary/30" : isTop3 ? "bg-primary/5" : "hover:bg-secondary/40"}`}>
                    {/* LINHA 1 */}
                    <div className="flex items-center gap-3">
                      <div className="flex w-12 items-center gap-1.5 sm:w-14 sm:gap-2 shrink-0">
                        <span className={`font-display text-base sm:text-lg ${isTop3 ? "text-primary" : "text-muted-foreground"}`}>{i + 1}º</span>
                        {tab === "season" && <PositionDelta delta={delta} />}
                      </div>
                      <PlayerAvatar avatarId={row.avatarId} name={row.nickname} size={40} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="break-words font-semibold text-sm leading-tight">{row.nickname}</span>
                          {!row.isTemp && <LevelBadge level={row.level} />}
                          {me && <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">Você</span>}
                          {row.isTemp && <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">Temp</span>}
                        </div>
                        <div className="hidden text-xs text-muted-foreground sm:block">
                          {row.games} {row.games === 1 ? "partida" : "partidas"} · {row.wins} vitórias
                        </div>
                      </div>
                      {/* Direita: desktop */}
                      <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                        <p className="font-display text-base text-primary">{formatPoints(row.points)} <span className="text-xs opacity-80">pts</span></p>
                        {row.isTemp && <LinkTempPlayerDialog tempPlayerId={row.id} tempPlayerName={row.nickname} />}
                      </div>
                    </div>
                    {/* LINHA 2 — mobile */}
                    <div className="mt-2 flex items-center justify-between gap-2 pl-12 sm:hidden">
                      <div className="text-xs text-muted-foreground">
                        {row.games} {row.games === 1 ? "partida" : "partidas"}
                      </div>
                      <div className="flex items-center gap-2">
                        {row.isTemp && <LinkTempPlayerDialog tempPlayerId={row.id} tempPlayerName={row.nickname} />}
                        <p className="font-display text-sm text-primary">{formatPoints(row.points)} <span className="text-[10px] opacity-80">pts</span></p>
                      </div>
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
