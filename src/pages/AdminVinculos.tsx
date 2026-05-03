import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { formatDateTime } from "@/lib/format";
import {
  useLinkRequests,
  useApproveLinkRequest,
  useRejectLinkRequest,
  type LinkRequestStatus,
} from "@/hooks/useLinkRequests";

export default function AdminVinculos() {
  const [tab, setTab] = useState<LinkRequestStatus | "all">("pending");
  const { data: requests, isLoading, error } = useLinkRequests(tab);
  const approve = useApproveLinkRequest();
  const reject = useRejectLinkRequest();

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl fpc-text-gold flex items-center gap-2">
        <Users className="size-7" />Vínculos de Jogadores
      </h1>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="pending">Pendentes</TabsTrigger>
          <TabsTrigger value="approved">Aprovados</TabsTrigger>
          <TabsTrigger value="rejected">Rejeitados</TabsTrigger>
          <TabsTrigger value="all">Todos</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="fpc-card">
        <CardHeader>
          <CardTitle className="font-display fpc-text-gold">Solicitações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="size-6 text-primary animate-spin" /></div>
          ) : error ? (
            <p className="text-sm text-destructive">
              Erro ao carregar. Verifique se a tabela <code>link_requests</code> existe no Supabase.
            </p>
          ) : !requests || requests.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma solicitação.</p>
          ) : (
            requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl px-3 py-3 fpc-card">
                <div className="flex items-center gap-3 min-w-0">
                  <PlayerAvatar avatarId={r.profile?.avatar_url ?? "a1"} name={r.profile?.nickname ?? "?"} size={36} />
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{r.profile?.nickname ?? "Usuário"}</span>{" "}
                      ↔{" "}
                      <span className="text-muted-foreground">{r.temp_player?.nickname ?? "Temp"} (temporário)</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(r.created_at)} · {r.status}</p>
                  </div>
                </div>
                {r.status === "pending" && (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={reject.isPending}
                      onClick={() => reject.mutate(r.id, { onSuccess: () => toast.error("Rejeitado") })}
                    >
                      <X className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      className="bg-gradient-gold text-primary-foreground"
                      disabled={approve.isPending}
                      onClick={() =>
                        approve.mutate(r, {
                          onSuccess: () => toast.success("Aprovado e participações migradas"),
                          onError: (e: any) => toast.error(e?.message ?? "Erro ao aprovar"),
                        })
                      }
                    >
                      <Check className="size-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
