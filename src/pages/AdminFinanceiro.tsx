import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBRL, formatDate, MONTHS_PT } from "@/lib/format";
import { Wallet, TrendingDown, Plus, Calendar, CheckCircle2, Loader2, Crown } from "lucide-react";
import { toast } from "sonner";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useGames } from "@/hooks/useGames";
import { useExpenses, useCreateExpense, useMonthlyRankings, useSeasonChampions, useCloseMonth, useCloseSeason, useIndicateAs } from "@/hooks/useFinance";
import { useRanking } from "@/hooks/useRanking";
import { useProfiles, useTempPlayers } from "@/hooks/useGames";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminFinanceiro() {
  const year = new Date().getFullYear();
  const { profile } = useAuth();
  const { data: games = [], isLoading: gLoading } = useGames();
  const { data: expenses = [], isLoading: eLoading } = useExpenses();
  const { data: monthlyClosed = [] } = useMonthlyRankings(year);
  const { data: champions = [] } = useSeasonChampions();
  const { data: profiles = [] } = useProfiles();
  const { data: tempPlayers = [] } = useTempPlayers();

  const finishedYear = games.filter((g) => g.status === "finished" && g.season_year === year);

  // anos disponíveis para o filtro de partidas
  const years = useMemo(() => {
    const ys = new Set(games.filter((g) => g.status === "finished").map((g) => g.season_year));
    return [...ys].sort((a, b) => b - a);
  }, [games]);

  const [filterYear, setFilterYear] = useState<number>(year);
  const [visible, setVisible] = useState(10);

  const finishedFiltered = useMemo(() =>
    games
      .filter((g) => g.status === "finished" && g.season_year === filterYear)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [games, filterYear]
  );
  const finishedShown = finishedFiltered.slice(0, visible);

  const byMonth = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const list = finishedYear.filter((g) => g.month === m);
      const rakeAs = list.reduce((s, g) => s + Number(g.rake_as || 0), 0);
      const rakeMonth = list.reduce((s, g) => s + Number(g.rake_month || 0), 0);
      const prize = list.reduce((s, g) => s + Number(g.prize_pool || 0), 0);
      const closed = monthlyClosed.find((c) => c.month === m);
      return { month: m, rakeAs, rakeMonth, prize, closed };
    });
  }, [finishedYear, monthlyClosed]);

  const totals = useMemo(() => {
    const rakeAs = byMonth.reduce((s, m) => s + m.rakeAs, 0);
    const rakeMonth = byMonth.reduce((s, m) => s + m.rakeMonth, 0);
    const prize = byMonth.reduce((s, m) => s + m.prize, 0);
    const expSum = expenses.reduce((s, e) => s + Number(e.amount), 0);
    return { rakeAs, rakeMonth, prize, expSum, asBalance: rakeAs - expSum };
  }, [byMonth, expenses]);

  const yearChampion = champions.find((c) => c.year === year);

  const currentMonth = new Date().getMonth() + 1;
  const currentMonthData = byMonth.find((m) => m.month === currentMonth);
  const rakeAsMonth = currentMonthData?.rakeAs ?? 0;
  const rakeMonthMonth = currentMonthData?.rakeMonth ?? 0;
  const monthLabel = MONTHS_PT[currentMonth - 1];

  if (gLoading || eLoading) return <div className="flex justify-center py-16"><Loader2 className="size-8 text-primary animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl fpc-text-gold flex items-center gap-2"><Wallet className="size-7" />Financeiro</h1>
        <p className="text-sm text-muted-foreground">Rakes (Ás, Mês), premiações e despesas operacionais.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label={`Rake Ás (${monthLabel})`} value={formatBRL(rakeAsMonth)} accent />
        <KpiCard label={`Rake (${monthLabel})`} value={formatBRL(rakeMonthMonth)} />
        <KpiCard label="Total Ás (ano)" value={formatBRL(totals.rakeAs)} accent />
        <KpiCard label={`Total Mês (${year})`} value={formatBRL(totals.rakeMonth)} />
        <KpiCard label="Saldo do Ás" value={formatBRL(totals.asBalance)} highlight />
        <KpiCard label="Premiação Distribuída" value={formatBRL(totals.prize)} />
      </div>

      <Card className="fpc-card">
        <CardHeader><CardTitle className="font-display fpc-text-gold">Por Mês — {year}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left py-2 px-2">Mês</th>
                <th className="text-right py-2 px-2">Rake Ás</th>
                <th className="text-right py-2 px-2">Rake Mês</th>
                <th className="text-right py-2 px-2">Premiação</th>
                <th className="text-right py-2 px-2">Status</th>
                <th className="text-right py-2 px-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {byMonth.map((m) => {
                const empty = m.rakeAs + m.rakeMonth + m.prize === 0;
                const champ = m.closed ? profiles.find((p) => p.id === m.closed?.champion_user_id) : null;
                const champTemp = m.closed && (m.closed as any).champion_temp_player_id
                  ? tempPlayers.find((t) => t.id === (m.closed as any).champion_temp_player_id)
                  : null;
                const champName = champ?.nickname ?? champTemp?.nickname ?? "—";
                const champAvatar = champ?.avatar_url ?? champTemp?.avatar_url ?? "a1";
                return (
                  <tr key={m.month} className={`border-b border-border/40 ${empty && !m.closed ? "opacity-40" : ""}`}>
                    <td className="py-2 px-2 font-medium">{MONTHS_PT[m.month - 1]}</td>
                    <td className="text-right px-2">{formatBRL(m.rakeAs)}</td>
                    <td className="text-right px-2">{formatBRL(m.rakeMonth)}</td>
                    <td className="text-right px-2">{formatBRL(m.prize)}</td>
                    <td className="text-right px-2">
                      {m.closed ? (
                        <div className="flex items-center justify-end gap-2">
                          {(champ || champTemp) && <PlayerAvatar avatarId={champAvatar} name={champName} size={20} />}
                          <span className="text-xs">{champName}{champTemp && !champ ? " (temp)" : ""} · {formatBRL(Number(m.closed.prize_amount))}</span>
                        </div>
                      ) : empty ? "—" : <span className="text-xs text-muted-foreground">Aberto</span>}
                    </td>
                    <td className="text-right px-2">
                      {!m.closed && !empty && <CloseMonthButton year={year} month={m.month} prize={m.rakeMonth} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="fpc-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="font-display fpc-text-gold flex items-center gap-2"><TrendingDown className="size-5" />Despesas (debitam do Ás)</CardTitle>
          <ExpenseDialog authorName={profile?.nickname ?? null} />
        </CardHeader>
        <CardContent className="space-y-2">
          {expenses.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-secondary/40">
              <div className="min-w-0">
                <p className="font-medium text-sm break-words line-clamp-2">{e.description}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="size-3" />{formatDate(e.created_at)} · {e.author_name ?? "—"}</p>
              </div>
              <span className="font-display text-destructive">- {formatBRL(Number(e.amount))}</span>
            </div>
          ))}
          {expenses.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma despesa lançada.</p>}
        </CardContent>
      </Card>

      <Card className="fpc-card">
        <CardHeader><CardTitle className="font-display fpc-text-gold flex items-center gap-2"><Crown className="size-5" />Títulos da Temporada {year}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">
              <strong className="fpc-text-gold">K do Poker</strong>: título dado ao 1º colocado do ranking anual ao encerrar a temporada.
            </p>
            <p className="text-muted-foreground">
              <strong className="fpc-text-gold">Ás do Poker</strong>: torneio único da temporada — o admin indica o vencedor (independente do encerramento).
            </p>
          </div>

          <div className="rounded-xl border border-border/60 p-3 space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">K do Poker</p>
            {yearChampion?.k_user_id ? (
              <p className="text-sm">Temporada encerrada · <strong className="fpc-text-gold">{profiles.find((p) => p.id === yearChampion.k_user_id)?.nickname ?? "—"}</strong></p>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">Temporada em andamento.</span>
                <CloseSeasonButton year={year} />
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border/60 p-3 space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Ás do Poker</p>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-sm">
                {yearChampion?.as_user_id
                  ? <>Indicado: <strong className="fpc-text-gold">{profiles.find((p) => p.id === yearChampion.as_user_id)?.nickname ?? "—"}</strong></>
                  : (yearChampion as any)?.as_temp_player_id
                    ? <>Indicado: <strong className="fpc-text-gold">{tempPlayers.find((t) => t.id === (yearChampion as any).as_temp_player_id)?.nickname ?? "—"} (temp)</strong></>
                    : <span className="text-muted-foreground">Ainda não indicado.</span>}
              </span>
              <IndicateAsButton year={year} currentAs={yearChampion?.as_user_id ?? null} currentAsTemp={(yearChampion as any)?.as_temp_player_id ?? null} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card de partidas com filtro e paginação */}
      <Card className="fpc-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 flex-wrap gap-2">
          <CardTitle className="font-display fpc-text-gold">Partidas — Detalhamento de Rakes</CardTitle>
          {years.length > 0 && (
            <Select
              value={String(filterYear)}
              onValueChange={(v) => { setFilterYear(Number(v)); setVisible(10); }}
            >
              <SelectTrigger className="w-32 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left py-2 px-2">Partida</th>
                <th className="text-right py-2 px-2">Pote</th>
                <th className="text-right py-2 px-2">Rake Ás</th>
                <th className="text-right py-2 px-2">Rake Mês</th>
                <th className="text-right py-2 px-2">Croupier</th>
                <th className="text-right py-2 px-2">Premiação</th>
              </tr>
            </thead>
            <tbody>
              {finishedShown.map((g) => (
                <tr key={g.id} className="border-b border-border/40">
                  <td className="py-2 px-2 break-words">{g.name}</td>
                  <td className="text-right px-2">{formatBRL(Number(g.total_pot))}</td>
                  <td className="text-right px-2">{formatBRL(Number(g.rake_as))}</td>
                  <td className="text-right px-2">{formatBRL(Number(g.rake_month))}</td>
                  <td className="text-right px-2">{formatBRL(Number(g.croupier_fee))}</td>
                  <td className="text-right px-2 text-primary">{formatBRL(Number(g.prize_pool))}</td>
                </tr>
              ))}
              {finishedFiltered.length === 0 && (
                <tr><td colSpan={6} className="text-center text-muted-foreground py-6 text-sm">Nenhuma partida finalizada em {filterYear}.</td></tr>
              )}
            </tbody>
          </table>

          {finishedFiltered.length > visible && (
            <div className="pt-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setVisible((v) => v + 10)}
              >
                Mostrar mais ({finishedFiltered.length - visible} restantes)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value, accent, highlight }: any) {
  return (
    <Card className={`fpc-card ${highlight ? "border-primary/60 shadow-gold" : ""}`}>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`mt-1 font-display text-xl ${accent || highlight ? "fpc-text-gold" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function ExpenseDialog({ authorName }: { authorName: string | null }) {
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const create = useCreateExpense();

  const submit = async () => {
    const a = parseFloat(amount);
    if (!desc.trim() || !a || a <= 0) return toast.error("Preencha descrição e valor.");
    try {
      await create.mutateAsync({ description: desc, amount: a, author_name: authorName ?? "Admin" });
      toast.success("Despesa lançada e debitada do Ás.");
      setOpen(false); setDesc(""); setAmount("");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-gradient-gold text-primary-foreground"><Plus className="size-4 mr-1" />Nova Despesa</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display fpc-text-gold">Nova Despesa</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Descrição</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex.: Compra de baralhos" /></div>
          <div><Label>Valor (R$)</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button className="bg-gradient-gold text-primary-foreground" onClick={submit} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="size-4 animate-spin" /> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CloseMonthButton({ year, month, prize }: { year: number; month: number; prize: number }) {
  const [open, setOpen] = useState(false);
  const { data: ranking = [] } = useRanking({ year, month });
  const leader = ranking[0];
  const close = useCloseMonth();

  const submit = async () => {
    if (!leader) return toast.error("Sem líder no mês.");
    try {
      await close.mutateAsync({
        year,
        month,
        champion_user_id: leader.isTemp ? null : leader.id,
        champion_temp_player_id: leader.isTemp ? leader.id : null,
        prize_amount: prize,
      });
      toast.success(`${MONTHS_PT[month - 1]} encerrado.`);
      setOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><CheckCircle2 className="size-3.5 mr-1" />Encerrar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display fpc-text-gold">Encerrar {MONTHS_PT[month - 1]} / {year}</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          {leader ? (
            <>
              <p>Vencedor automático: <strong className="fpc-text-gold">{leader.nickname}</strong>{leader.isTemp ? " (temporário)" : ""} — {leader.points} pts.</p>
              <p>Receberá <strong className="fpc-text-gold">{formatBRL(prize)}</strong> (Rake Mês acumulado).</p>
              {leader.isTemp && (
                <p className="text-xs text-muted-foreground">
                  Como o líder é jogador temporário, prêmio, vitória do mês, XP e conquistas ficarão registrados e serão herdados automaticamente quando o jogador for vinculado a uma conta.
                </p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">Sem participações neste mês.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button className="bg-gradient-gold text-primary-foreground" onClick={submit} disabled={close.isPending || !leader}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CloseSeasonButton({ year }: { year: number }) {
  const [open, setOpen] = useState(false);
  const { data: ranking = [] } = useRanking({ year });
  const top = ranking.filter((r) => !r.isTemp)[0];
  const close = useCloseSeason();

  const submit = async () => {
    if (!top) return toast.error("Sem candidatos.");
    try {
      await close.mutateAsync({ year, k_user_id: top.id });
      toast.success(`Temporada ${year} encerrada. K do Poker: ${top.nickname}.`);
      setOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-gold text-primary-foreground">Encerrar Temporada {year}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display fpc-text-gold">Encerrar Temporada {year}</DialogTitle></DialogHeader>
        <div className="text-sm space-y-2">
          {top ? <p>K do Poker: <strong className="fpc-text-gold">{top.nickname}</strong> ({top.points} pts).</p> : <p className="text-muted-foreground">Sem dados de ranking.</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button className="bg-gradient-gold text-primary-foreground" onClick={submit} disabled={close.isPending}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IndicateAsButton({ year, currentAs, currentAsTemp }: { year: number; currentAs: string | null; currentAsTemp?: string | null }) {
  const [open, setOpen] = useState(false);
  const { data: profiles = [] } = useProfiles();
  const { data: tempPlayers = [] } = useTempPlayers();
  const initial = currentAs ? `u:${currentAs}` : currentAsTemp ? `t:${currentAsTemp}` : "";
  const [pick, setPick] = useState<string>(initial);
  const ind = useIndicateAs();

  const submit = async () => {
    if (!pick) return toast.error("Escolha o jogador.");
    const [kind, id] = pick.split(":");
    try {
      await ind.mutateAsync({
        year,
        as_user_id: kind === "u" ? id : null,
        as_temp_player_id: kind === "t" ? id : null,
      });
      toast.success("Ás do Poker indicado.");
      setOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Indicar Ás do Poker</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display fpc-text-gold">Ás do Poker {year}</DialogTitle></DialogHeader>
        <div>
          <Label>Jogador</Label>
          <Select value={pick} onValueChange={setPick}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {profiles.map((p) => <SelectItem key={`u:${p.id}`} value={`u:${p.id}`}>{p.nickname}</SelectItem>)}
              {tempPlayers.map((t) => <SelectItem key={`t:${t.id}`} value={`t:${t.id}`}>{t.nickname} (temp)</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button className="bg-gradient-gold text-primary-foreground" onClick={submit} disabled={ind.isPending}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
