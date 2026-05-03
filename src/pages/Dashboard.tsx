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

export default function Dashboard() {
  const { user, profile, loading } = useAuth();
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  const { data: monthlyRanking = [], isLoading: lr1 } = useRanking({ year, month });
  const { data: seasonRanking = [], isLoading: lr2 } = useRanking({ year });
  const { data: games = [] } = useGames();
  const { data: stats } = usePlayerStats(user?.id, year);
  const { data: lifetimeStats } = usePlayerStats(user?.id);
  const { data: champions = [] } = useSeasonChampions();
  const { data: monthly = [] } = useAllMonthlyRankings();

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="size-8 text-primary animate-spin" /></div>;
  if (!profile) return <Navigate to="/complete-profile" replace />;

  const myMonthIndex = monthlyRanking.findIndex((r) => !r.isTemp && r.id === user?.id);
  const mySeasonIndex = seasonRanking.findIndex((r) => !r.isTemp && r.id === user?.id);
  const computedXp = useMemo(() => {
    if (!user || !lifetimeStats) return profile.xp ?? 0;
    const achievements = computeAchievements({
      history: lifetimeStats.history,
      monthsWon: monthly.filter((m) => m.champion_user_id === user.id).length,
      asTitles: champions.filter((c) => c.as_user_id === user.id).length,
      kTitles: champions.filter((c) => c.k_user_id === user.id).length,
    });
    return lifetimeStats.xp + totalAchievementXp(achievements);
  }, [user, profile.xp, lifetimeStats, champions, monthly]);
  const lvl = levelFromXp(computedXp);
  const recentGames = games.filter((g) => g.status === "finished").slice(0, 3);

  return (
    <div className="space-y-6">
      <WelcomeCard profile={profile} levelData={lvl} mySeasonIndex={mySeasonIndex} />
      <StatsGrid
        games={stats?.games ?? 0}
        wins={stats?.wins ?? 0}
        podiums={stats?.podiums ?? 0}
        ko={stats?.ko ?? 0}
        points={stats?.points ?? 0}
        position={mySeasonIndex >= 0 ? mySeasonIndex + 1 : null}
      />
      <MonthlyRankingCard
        ranking={monthlyRanking}
        myIndex={myMonthIndex}
        year={year}
        month={month}
        loading={lr1}
        currentUserId={user?.id}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <SeasonTopCard ranking={seasonRanking} year={year} loading={lr2} currentUserId={user?.id} />
        <RecentGamesCard games={recentGames} />
      </div>
    </div>
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

function MonthlyRankingCard({ ranking, myIndex, year, month, loading, currentUserId }: any) {
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
          <Button variant="outline" size="sm" onClick={() => toast.info("Relatório em breve")}>
            <FileText className="size-4 mr-1" />Relatório
          </Button>
          <ExpandRankingSheet ranking={ranking} year={year} month={month} currentUserId={currentUserId} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
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
        <p className="font-medium text-sm break-words line-clamp-2">
          {row.nickname}
          {row.isTemp && <span className="ml-2 text-[10px] uppercase text-muted-foreground">temp</span>}
          {you && <span className="text-primary text-xs ml-1">— Você</span>}
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
