import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { CURRENT_USER_ID, GAMES, playerById, USER_ACHIEVEMENTS } from "@/lib/mockData";
import { ACHIEVEMENTS, levelFromXp } from "@/lib/xpSystem";
import { formatBRL, formatDate, formatPoints } from "@/lib/format";
import { Coins, Pencil, Target, Trophy, Sparkles, Award } from "lucide-react";
import { toast } from "sonner";

export default function Perfil() {
  const me = playerById(CURRENT_USER_ID)!;
  const lvl = levelFromXp(me.xp);
  const myGames = GAMES.filter((g) => g.status === "finished" && g.participants.some((p) => p.playerId === me.id));
  const wins = myGames.filter((g) => g.participants.find((p) => p.playerId === me.id)?.position === 1).length;
  const totalPoints = myGames.reduce((s, g) => s + (g.participants.find((p) => p.playerId === me.id)?.points ?? 0), 0);
  const totalKO = myGames.reduce((s, g) => s + (g.participants.find((p) => p.playerId === me.id)?.koPoints ?? 0), 0);

  return (
    <div className="space-y-6">
      <Card className="fpc-card">
        <CardContent className="p-6 flex flex-col sm:flex-row gap-4 sm:items-center">
          <PlayerAvatar avatarId={me.avatarId} name={me.nickname} size={96} />
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-3xl fpc-text-gold break-words">{me.nickname}</h1>
            <p className="text-muted-foreground break-words">{me.full_name}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="fpc-chip">Nível {lvl.level}</span>
              <span className="fpc-chip">{formatPoints(me.xp)} XP</span>
            </div>
            <div className="mt-3">
              <Progress value={lvl.progress * 100} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">{formatPoints(lvl.xpInLevel)} / 1000 XP</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => toast.info("Editar perfil (mock)")}><Pencil className="size-4 mr-1" />Editar</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Target} label="Partidas" value={myGames.length} />
        <StatCard icon={Trophy} label="Vitórias" value={wins} />
        <StatCard icon={Sparkles} label="Pontos" value={formatPoints(totalPoints)} />
        <StatCard icon={Coins} label="Lucro Total" value={formatBRL(me.lifetime_winnings)} />
      </div>

      <Card className="fpc-card">
        <CardHeader><CardTitle className="font-display fpc-text-gold flex items-center gap-2"><Award className="size-5" />Conquistas</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {ACHIEVEMENTS.map((a) => {
            const ua = USER_ACHIEVEMENTS.find((u) => u.code === a.code);
            const got = !!ua;
            return (
              <div key={a.code} className={`fpc-card p-3 ${got ? "" : "opacity-40 grayscale"}`}>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{a.icon}</span>
                  <div className="min-w-0">
                    <p className="font-medium text-sm break-words">{a.name}{a.repeatable && got && <span className="text-primary text-xs ml-1">×{ua!.count}</span>}</p>
                    <p className="text-[11px] text-muted-foreground break-words line-clamp-2">{a.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="fpc-card">
        <CardHeader><CardTitle className="font-display fpc-text-gold">Histórico de Partidas</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {myGames.map((g) => {
            const my = g.participants.find((p) => p.playerId === me.id)!;
            return (
              <div key={g.id} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-secondary/40">
                <div className="min-w-0">
                  <p className="font-medium text-sm break-words line-clamp-2">{g.name}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(g.date)} · {g.total_players} jogadores</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display text-primary">{my.position}º · {formatPoints(my.points)} pts</p>
                  <p className="text-xs text-muted-foreground">+{my.xp} XP · {my.koPoints} KOs</p>
                </div>
              </div>
            );
          })}
          {myGames.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Sem partidas registradas ainda.</p>}
          <div className="text-xs text-muted-foreground text-center mt-2">Total de KOs: {totalKO}</div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: any) {
  return (
    <Card className="fpc-card fpc-hover-gold">
      <CardContent className="p-4">
        <Icon className="size-5 text-primary" />
        <p className="mt-2 text-2xl font-display">{value}</p>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      </CardContent>
    </Card>
  );
}
