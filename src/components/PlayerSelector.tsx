import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, X, Users, UserCircle2 } from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useProfiles, useTempPlayers } from "@/hooks/useGames";
import { TempPlayerDialog } from "@/components/TempPlayerDialog";
import { cn } from "@/lib/utils";

export interface SelectedParticipant {
  user_id?: string | null;
  temp_player_id?: string | null;
  // display only:
  nickname: string;
  avatarId: string;
  isTemp: boolean;
}

interface Props {
  value: SelectedParticipant[];
  onChange: (v: SelectedParticipant[]) => void;
}

export function PlayerSelector({ value, onChange }: Props) {
  const [q, setQ] = useState("");
  const profilesQ = useProfiles();
  const tempsQ = useTempPlayers();

  const selectedKeys = useMemo(
    () => new Set(value.map((p) => (p.user_id ? `u:${p.user_id}` : `t:${p.temp_player_id}`))),
    [value]
  );

  const isSelected = (key: string) => selectedKeys.has(key);

  const toggleUser = (id: string, nickname: string, avatarId: string) => {
    const key = `u:${id}`;
    if (isSelected(key)) onChange(value.filter((p) => p.user_id !== id));
    else onChange([...value, { user_id: id, nickname, avatarId, isTemp: false }]);
  };
  const toggleTemp = (id: string, nickname: string, avatarId: string) => {
    const key = `t:${id}`;
    if (isSelected(key)) onChange(value.filter((p) => p.temp_player_id !== id));
    else onChange([...value, { temp_player_id: id, nickname, avatarId, isTemp: true }]);
  };

  const profiles = (profilesQ.data ?? []).filter((p) =>
    !q || (p.nickname ?? "").toLowerCase().includes(q.toLowerCase()) || (p.full_name ?? "").toLowerCase().includes(q.toLowerCase())
  );
  const temps = (tempsQ.data ?? []).filter((p) =>
    !q || p.nickname.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((p) => (
            <Badge
              key={(p.user_id ?? p.temp_player_id) as string}
              variant="secondary"
              className="pl-1 pr-2 py-1 gap-2 fpc-chip"
            >
              <PlayerAvatar avatarId={p.avatarId} name={p.nickname} size={20} />
              <span className="text-xs">{p.nickname}</span>
              {p.isTemp && <span className="text-[10px] text-muted-foreground">temp</span>}
              <button
                onClick={() =>
                  onChange(value.filter((x) => (p.user_id ? x.user_id !== p.user_id : x.temp_player_id !== p.temp_player_id)))
                }
                className="hover:text-destructive"
                aria-label="remover"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar jogador..." className="pl-8" />
        </div>
        <TempPlayerDialog
          onCreated={(t) => toggleTemp(t.id, t.nickname, t.avatar_url ?? "a1")}
        />
      </div>

      <ScrollArea className="h-64 rounded-xl border border-border">
        <div className="p-2 space-y-3">
          <Section icon={<UserCircle2 className="size-4" />} title="Usuários">
            {profiles.length === 0 && <p className="text-xs text-muted-foreground px-2 py-3">Nenhum usuário.</p>}
            {profiles.map((p) => {
              const sel = isSelected(`u:${p.id}`);
              return (
                <Row
                  key={p.id}
                  selected={sel}
                  onClick={() => toggleUser(p.id, p.nickname ?? "Sem apelido", p.avatar_url ?? "a1")}
                  avatarId={p.avatar_url ?? "a1"}
                  primary={p.nickname ?? "Sem apelido"}
                  secondary={p.full_name ?? ""}
                />
              );
            })}
          </Section>

          <Section icon={<Users className="size-4" />} title="Temporários">
            {temps.length === 0 && <p className="text-xs text-muted-foreground px-2 py-3">Nenhum temporário.</p>}
            {temps.map((t) => {
              const sel = isSelected(`t:${t.id}`);
              return (
                <Row
                  key={t.id}
                  selected={sel}
                  onClick={() => toggleTemp(t.id, t.nickname, t.avatar_url ?? "a1")}
                  avatarId={t.avatar_url ?? "a1"}
                  primary={t.nickname}
                  secondary={t.full_name ?? "temporário"}
                  badge="temp"
                />
              );
            })}
          </Section>
        </div>
      </ScrollArea>

      <p className="text-xs text-muted-foreground">{value.length} jogador(es) selecionado(s)</p>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 px-2 py-1 text-xs uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ selected, onClick, avatarId, primary, secondary, badge }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors",
        selected ? "bg-primary/15 ring-1 ring-primary/40" : "hover:bg-secondary/50"
      )}
    >
      <PlayerAvatar avatarId={avatarId} name={primary} size={32} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{primary}</p>
        {secondary && <p className="text-[11px] text-muted-foreground truncate">{secondary}</p>}
      </div>
      {badge && <Badge variant="outline" className="text-[10px]">{badge}</Badge>}
      {selected && <span className="text-xs fpc-text-gold">✓</span>}
    </button>
  );
}
