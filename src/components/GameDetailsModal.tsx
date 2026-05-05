import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PlayerSelector, SelectedParticipant } from "@/components/PlayerSelector";
import {
  useGame,
  useUpdateParticipation,
  useUpdateGame,
  useAddParticipations,
  useRemoveParticipation,
  useDeleteGame,
} from "@/hooks/useGames";
import { calcTournamentPoints, getFM } from "@/lib/scoring";
import { participantDisplay, gameTotals } from "@/lib/db-types";
import { formatBRL, formatDateTime } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Calendar, Coins, Loader2, Trash2, Trophy, Users, Plus, X, FileText, Spade } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { renderAndCapture } from "@/lib/reports";
import { GameReport } from "@/components/Reports";
import { recalcRankingAndXp } from "@/lib/recalc";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  gameId: string | null;
  onOpenChange: (v: boolean) => void;
}

export function GameDetailsModal({ gameId, onOpenChange }: Props) {
  const open = !!gameId;
  const { isAdmin } = useAuth();
  const { data: game, isLoading } = useGame(gameId);
  const updatePart = useUpdateParticipation();
  const updateGame = useUpdateGame();
  const addParts = useAddParticipations();
  const removePart = useRemoveParticipation();
  const deleteGame = useDeleteGame();
  const qc = useQueryClient();

  // Estado local de inputs por participante
  type Row = { id: string; entries: number; rebuys: number; position: number | null; ko_points: number; prize_won: number };
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [rakeAs, setRakeAs] = useState(0);
  const [rakeMonth, setRakeMonth] = useState(0);
  const [croupier, setCroupier] = useState(0);
  const [isAsGame, setIsAsGame] = useState(false);
  const [asPrizeAmount, setAsPrizeAmount] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [toAdd, setToAdd] = useState<SelectedParticipant[]>([]);

  // saldo atual do Ás (rakeAs total - despesas)
  const { data: asBalance = 0 } = useQuery({
    queryKey: ["as_balance_current"],
    queryFn: async () => {
      const [{ data: gms }, { data: exps }] = await Promise.all([
        supabase.from("games").select("rake_as").eq("status", "finished"),
        supabase.from("expenses").select("amount"),
      ]);
      const totalAs = (gms ?? []).reduce((s: number, g: any) => s + Number(g.rake_as || 0), 0);
      const totalExp = (exps ?? []).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      return Math.max(0, totalAs - totalExp);
    },
  });

  useEffect(() => {
    if (game) {
      const map: Record<string, Row> = {};
      for (const p of game.participations) {
        map[p.id] = {
          id: p.id,
          entries: p.entries ?? 1,
          rebuys: p.rebuys ?? 0,
          position: p.position ?? null,
          ko_points: p.ko_points ?? 0,
          prize_won: Number((p as any).prize_won ?? 0),
        };
      }
      setRows(map);
      setRakeAs(Number(game.rake_as) || 0);
      setRakeMonth(Number(game.rake_month) || 0);
      setCroupier(Number(game.croupier_fee) || 0);
      setIsAsGame(Boolean((game as any).is_as_game));
      setAsPrizeAmount(Number((game as any).as_prize_amount) || 0);
    }
  }, [game?.id]);

  const totals = useMemo(() => {
    const list = Object.values(rows);
    const { totalPlayers, totalActions } = gameTotals(list);
    const fm = getFM(totalActions);
    const totalPot = list.reduce((s, r) => {
      // pot = entries*buy_in + rebuys*rebuy_value
      return s + (r.entries * (Number(game?.buy_in) || 0)) + (r.rebuys * (Number(game?.rebuy_value) || 0));
    }, 0);
    const asExtra = isAsGame ? Number(asPrizeAmount || 0) : 0;
    const prizePool = Math.max(0, totalPot - rakeAs - rakeMonth - croupier) + asExtra;
    return { totalPlayers, totalActions, fm, totalPot, prizePool, asExtra };
  }, [rows, rakeAs, rakeMonth, croupier, isAsGame, asPrizeAmount, game?.buy_in, game?.rebuy_value]);

  const setRow = (id: string, patch: Partial<Row>) => setRows((s) => ({ ...s, [id]: { ...s[id], ...patch } }));

  const calcPoints = (r: Row) =>
    calcTournamentPoints({
      totalPlayers: totals.totalPlayers,
      position: r.position ?? 0,
      totalActions: totals.totalActions,
      koPoints: r.ko_points,
    });

  const sortedParticipations = useMemo(() => {
    if (!game) return [];
    const list = [...game.participations];
    if (game.status === "finished") {
      list.sort((a, b) => {
        const pa = rows[a.id]?.position ?? a.position ?? 999;
        const pb = rows[b.id]?.position ?? b.position ?? 999;
        return pa - pb;
      });
    }
    return list;
  }, [game, rows]);

  const saveAll = async (finalize: boolean) => {
    if (!game) return;
    try {
      const asAmountToCharge = isAsGame ? Number(asPrizeAmount || 0) : 0;
      // 1. update game (rakes, totals, status)
      await updateGame.mutateAsync({
        id: game.id,
        patch: {
          rake_as: rakeAs,
          rake_month: rakeMonth,
          croupier_fee: croupier,
          total_pot: totals.totalPot,
          prize_pool: totals.prizePool,
          is_as_game: isAsGame,
          as_prize_amount: asAmountToCharge,
          status: finalize ? "finished" : game.status === "scheduled" ? "in_progress" : game.status,
        } as any,
      });

      // 2. update participations
      for (const r of Object.values(rows)) {
        const breakdown = calcPoints(r);
        const totalInvested = r.entries * (Number(game.buy_in) || 0) + r.rebuys * (Number(game.rebuy_value) || 0);
        await updatePart.mutateAsync({
          id: r.id,
          patch: {
            entries: r.entries,
            rebuys: r.rebuys,
            position: r.position,
            ko_points: r.ko_points,
            is_winner: r.position === 1,
            ranking_points: finalize ? breakdown.total : 0,
            total_invested: totalInvested,
            prize_won: r.prize_won,
            // xp_earned será calculado pela edge function update-ranking depois
          } as any,
        });
      }
      if (finalize) {
        // débita o valor do Ás se for partida do Ás (apenas no momento de finalizar e somente uma vez)
        if (isAsGame && asAmountToCharge > 0 && !((game as any).is_as_game && Number((game as any).as_prize_amount || 0) > 0)) {
          await supabase.from("as_pool").insert({
            game_id: game.id,
            description: `Premiação Ás do Poker — ${game.name}`,
            amount: -Math.abs(asAmountToCharge),
          });
        }
        try {
          await recalcRankingAndXp();
          await qc.invalidateQueries();
        } catch (e: any) {
          console.error("recalc failed", e);
        }
      }
      toast.success(finalize ? "Partida finalizada! XP e ranking atualizados." : "Alterações salvas.");
      if (finalize) onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao salvar.");
    }
  };

  const onAddPlayers = async () => {
    if (!game || toAdd.length === 0) return setAddOpen(false);
    try {
      await addParts.mutateAsync({
        game_id: game.id,
        buy_in: Number(game.buy_in) || 0,
        participants: toAdd.map((p) => ({ user_id: p.user_id ?? null, temp_player_id: p.temp_player_id ?? null })),
      });
      toast.success("Jogadores adicionados.");
      setToAdd([]);
      setAddOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const onRemove = async (id: string) => {
    try {
      await removePart.mutateAsync(id);
      toast.success("Jogador removido.");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display fpc-text-gold flex items-center gap-2 break-words flex-wrap">
            {game?.name ?? "Carregando..."}
            {game && (
              <>
                <Badge variant={game.status === "finished" ? "default" : game.status === "in_progress" ? "secondary" : "outline"}>
                  {game.status === "finished" ? "Finalizada" : game.status === "in_progress" ? "Em andamento" : "Agendada"}
                </Badge>
                {game.status !== "finished" && isAdmin && (
                  <label className="flex items-center gap-1.5 text-xs font-normal cursor-pointer rounded-full border border-primary/40 bg-primary/10 px-2 py-1 text-primary">
                    <Checkbox checked={isAsGame} onCheckedChange={(v) => setIsAsGame(Boolean(v))} />
                    <Spade className="size-3.5" />
                    <span>Ás do Poker</span>
                  </label>
                )}
                {game.status === "finished" && (game as any).is_as_game && (
                  <Badge className="bg-primary/20 text-primary border border-primary/40 flex items-center gap-1">
                    <Spade className="size-3" /> Ás do Poker
                  </Badge>
                )}
              </>
            )}
          </DialogTitle>
          {game && game.status !== "finished" && isAdmin && isAsGame && (
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <Label className="text-xs">Saldo atual do Ás</Label>
                <div className="h-10 px-3 flex items-center text-sm border border-border rounded-md bg-secondary/40">{formatBRL(asBalance)}</div>
              </div>
              <div>
                <Label className="text-xs">Valor do Ás a acrescer (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={asPrizeAmount}
                  onChange={(e) => setAsPrizeAmount(parseFloat(e.target.value || "0"))}
                  placeholder={String(asBalance)}
                />
              </div>
            </div>
          )}
        </DialogHeader>

        {isLoading || !game ? (
          <div className="flex justify-center py-12"><Loader2 className="size-8 text-primary animate-spin" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <BigStat label="Buy-in" value={formatBRL(Number(game.buy_in))} />
              <BigStat label="Rebuy" value={formatBRL(Number(game.rebuy_value))} />
              <BigStat label="Jogadores" value={`${totals.totalPlayers}`} />
              <BigStat label="Pote total" value={formatBRL(totals.totalPot)} />
            </div>
            <p className="text-xs text-muted-foreground mt-3">{formatDateTime(game.date)} · Temporada {game.season_year}</p>

            <Tabs defaultValue="resultados" className="mt-4">
              <TabsList>
                <TabsTrigger value="resultados">Resultados</TabsTrigger>
                <TabsTrigger value="info">Info</TabsTrigger>
              </TabsList>

              <TabsContent value="resultados" className="space-y-4">
                {/* Mobile: per-player cards */}
                <div className="sm:hidden space-y-3">
                  {sortedParticipations.map((p) => {
                    const display = participantDisplay(p);
                    const r = rows[p.id] ?? { id: p.id, entries: 1, rebuys: 0, position: null, ko_points: 0, prize_won: 0 };
                    const bd = calcPoints(r);
                    return (
                      <div key={p.id} className="fpc-card rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <PlayerAvatar avatarId={display.avatarId} name={display.nickname} size={40} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium break-words">{display.nickname}</p>
                            <p className="text-xs text-muted-foreground">
                              Pos. {r.position ?? "—"} · <span className="text-primary font-medium">{r.position ? bd.total : 0} pts</span> · {formatBRL(r.prize_won)}
                            </p>
                          </div>
                          {isAdmin && (
                            <Button size="icon" variant="ghost" onClick={() => onRemove(p.id)}>
                              <X className="size-4" />
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <FieldNum label="Pos." value={r.position ?? ""} disabled={!isAdmin}
                            onChange={(v) => setRow(p.id, { position: v === "" ? null : parseInt(v) })} placeholder="—" />
                          <FieldNum label="Entradas" value={r.entries} disabled={!isAdmin}
                            onChange={(v) => setRow(p.id, { entries: parseInt(v || "0") })} />
                          <FieldNum label="Rebuys" value={r.rebuys} disabled={!isAdmin}
                            onChange={(v) => setRow(p.id, { rebuys: parseInt(v || "0") })} />
                          <FieldNum label="KOs" value={r.ko_points} disabled={!isAdmin}
                            onChange={(v) => setRow(p.id, { ko_points: parseInt(v || "0") })} />
                          <div className="col-span-2">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Prêmio (R$)</Label>
                            <Input type="number" step="0.01" disabled={!isAdmin} value={r.prize_won}
                              onChange={(e) => setRow(p.id, { prize_won: parseFloat(e.target.value || "0") })} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {game.participations.length === 0 && (
                    <p className="text-center text-muted-foreground py-6 text-sm">Sem jogadores.</p>
                  )}
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="text-xs uppercase text-muted-foreground bg-secondary/30">
                      <tr>
                        <th className="text-left py-2 px-2">Jogador</th>
                        <th className="text-center px-2">Pos</th>
                        <th className="text-center px-2">Entries</th>
                        <th className="text-center px-2">Rebuys</th>
                        <th className="text-center px-2">KO</th>
                        <th className="text-center px-2">Prêmio (R$)</th>
                        <th className="text-right px-2">Pontos</th>
                        {isAdmin && <th className="text-right px-2"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedParticipations.map((p) => {
                        const display = participantDisplay(p);
                        const r = rows[p.id] ?? { id: p.id, entries: 1, rebuys: 0, position: null, ko_points: 0, prize_won: 0 };
                        const bd = calcPoints(r);
                        return (
                          <tr key={p.id} className="border-t border-border/40">
                            <td className="py-2 px-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <PlayerAvatar avatarId={display.avatarId} name={display.nickname} size={28} />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium break-words">{display.nickname}</p>
                                  {display.isTemp && <Badge variant="outline" className="text-[10px]">temp</Badge>}
                                </div>
                              </div>
                            </td>
                            <td className="text-center px-2">
                              <Input
                                type="number"
                                disabled={!isAdmin}
                                value={r.position ?? ""}
                                onChange={(e) => setRow(p.id, { position: e.target.value === "" ? null : parseInt(e.target.value) })}
                                className="w-16 h-8 text-center"
                              />
                            </td>
                            <td className="text-center px-2">
                              <Input
                                type="number"
                                disabled={!isAdmin}
                                value={r.entries}
                                onChange={(e) => setRow(p.id, { entries: parseInt(e.target.value || "0") })}
                                className="w-16 h-8 text-center"
                              />
                            </td>
                            <td className="text-center px-2">
                              <Input
                                type="number"
                                disabled={!isAdmin}
                                value={r.rebuys}
                                onChange={(e) => setRow(p.id, { rebuys: parseInt(e.target.value || "0") })}
                                className="w-16 h-8 text-center"
                              />
                            </td>
                            <td className="text-center px-2">
                              <Input
                                type="number"
                                disabled={!isAdmin}
                                value={r.ko_points}
                                onChange={(e) => setRow(p.id, { ko_points: parseInt(e.target.value || "0") })}
                                className="w-16 h-8 text-center"
                              />
                            </td>
                            <td className="text-center px-2">
                              <Input
                                type="number"
                                step="0.01"
                                disabled={!isAdmin}
                                value={r.prize_won}
                                onChange={(e) => setRow(p.id, { prize_won: parseFloat(e.target.value || "0") })}
                                className="w-24 h-8 text-center"
                              />
                            </td>
                            <td className="text-right px-2 font-display fpc-text-gold">
                              {r.position ? bd.total : "—"}
                            </td>
                            {isAdmin && (
                              <td className="text-right px-2">
                                <Button size="icon" variant="ghost" onClick={() => onRemove(p.id)}>
                                  <X className="size-4" />
                                </Button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                      {game.participations.length === 0 && (
                        <tr><td colSpan={8} className="text-center text-muted-foreground py-6 text-sm">Sem jogadores.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {isAdmin && (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 fpc-card p-3 rounded-xl">
                      <div>
                        <Label className="text-xs">Rake Ás (R$)</Label>
                        <Input type="number" value={rakeAs} onChange={(e) => setRakeAs(parseFloat(e.target.value || "0"))} />
                      </div>
                      <div>
                        <Label className="text-xs">Rake Mês (R$)</Label>
                        <Input type="number" value={rakeMonth} onChange={(e) => setRakeMonth(parseFloat(e.target.value || "0"))} />
                      </div>
                      <div>
                        <Label className="text-xs">Croupier (R$)</Label>
                        <Input type="number" value={croupier} onChange={(e) => setCroupier(parseFloat(e.target.value || "0"))} />
                      </div>
                      <div>
                        <Label className="text-xs">Premiação</Label>
                        <div className="h-10 px-3 flex items-center font-display fpc-text-gold border border-border rounded-md bg-secondary/40">
                          {formatBRL(totals.prizePool)}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-between">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setAddOpen((v) => !v)}>
                          <Plus className="size-4 mr-1" /> Adicionar Jogador
                        </Button>
                        <Button variant="outline" size="sm" onClick={async () => {
                          try { await renderAndCapture(<GameReport game={game} />, `${game.name.replace(/\s+/g, "_")}.jpg`); toast.success("Relatório baixado."); }
                          catch (e: any) { toast.error(e.message); }
                        }}>
                          <FileText className="size-4 mr-1" /> Relatório
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (!confirm("Excluir partida? Esta ação remove todos os participantes.")) return;
                            try { await deleteGame.mutateAsync(game.id); toast.success("Partida excluída."); onOpenChange(false); }
                            catch (e: any) { toast.error(e.message); }
                          }}
                        >
                          <Trash2 className="size-4 mr-1" /> Excluir
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => saveAll(false)} disabled={updateGame.isPending || updatePart.isPending}>
                          Salvar
                        </Button>
                        <Button
                          className="bg-gradient-gold text-primary-foreground"
                          onClick={() => saveAll(true)}
                          disabled={updateGame.isPending || updatePart.isPending}
                        >
                          Finalizar Partida
                        </Button>
                      </div>
                    </div>

                    {addOpen && (
                      <div className="fpc-card p-3 rounded-xl space-y-2">
                        <PlayerSelector value={toAdd} onChange={setToAdd} />
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => { setAddOpen(false); setToAdd([]); }}>Cancelar</Button>
                          <Button size="sm" className="bg-gradient-gold text-primary-foreground" onClick={onAddPlayers}>Adicionar</Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="info" className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Buy-in:</span> {formatBRL(Number(game.buy_in))}</p>
                <p><span className="text-muted-foreground">Rebuy:</span> {formatBRL(Number(game.rebuy_value))}</p>
                <p><span className="text-muted-foreground">Temporada/Mês:</span> {game.season_year} / {game.month}</p>
                {game.description && <p className="text-muted-foreground italic">"{game.description}"</p>}
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ icon, label, value }: any) {
  return (
    <div className="fpc-card rounded-xl p-2 px-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">{icon}{label}</p>
      <p className="font-display text-sm">{value}</p>
    </div>
  );
}

function BigStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="fpc-card rounded-2xl p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-lg fpc-text-gold mt-1">{value}</p>
    </div>
  );
}

function FieldNum({ label, value, onChange, disabled, placeholder }: { label: string; value: any; onChange: (v: string) => void; disabled?: boolean; placeholder?: string }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input type="number" disabled={disabled} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
