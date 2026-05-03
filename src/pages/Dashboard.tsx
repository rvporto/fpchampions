import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, Flame, Target, TrendingUp, Crown, ChevronRight, FileText, Award, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { CURRENT_USER_ID, GAMES, getMonthlyRanking, getSeasonalRanking, playerById, USER_ACHIEVEMENTS } from "@/lib/mockData";
import { ACHIEVEMENTS, levelFromXp } from "@/lib/xpSystem";
import { formatDate, formatPoints, MONTHS_PT, ordinal } from "@/lib/format";
import { toast } from "sonner";

export default function Dashboard() {
  const me = playerById(CURRENT_USER_ID)!;
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const monthlyRanking = useMemo(() => getMonthlyRanking(year, month), [year, month]);
  const seasonRanking = useMemo(() => getSeasonalRanking(year), [year]);
  const myMonthIndex = monthlyRanking.findIndex((r) => r.playerId === me.id);
  const mySeasonIndex = seasonRanking.findIndex((r) => r.playerId === me.id);
  const lvl = levelFromXp(me.xp);

  const recentGames = GAMES.filter((g) => g.status === "finished").slice(0, 3);
  const myFinishedGames = GAMES.filter((g) => g.status === "finished" && g.participants.some((p) => p.playerId === me.id));
  const myWins = myFinishedGames.filter((g) => g.participants.find((p) => p.playerId === me.id)?.position === 1).length;
  const myPoints = seasonRanking.find((r) => r.playerId === me.id)?.points ?? 0;

  return (
    <div className="space-y-6">
      <WelcomeCard me={me} levelData={lvl} mySeasonIndex={mySeasonIndex} />
      <StatsGrid games={myFinishedGames.length} wins={myWins} points={myPoints} position={mySeasonIndex + 1 || null} />
      <MonthlyRankingCard ranking={monthlyRanking} myIndex={myMonthIndex} year={year} month={month} />

      <div className="grid lg:grid-cols-2 gap-6">
        <SeasonTopCard ranking={seasonRanking} year={year} />
        <RecentGamesCard games={recentGames} />
      </div>
      <AchievementsCard />
    </div>
  );
}

