import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Link2, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useProfiles } from "@/hooks/useGames";
import { useCreateLinkRequest, useMergeTempIntoUser } from "@/hooks/useLinkRequests";

interface Props {
  tempPlayerId: string;
  tempPlayerName: string;
}

export function LinkTempPlayerDialog({ tempPlayerId, tempPlayerName }: Props) {
  const { user, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const { data: profiles = [], isLoading } = useProfiles();
  const createReq = useCreateLinkRequest();
  const merge = useMergeTempIntoUser();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(
      (p) =>
        (p.nickname ?? "").toLowerCase().includes(q) ||
        (p.full_name ?? "").toLowerCase().includes(q)
    );
  }, [profiles, search]);

  const onRequestLink = async () => {
    if (!user) return toast.error("Faça login para solicitar.");
    try {
      await createReq.mutateAsync({ user_id: user.id, temp_player_id: tempPlayerId });
      toast.success("Solicitação enviada ao admin.");
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const onConfirmMerge = async () => {
    if (!selectedUser) return;
    try {
      await merge.mutateAsync({ user_id: selectedUser, temp_player_id: tempPlayerId });
      toast.success("Histórico vinculado e jogador temporário removido.");
      setOpen(false);
      setSelectedUser(null);
      setConfirming(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSelectedUser(null); setConfirming(false); } }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]">
          <Link2 className="size-3 mr-1" />Vincular
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display fpc-text-gold">
            Vincular {tempPlayerName}
          </DialogTitle>
        </DialogHeader>

        {isAdmin ? (
          confirming && selectedUser ? (
            <div className="space-y-3">
              <p className="text-sm">
                Confirmar vínculo do histórico de <b>{tempPlayerName}</b> ao perfil selecionado?
                Todas as participações serão transferidas e o jogador temporário será apagado.
                Esta ação não pode ser desfeita.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirming(false)}>Voltar</Button>
                <Button
                  className="bg-gradient-gold text-primary-foreground"
                  disabled={merge.isPending}
                  onClick={onConfirmMerge}
                >
                  {merge.isPending ? <Loader2 className="size-4 animate-spin" /> : "Confirmar vínculo"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                placeholder="Buscar perfil por apelido ou nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="max-h-72 overflow-y-auto space-y-1 -mx-1 px-1">
                {isLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="size-5 text-primary animate-spin" /></div>
                ) : filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nenhum perfil encontrado.</p>
                ) : (
                  filtered.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedUser(p.id)}
                      className={`w-full flex items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-secondary/40 ${selectedUser === p.id ? "bg-primary/10 border border-primary/40" : "border border-transparent"}`}
                    >
                      <PlayerAvatar avatarId={p.avatar_url ?? "a1"} name={p.nickname ?? "?"} size={32} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium break-words line-clamp-1">{p.nickname}</p>
                        {p.full_name && <p className="text-[11px] text-muted-foreground line-clamp-1">{p.full_name}</p>}
                      </div>
                      {selectedUser === p.id && <Check className="size-4 text-primary" />}
                    </button>
                  ))
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button
                  className="bg-gradient-gold text-primary-foreground"
                  disabled={!selectedUser}
                  onClick={() => setConfirming(true)}
                >
                  Vincular
                </Button>
              </DialogFooter>
            </div>
          )
        ) : (
          <div className="space-y-3">
            <p className="text-sm">
              Enviar solicitação ao admin para vincular o histórico de <b>{tempPlayerName}</b> ao seu perfil?
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button
                className="bg-gradient-gold text-primary-foreground"
                disabled={createReq.isPending || !user}
                onClick={onRequestLink}
              >
                {createReq.isPending ? <Loader2 className="size-4 animate-spin" /> : "Enviar solicitação"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
