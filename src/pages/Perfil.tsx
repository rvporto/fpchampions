import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { AvatarPicker } from "@/components/AvatarPicker";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { InvalidGenderDialog } from "@/components/InvalidGenderDialog";
import { levelFromXp } from "@/lib/xpSystem";
import { formatBRL, formatDate, formatPoints, ordinal } from "@/lib/format";
import { Coins, Pencil, Target, Trophy, Sparkles, Loader2, LogOut, Award, Swords } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayerStats } from "@/hooks/usePlayerStats";
import { supabase } from "@/integrations/supabase/client";
import { computeAchievements } from "@/lib/achievements";
import { useSeasonChampions, useAllMonthlyRankings } from "@/hooks/useFinance";
import { useMemo } from "react";

export default function Perfil() {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const { data: stats, isLoading: statsLoading } = usePlayerStats(user?.id);
  const { data: champions = [] } = useSeasonChampions();
  const { data: monthly = [] } = useAllMonthlyRankings();
  const [editing, setEditing] = useState(false);

  const achievements = useMemo(() => {
    if (!user || !stats) return [];
    const monthsWon = monthly.filter((m) => m.champion_user_id === user.id).length;
    const asTitles = champions.filter((c) => c.as_user_id === user.id).length;
    const kTitles = champions.filter((c) => c.k_user_id === user.id).length;
    return computeAchievements({ history: stats.history, monthsWon, asTitles, kTitles });
  }, [user, stats, champions, monthly]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="size-8 text-primary animate-spin" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!profile) return <Navigate to="/complete-profile" replace />;

  const computedXp = (stats?.xp ?? 0) + achievements.reduce((s, a) => s + a.count * a.def.xpReward, 0);
  const displayXp = computedXp || profile.xp || 0;
  const lvl = levelFromXp(displayXp);

  return (
    <div className="space-y-6">
      <Card className="fpc-card">
        <CardContent className="p-6 flex flex-col sm:flex-row gap-4 sm:items-center">
          <PlayerAvatar avatarId={profile.avatar_url ?? "a1"} name={profile.nickname ?? ""} size={96} />
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-3xl fpc-text-gold break-words">{profile.nickname}</h1>
            <p className="text-muted-foreground break-words">{profile.full_name}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="fpc-chip">Nível {lvl.level}</span>
              <span className="fpc-chip">{formatPoints(displayXp)} XP</span>
              {profile.current_rank && <span className="fpc-chip">{ordinal(profile.current_rank)} no ranking</span>}
            </div>
            <div className="mt-3">
              <Progress value={lvl.progress * 100} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">{formatPoints(lvl.xpInLevel)} / 1000 XP — faltam {formatPoints(lvl.xpToNext)} para o nível {lvl.level + 1}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <EditProfileDialog open={editing} onOpenChange={setEditing} onSaved={refreshProfile} />
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut className="size-4 mr-1" />Sair
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard icon={Target} label="Partidas Jogadas" value={stats?.games ?? 0} />
        <StatCard icon={Trophy} label="Vitórias" value={stats?.wins ?? 0} />
        <StatCard icon={Award} label="Pódios" value={stats?.podiums ?? 0} />
        <StatCard icon={Coins} label="Entradas (BI+RB)" value={(stats?.entries ?? 0) + (stats?.rebuys ?? 0)} />
        <StatCard icon={Swords} label="KOs" value={stats?.ko ?? 0} />
      </div>

      <Card className="fpc-card">
        <CardHeader><CardTitle className="font-display fpc-text-gold">Conquistas ({achievements.filter((a) => a.unlocked).length}/{achievements.length})</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {achievements.map((a) => (
            <div key={a.def.code} className={`fpc-card p-3 rounded-xl ${a.unlocked ? "" : "opacity-40"}`}>
              <div className="flex items-center justify-between">
                <span className="text-xl">{a.def.icon}</span>
                {a.def.repeatable && a.count > 0 && <span className="fpc-chip text-[10px]">×{a.count}</span>}
              </div>
              <p className="font-medium text-sm mt-1 break-words">{a.def.name}</p>
              <p className="text-[10px] text-muted-foreground break-words line-clamp-2">{a.def.description}</p>
              <p className="text-[10px] text-primary mt-1">+{formatPoints(a.def.xpReward)} XP</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="fpc-card">
        <CardHeader><CardTitle className="font-display fpc-text-gold">Histórico de Partidas</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {statsLoading && <div className="flex justify-center py-6"><Loader2 className="size-5 text-primary animate-spin" /></div>}
          {!statsLoading && (stats?.history.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">Sem partidas registradas ainda.</p>
          )}
          {stats?.history.map((h) => (
            <div key={h.participation.id} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-secondary/40">
              <div className="min-w-0">
                <p className="font-medium text-sm break-words line-clamp-2">{h.game.name}</p>
                <p className="text-xs text-muted-foreground">{formatDate(h.game.date)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display text-primary">
                  {h.participation.position ? `${h.participation.position}º` : "—"} · {formatPoints(Number(h.participation.ranking_points || 0))} pts
                </p>
                <p className="text-xs text-muted-foreground">+{h.participation.xp_earned} XP · {h.participation.ko_points} KOs</p>
              </div>
            </div>
          ))}
          {stats && stats.history.length > 0 && (
            <div className="text-xs text-muted-foreground text-center mt-2">Total de KOs: {stats.ko}</div>
          )}
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

function EditProfileDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => Promise<void> }) {
  const { user, profile } = useAuth();
  const [nickname, setNickname] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState("a1");
  const [gender, setGender] = useState<"masculino" | "feminino">("masculino");
  const [genderWarn, setGenderWarn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && profile) {
      setNickname(profile.nickname ?? "");
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
      setAvatar(profile.avatar_url ?? "a1");
      if (profile.gender === "masculino" || profile.gender === "feminino") {
        setGender(profile.gender);
      }
    }
  }, [open, profile]);

  const save = async () => {
    if (!user) return;
    if (!nickname.trim() || !fullName.trim()) return toast.error("Apelido e nome são obrigatórios.");
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        nickname: nickname.trim(),
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        avatar_url: avatar,
        gender,
      })
      .eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    await onSaved();
    toast.success("Perfil atualizado!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Pencil className="size-4 mr-1" />Editar</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="font-display fpc-text-gold">Editar perfil</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Avatar</Label>
            <AvatarPicker value={avatar} onChange={setAvatar} userId={user?.id} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Apelido</Label><Input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={30} /></div>
            <div><Label>Nome completo</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={80} /></div>
          </div>
          <div><Label>Telefone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div>
            <Label className="mb-2 block">Gênero</Label>
            <RadioGroup value={gender} onValueChange={(v) => { if (v === "outro") { setGenderWarn(true); return; } setGender(v as any); }} className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="masculino" id="ge-m" /><Label htmlFor="ge-m" className="cursor-pointer">Masculino</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="feminino" id="ge-f" /><Label htmlFor="ge-f" className="cursor-pointer">Feminino</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="outro" id="ge-o" /><Label htmlFor="ge-o" className="cursor-pointer">Outro</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={busy} className="bg-gradient-gold text-primary-foreground">
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
      <InvalidGenderDialog open={genderWarn} onOpenChange={setGenderWarn} />
    </Dialog>
  );
}