function WelcomeCard({ me, levelData, mySeasonIndex }: any) {
  return (
    <Card className="fpc-card overflow-hidden">
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-gradient-gold" />
      <CardContent className="p-6 flex items-center gap-4 relative">
        <PlayerAvatar avatarId={me.avatarId} name={me.nickname} size={72} />
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Bem-vindo de volta</p>
          <h1 className="font-display text-2xl sm:text-3xl fpc-text-gold truncate">{me.nickname}</h1>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="fpc-chip"><Crown className="size-3" />Nível {levelData.level}</span>
            {mySeasonIndex >= 0 && <span className="fpc-chip"><Trophy className="size-3" />{ordinal(mySeasonIndex + 1)} no ranking</span>}
          </div>
          <div className="mt-3">
            <Progress value={levelData.progress * 100} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">{formatPoints(levelData.xpInLevel)} / 1000 XP — faltam {formatPoints(levelData.xpToNext)} para o nível {levelData.level + 1}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatsGrid({ games, wins, points, position }: { games: number; wins: number; points: number; position: number | null }) {
  const items = [
    { label: "Partidas", value: games, icon: Target, color: "text-primary" },
    { label: "Vitórias", value: wins, icon: Trophy, color: "text-warning" },
    { label: "Pontos", value: formatPoints(points), icon: Sparkles, color: "text-primary-glow" },
    { label: "Posição", value: position ? ordinal(position) : "—", icon: TrendingUp, color: "text-tournament" },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((s) => (
        <Card key={s.label} className="fpc-card fpc-hover-gold">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <s.icon className={`size-5 ${s.color}`} />
            </div>
            <p className="mt-2 text-2xl font-display">{s.value}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MonthlyRankingCard({ ranking, myIndex, year, month }: any) {
  const top5 = ranking.slice(0, 5);
  const showMeRow = myIndex >= 5;
  const meRow = showMeRow ? ranking[myIndex] : null;

  return (
    <Card className="fpc-card overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="font-display fpc-text-gold flex items-center gap-2">
            <Flame className="size-5 text-tournament" /> Ranking do Mês
          </CardTitle>
          <p className="text-xs text-muted-foreground">{MONTHS_PT[month - 1]} de {year}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => toast.success("Relatório do mês gerado (mock)")}>
            <FileText className="size-4 mr-1" />Relatório
          </Button>
          <ExpandRankingSheet ranking={ranking} year={year} month={month} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {top5.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma partida finalizada neste mês ainda.</p>}
        {top5.map((row: any, idx: number) => (
          <RankRow key={row.playerId} idx={idx + 1} row={row} highlight={row.playerId === CURRENT_USER_ID} />
        ))}
        {showMeRow && meRow && (
          <>
            <div className="fpc-divider my-2" />
            <RankRow idx={myIndex + 1} row={meRow} highlight you />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function RankRow({ idx, row, highlight, you }: { idx: number; row: any; highlight?: boolean; you?: boolean }) {
  const player = playerById(row.playerId);
  if (!player) return null;
  const medal = idx === 1 ? "text-warning" : idx === 2 ? "text-muted-foreground" : idx === 3 ? "text-tournament" : "text-foreground";
  return (
    <div className={`flex items-center gap-3 rounded-xl px-3 py-2 ${highlight ? "bg-primary/10 border border-primary/30" : "hover:bg-secondary/40"} transition`}>
      <span className={`font-display text-lg w-8 text-center ${medal}`}>{idx}º</span>
      <PlayerAvatar avatarId={player.avatarId} name={player.nickname} size={36} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm break-words line-clamp-2">{player.nickname} {you && <span className="text-primary text-xs">— Você</span>}</p>
        <p className="text-xs text-muted-foreground">{row.games} partidas · {row.wins} vitórias</p>
      </div>
      <div className="text-right">
        <p className="font-display text-base text-primary">{formatPoints(row.points)}</p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">pontos</p>
      </div>
    </div>
  );
}

function ExpandRankingSheet({ ranking, year, month }: any) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="sm" className="bg-gradient-gold text-primary-foreground hover:opacity-90">
          Expandir <ChevronRight className="size-4 ml-1" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[90%] sm:max-w-md bg-card border-border overflow-y-auto">
        <SheetHeader><SheetTitle className="font-display fpc-text-gold">Ranking — {MONTHS_PT[month - 1]} {year}</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-2">
          {ranking.map((row: any, i: number) => <RankRow key={row.playerId} idx={i + 1} row={row} highlight={row.playerId === CURRENT_USER_ID} />)}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SeasonTopCard({ ranking, year }: any) {
  return (
    <Card className="fpc-card">
      <CardHeader>
        <CardTitle className="font-display fpc-text-gold flex items-center gap-2"><Trophy className="size-5" />Top 5 — Temporada {year}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {ranking.slice(0, 5).map((row: any, i: number) => <RankRow key={row.playerId} idx={i + 1} row={row} highlight={row.playerId === CURRENT_USER_ID} />)}
        <Link to="/ranking" className="block text-center text-xs text-primary hover:underline mt-3">Ver ranking completo →</Link>
      </CardContent>
    </Card>
  );
}

function RecentGamesCard({ games }: { games: any[] }) {
  return (
    <Card className="fpc-card">
      <CardHeader><CardTitle className="font-display fpc-text-gold flex items-center gap-2"><Sparkles className="size-5" />Partidas Recentes</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {games.map((g) => {
          const winner = g.participants.find((p: any) => p.position === 1);
          const winnerPlayer = winner ? playerById(winner.playerId) : null;
          return (
            <Link to="/partidas" key={g.id} className="block fpc-card fpc-hover-gold p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm break-words line-clamp-2">{g.name}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(g.date)} · {g.total_players} jogadores</p>
                </div>
                {winnerPlayer && (
                  <div className="flex items-center gap-2 shrink-0">
                    <PlayerAvatar avatarId={winnerPlayer.avatarId} name={winnerPlayer.nickname} size={28} />
                    <span className="text-xs text-primary">{winnerPlayer.nickname}</span>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

function AchievementsCard() {
  const earned = USER_ACHIEVEMENTS.length;
  return (
    <Card className="fpc-card">
      <CardHeader>
        <CardTitle className="font-display fpc-text-gold flex items-center gap-2"><Award className="size-5" />Conquistas ({earned}/{ACHIEVEMENTS.length})</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {ACHIEVEMENTS.map((a) => {
          const ua = USER_ACHIEVEMENTS.find((u) => u.code === a.code);
          const got = !!ua;
          return (
            <div key={a.code} className={`fpc-card p-3 text-center ${got ? "" : "opacity-40 grayscale"}`} title={a.description}>
              <div className="text-2xl">{a.icon}</div>
              <p className="text-[11px] mt-1 leading-tight font-medium break-words line-clamp-2">{a.name}</p>
              {a.repeatable && got && <span className="fpc-chip mt-1 text-[10px]">×{ua!.count}</span>}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
