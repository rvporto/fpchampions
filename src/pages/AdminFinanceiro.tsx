import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EXPENSES, FINANCE_BY_MONTH, GAMES, playerById, getMonthlyRanking } from "@/lib/mockData";
import { formatBRL, formatDate, MONTHS_PT } from "@/lib/format";
import { Wallet, TrendingDown, Plus, Calendar, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { PlayerAvatar } from "@/components/PlayerAvatar";

export default function AdminFinanceiro() {
  const year = new Date().getFullYear();
  const [expenses, setExpenses] = useState(EXPENSES);

  const totals = useMemo(() => {
    const rakeAs = FINANCE_BY_MONTH.reduce((s, m) => s + m.rakeAs, 0);
    const rakeMonth = FINANCE_BY_MONTH.reduce((s, m) => s + m.rakeMonth, 0);
    const prize = FINANCE_BY_MONTH.reduce((s, m) => s + m.prize, 0);
    const expSum = expenses.reduce((s, e) => s + e.amount, 0);
    return { rakeAs, rakeMonth, prize, expSum, asBalance: rakeAs - expSum };
  }, [expenses]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl fpc-text-gold flex items-center gap-2"><Wallet className="size-7" />Financeiro</h1>
        <p className="text-sm text-muted-foreground">Acompanhe rakes (Ás, Mês), premiações distribuídas e despesas operacionais.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Ás (ano)" value={formatBRL(totals.rakeAs)} accent />
        <KpiCard label="Total Mês (ano)" value={formatBRL(totals.rakeMonth)} />
        <KpiCard label="Premiação Distribuída" value={formatBRL(totals.prize)} />
        <KpiCard label="Saldo do Ás" value={formatBRL(totals.asBalance)} highlight />
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
                <th className="text-right py-2 px-2">Vencedor do Mês</th>
                <th className="text-right py-2 px-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {FINANCE_BY_MONTH.map((m) => {
                const rk = getMonthlyRanking(year, m.month);
                const winner = rk[0] ? playerById(rk[0].playerId) : null;
                const empty = m.rakeAs + m.rakeMonth + m.prize === 0;
                return (
                  <tr key={m.month} className={`border-b border-border/40 ${empty ? "opacity-40" : ""}`}>
                    <td className="py-2 px-2 font-medium">{MONTHS_PT[m.month - 1]}</td>
                    <td className="text-right px-2">{formatBRL(m.rakeAs)}</td>
                    <td className="text-right px-2">{formatBRL(m.rakeMonth)}</td>
                    <td className="text-right px-2">{formatBRL(m.prize)}</td>
                    <td className="text-right px-2">
                      {winner ? (
                        <div className="flex items-center justify-end gap-2">
                          <PlayerAvatar avatarId={winner.avatarId} name={winner.nickname} size={24} />
                          <span className="text-xs">{winner.nickname}</span>
                        </div>
                      ) : "—"}
                    </td>
                    <td className="text-right px-2">
                      {!empty && (
                        <Button size="sm" variant="outline" onClick={() => toast.success(`Mês ${MONTHS_PT[m.month - 1]} encerrado (mock). Vencedor recebeu ${formatBRL(m.rakeMonth)}.`)}>
                          <CheckCircle2 className="size-3.5 mr-1" />Encerrar
                        </Button>
                      )}
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
          <ExpenseDialog onCreate={(e) => setExpenses([{ ...e, id: `e-${Date.now()}` }, ...expenses])} />
        </CardHeader>
        <CardContent className="space-y-2">
          {expenses.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-secondary/40">
              <div className="min-w-0">
                <p className="font-medium text-sm break-words line-clamp-2">{e.description}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="size-3" />{formatDate(e.created_at)} · {e.author}</p>
              </div>
              <span className="font-display text-destructive">- {formatBRL(e.amount)}</span>
            </div>
          ))}
          {expenses.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma despesa lançada.</p>}
        </CardContent>
      </Card>

      <Card className="fpc-card">
        <CardHeader><CardTitle className="font-display fpc-text-gold">Encerrar Temporada</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Ao encerrar a temporada, o vencedor do ranking sazonal vira <strong className="fpc-text-gold">K do Poker</strong> automaticamente. O vencedor do <strong className="fpc-text-gold">Ás do Poker</strong> deve ser indicado pelo admin.</p>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => toast.info("Indicar vencedor do Ás (mock)")}>Indicar Vencedor do Ás</Button>
            <Button className="bg-gradient-gold text-primary-foreground" onClick={() => toast.success("Temporada encerrada (mock).")}>Encerrar Temporada {year}</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="fpc-card">
        <CardHeader><CardTitle className="font-display fpc-text-gold">Partidas — Detalhamento de Rakes</CardTitle></CardHeader>
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
              {GAMES.filter((g) => g.status === "finished").map((g) => (
                <tr key={g.id} className="border-b border-border/40">
                  <td className="py-2 px-2 break-words">{g.name}</td>
                  <td className="text-right px-2">{formatBRL(g.total_pot)}</td>
                  <td className="text-right px-2">{formatBRL(g.rake_as)}</td>
                  <td className="text-right px-2">{formatBRL(g.rake_month)}</td>
                  <td className="text-right px-2">{formatBRL(g.croupier_fee)}</td>
                  <td className="text-right px-2 text-primary">{formatBRL(g.prize_pool)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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

function ExpenseDialog({ onCreate }: { onCreate: (e: { description: string; amount: number; created_at: string; author: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
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
          <Button
            className="bg-gradient-gold text-primary-foreground"
            onClick={() => {
              const a = parseFloat(amount);
              if (!desc || !a || a <= 0) { toast.error("Preencha descrição e valor."); return; }
              onCreate({ description: desc, amount: a, created_at: new Date().toISOString(), author: "Admin" });
              setOpen(false); setDesc(""); setAmount("");
              toast.success("Despesa lançada e debitada do Ás.");
            }}
          >Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
