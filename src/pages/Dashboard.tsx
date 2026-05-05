import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { Trophy, Flame, Target, TrendingUp, Crown, ChevronRight, FileText, Sparkles, Loader2, Award, Swords } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { levelFromXp } from "@/lib/xpSystem";
import { formatDate, formatPoints, MONTHS_PT, ordinal } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useRanking, type RankingRow } from "@/hooks/useRanking";
import { useGames } from "@/hooks/useGames";
import { usePlayerStats } from "@/hooks/usePlayerStats";
import { computeAchievements, totalAchievementXp } from "@/lib/achievements";
import { useAllMonthlyRankings, useSeasonChampions } from "@/hooks/useFinance";
import { LevelBadge } from "@/components/RankIndicators";

export default function Dashboard() {
  const { user, profile, loading } = useAuth();
  const today = new Date();
  const year = today.getFullYear();

  const { data: seasonRanking = [], isLoading: lr2 } = useRanking({ year });
  const { data: games = [] } = useGames();
  const { data: stats } = usePlayerStats(user?.id, year);
  const { data: lifetimeStats } = usePlayerStats(user?.id);
  const { data: champions = [] } = useSeasonChampions();
  const { data: monthly = [] } = useAllMonthlyRankings();

  // Mês a exibir: o mês da última partida finalizada do ano corrente,
  // ou — se não houver — o último mês encerrado.
  const finishedGames = useMemo(
    () => games.filter((g) => g.status === "finished" && g.season_year === year),
    [games, year]
  );
  const lastGameMonth = useMemo(() => {
    if (finishedGames.length === 0) return null;
    return finishedGames.reduce((max, g) => Math.max(max, g.month), 0);
  }, [finishedGames]);
  const lastClosedMonth = useMemo(() => {
    const ms = monthly.filter((m) => m.season_year === year).map((m) => m.month);
    return ms.length ? Math.max(...ms) : null;
  }, [monthly, year]);
  const displayMonth = lastGameMonth ?? lastClosedMonth ?? today.getMonth() + 1;
  const closedRecord = useMemo(
    () => monthly.find((m) => m.season_year === year && m.month === displayMonth) ?? null,
    [monthly, year, displayMonth]
  );
  // Considera "encerrado" somente se não houve nenhuma partida em mês posterior.
  const isClosed = !!closedRecord && (lastGameMonth === null || lastGameMonth <= displayMonth);

  const { data: monthlyRanking = [], isLoading: lr1 } = useRanking({ year, month: displayMonth });

  const computedXp = useMemo(() => {
    if (!user || !lifetimeStats) return profile?.xp ?? 0;
    const achievements = computeAchievements({
      history: lifetimeStats.history,
      monthsWon: monthly.filter((m) => m.champion_user_id === user.id).length,
      asTitles: champions.filter((c) => c.as_user_id === user.id).length,
      kTitles: champions.filter((c) => c.k_user_id === user.id).length,
    });
    const xp = lifetimeStats.xp + totalAchievementXp(achievements);
    return xp || profile?.xp || 0;
  }, [user, profile?.xp, lifetimeStats, champions, monthly]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="size-8 text-primary animate-spin" /></div>;
  if (user && !profile) return <Navigate to="/complete-profile" replace />;

  const myMonthIndex = user ? monthlyRanking.findIndex((r) => !r.isTemp && r.id === user.id) : -1;
  const mySeasonIndex = user ? seasonRanking.findIndex((r) => !r.isTemp && r.id === user.id) : -1;
  const lvl = levelFromXp(computedXp);
  const recentGames = games.filter((g) => g.status === "finished").slice(0, 3);

  return (
    <div className="space-y-6">
      {profile && <WelcomeCard profile={profile} levelData={lvl} mySeasonIndex={mySeasonIndex} />}
      {profile && (
        <StatsGrid
          games={stats?.games ?? 0}
          wins={stats?.wins ?? 0}
          podiums={stats?.podiums ?? 0}
          ko={stats?.ko ?? 0}
          points={stats?.points ?? 0}
          position={mySeasonIndex >= 0 ? mySeasonIndex + 1 : null}
        />
      )}
      {!user && <GuestHero />}
      <MonthlyRankingCard
        ranking={monthlyRanking}
        myIndex={myMonthIndex}
        year={year}
        month={displayMonth}
        loading={lr1}
        currentUserId={user?.id}
        closed={isClosed}
        closedRecord={closedRecord}
        monthlyRankings={monthly}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <SeasonTopCard ranking={seasonRanking} year={year} loading={lr2} currentUserId={user?.id} />
        <RecentGamesCard games={recentGames} />
      </div>
    </div>
  );
}

function GuestHero() {
  return (
    <Card className="fpc-card relative overflow-hidden">
      <CardContent className="p-6 flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Bem-vindo</p>
          <h1 className="font-display text-2xl sm:text-3xl fpc-text-gold">Família Poker Champions</h1>
          <p className="text-sm text-muted-foreground mt-1">Entre ou cadastre-se para acessar seu perfil, conquistas e estatísticas.</p>
        </div>
        <Link to="/auth"><Button className="bg-gradient-gold text-primary-foreground">Entrar / Cadastrar</Button></Link>
      </CardContent>
    </Card>
  );
}

function WelcomeCard({ profile, levelData, mySeasonIndex }: any) {
  return (
    <Card className="fpc-card relative overflow-hidden">
      <CardContent className="p-6 flex items-center gap-4 relative">
        <PlayerAvatar avatarId={profile.avatar_url ?? "a1"} name={profile.nickname ?? ""} size={72} />
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Bem-vindo de volta</p>
          <h1 className="font-display text-2xl sm:text-3xl fpc-text-gold truncate">{profile.nickname}</h1>
          <div className="mt-2 flex items-center gap-2 text-sm flex-wrap">
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

function StatsGrid({ games, wins, podiums, ko, points, position }: { games: number; wins: number; podiums: number; ko: number; points: number; position: number | null }) {
  const items = [
    { label: "Posição", value: position ? ordinal(position) : "—", icon: TrendingUp, color: "text-tournament" },
    { label: "Pontos", value: formatPoints(points), icon: Sparkles, color: "text-primary-glow" },
    { label: "Partidas", value: games, icon: Target, color: "text-primary" },
    { label: "Vitórias", value: wins, icon: Trophy, color: "text-warning" },
    { label: "Pódios", value: podiums, icon: Award, color: "text-warning" },
    { label: "KOs", value: ko, icon: Swords, color: "text-tournament" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map((s) => (
        <Card key={s.label} className="fpc-card fpc-hover-gold">
          <CardContent className="p-4">
            <s.icon className={`size-5 ${s.color}`} />
            <p className="mt-2 text-2xl font-display">{s.value}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MonthlyRankingCard({ ranking, myIndex, year, month, loading, currentUserId, closed, closedRecord }: any) {
  const top5 = ranking.slice(0, 5);
  const showMeRow = myIndex >= 5;
  const meRow = showMeRow ? ranking[myIndex] : null;
  const winner = ranking[0] as RankingRow | undefined;

  return (
    <Card className="fpc-card overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="font-display fpc-text-gold flex items-center gap-2">
            <Flame className="size-5 text-tournament" /> Ranking do Mês
          </CardTitle>
          <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
            <span>{MONTHS_PT[month - 1]} de {year}</span>
            {closed && (
              <span className="fpc-chip text-[10px] bg-tournament/20 text-tournament border-tournament/40 pt-0 my-[5px]">
                Encerrado
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => toast.info("Relatório em breve")}>
            <FileText className="size-4 mr-1" />Relatório
          </Button>
          <ExpandRankingSheet ranking={ranking} year={year} month={month} currentUserId={currentUserId} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {closed && winner && (
          <div className="flex items-center gap-3 rounded-xl px-3 py-2 border border-warning/40 bg-warning/10">
            <Crown className="size-5 text-warning shrink-0" />
            <PlayerAvatar avatarId={winner.avatarId} name={winner.nickname} size={36} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-warning">Campeão do mês</p>
              <p className="font-display text-base break-words">{winner.nickname}</p>
            </div>
            {closedRecord?.prize_amount > 0 && (
              <p className="font-display text-primary text-sm shrink-0">
                R$ {Number(closedRecord.prize_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>
        )}
        {loading && <div className="flex justify-center py-6"><Loader2 className="size-5 text-primary animate-spin" /></div>}
        {!loading && top5.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma partida finalizada neste mês ainda.</p>}
        {top5.map((row: RankingRow, idx: number) => (
          <RankRow key={`${row.isTemp ? "t" : "u"}-${row.id}`} idx={idx + 1} row={row} highlight={!row.isTemp && row.id === currentUserId} />
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

function RankRow({ idx, row, highlight, you }: { idx: number; row: RankingRow; highlight?: boolean; you?: boolean }) {
  const medal = idx === 1 ? "text-warning" : idx === 2 ? "text-muted-foreground" : idx === 3 ? "text-tournament" : "text-foreground";
  return (
    <div className={`flex items-center gap-3 rounded-xl px-3 py-2 ${highlight ? "bg-primary/10 border border-primary/30" : "hover:bg-secondary/40"} transition`}>
      <span className={`font-display text-lg w-8 text-center ${medal}`}>{idx}º</span>
      <PlayerAvatar avatarId={row.avatarId} name={row.nickname} size={36} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm break-words line-clamp-2 flex items-center gap-2 flex-wrap">
          <span>{row.nickname}</span>
          {!row.isTemp && <LevelBadge level={row.level} />}
          {row.isTemp && <span className="text-[10px] uppercase text-muted-foreground">temp</span>}
          {you && <span className="text-primary text-xs">— Você</span>}
        </p>
        <p className="text-xs text-muted-foreground">{row.games} partidas · {row.wins} vitórias</p>
      </div>
      <div className="text-right">
        <p className="font-display text-base text-primary">{formatPoints(row.points)}</p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">pontos</p>
      </div>
    </div>
  );
}

function ExpandRankingSheet({ ranking, year, month, currentUserId }: any) {
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
          {ranking.map((row: RankingRow, i: number) => (
            <RankRow key={`${row.isTemp ? "t" : "u"}-${row.id}`} idx={i + 1} row={row} highlight={!row.isTemp && row.id === currentUserId} />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SeasonTopCard({ ranking, year, loading, currentUserId }: any) {
  return (
    <Card className="fpc-card">
      <CardHeader>
        <CardTitle className="font-display fpc-text-gold flex items-center gap-2"><Trophy className="size-5" />Top 5 — Temporada {year}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading && <div className="flex justify-center py-6"><Loader2 className="size-5 text-primary animate-spin" /></div>}
        {!loading && ranking.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Sem dados ainda.</p>}
        {ranking.slice(0, 5).map((row: RankingRow, i: number) => (
          <RankRow key={`${row.isTemp ? "t" : "u"}-${row.id}`} idx={i + 1} row={row} highlight={!row.isTemp && row.id === currentUserId} />
        ))}
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
        {games.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Sem partidas finalizadas.</p>}
        {games.map((g) => (
          <Link to="/partidas" key={g.id} className="block fpc-card fpc-hover-gold p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-sm break-words line-clamp-2">{g.name}</p>
                <p className="text-xs text-muted-foreground">{formatDate(g.date)}</p>
              </div>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
