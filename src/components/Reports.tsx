import logo from "@/assets/logo.png";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import type { RankingRow } from "@/hooks/useRanking";
import { rowKey } from "@/hooks/useRanking";
import { formatPoints } from "@/lib/format";
import type { GameWithParticipants } from "@/lib/db-types";
import { participantDisplay } from "@/lib/db-types";
import { calcTournamentPoints, getFM } from "@/lib/scoring";
import { formatBRL, formatDateTime } from "@/lib/format";

const wrap: React.CSSProperties = {
  width: 1080,
  background: "linear-gradient(135deg, #0a0a0a, #1a1410)",
  color: "#f5e8c9",
  padding: 48,
  fontFamily: "Inter, system-ui, sans-serif",
};
const headerStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 16, borderBottom: "2px solid #d4a93d", paddingBottom: 16, marginBottom: 24 };
const goldText: React.CSSProperties = { color: "#e8c34a", fontWeight: 800 };
const levelBadge: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  marginLeft: 8,
  padding: "3px 8px",
  minWidth: 20,
  height: 20,
  borderRadius: 6,
  background: "linear-gradient(135deg,#e8c34a,#d4a93d)",
  color: "#1a1410",
  fontSize: 11,
  fontWeight: 800,
  lineHeight: 1,
  verticalAlign: "middle",
};

function DeltaArrow({ delta }: { delta: number | null | undefined }) {
  if (delta === undefined) return null;
  if (delta === null) return <span style={{ color: "#888", fontSize: 14 }}>—</span>;
  if (delta > 0) return <span style={{ color: "#22c55e", fontSize: 12, fontWeight: 700 }}>▲ {delta}</span>;
  if (delta < 0) return <span style={{ color: "#ef4444", fontSize: 12, fontWeight: 700 }}>▼ {-delta}</span>;
  return <span style={{ color: "#888", fontSize: 14 }}>—</span>;
}

export function RankingReport({
  title,
  subtitle,
  rows,
  deltaMap,
}: {
  title: string;
  subtitle?: string;
  rows: RankingRow[];
  deltaMap?: Map<string, number | null>;
}) {
  const showDelta = !!deltaMap;
  return (
    <div style={wrap}>
      <div style={headerStyle}>
        <img src={logo} alt="" width={64} height={64} style={{ borderRadius: 8 }} />
        <div>
          <div style={{ ...goldText, fontSize: 32, lineHeight: 1.1 }}>{title}</div>
          {subtitle && <div style={{ color: "#999", marginTop: 4 }}>{subtitle}</div>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
        {[1, 0, 2].map((order) => {
          const row = rows[order];
          if (!row) return <div key={order} />;
          const place = order + 1;
          const medal = place === 1 ? "👑" : place === 2 ? "🥈" : "🥉";
          return (
            <div key={row.id} style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 16, padding: 16, textAlign: "center" }}>
              <div style={{ fontSize: 32 }}>{medal}</div>
              <div style={{ marginTop: 8, display: "flex", justifyContent: "center" }}>
                <PlayerAvatar avatarId={row.avatarId} name={row.nickname} size={place === 1 ? 80 : 64} />
              </div>
              <div style={{ marginTop: 8, fontWeight: 700 }}>
                {row.nickname}
                {!row.isTemp && row.level && <span style={levelBadge}>{row.level}</span>}
              </div>
              <div style={{ ...goldText, fontSize: 22, marginTop: 4 }}>{formatPoints(row.points)} pts</div>
            </div>
          );
        })}
      </div>

      <div style={{ background: "#141414", borderRadius: 16, overflow: "hidden", border: "1px solid #2a2a2a" }}>
        {rows.map((r, i) => {
          const delta = showDelta ? deltaMap!.get(rowKey(r)) : undefined;
          return (
            <div key={`${r.isTemp ? "t" : "u"}-${r.id}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderTop: i ? "1px solid #222" : "none" }}>
              <div style={{ ...goldText, width: 36, textAlign: "center" }}>{i + 1}º</div>
              {showDelta && (
                <div style={{ width: 44, textAlign: "center" }}>
                  <DeltaArrow delta={delta} />
                </div>
              )}
              <PlayerAvatar avatarId={r.avatarId} name={r.nickname} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>
                  {r.nickname}
                  {!r.isTemp && r.level && <span style={levelBadge}>{r.level}</span>}
                  {r.isTemp && <span style={{ marginLeft: 8, fontSize: 10, color: "#999", textTransform: "uppercase" }}>temp</span>}
                </div>
                <div style={{ fontSize: 11, color: "#888" }}>{r.games} partidas · {r.wins} vitórias</div>
              </div>
              <div style={{ ...goldText, fontSize: 18 }}>{formatPoints(r.points)}</div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 24, textAlign: "center", color: "#777", fontSize: 12 }}>Família Poker Champions · gerado em {new Date().toLocaleDateString("pt-BR")}</div>
    </div>
  );
}

export function GameReport({ game }: { game: GameWithParticipants }) {
  const totalActions = game.participations.reduce((s, p) => s + (p.entries || 0) + (p.rebuys || 0), 0);
  const fm = getFM(totalActions);
  const sorted = [...game.participations].sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
  const cols = "50px 1fr 60px 60px 60px 100px 100px 90px";
  return (
    <div style={wrap}>
      <div style={headerStyle}>
        <img src={logo} alt="" width={64} height={64} style={{ borderRadius: 8 }} />
        <div>
          <div style={{ ...goldText, fontSize: 28 }}>{game.name}</div>
          <div style={{ color: "#999", marginTop: 4, fontSize: 13 }}>{formatDateTime(game.date)} · FM {fm.toFixed(1)} · {totalActions} ações · {game.participations.length} jogadores</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <Stat label="Pote total" value={formatBRL(Number(game.total_pot))} />
        <Stat label="Rake Ás" value={formatBRL(Number(game.rake_as))} />
        <Stat label="Rake Mês" value={formatBRL(Number(game.rake_month))} />
        <Stat label="Premiação" value={formatBRL(Number(game.prize_pool))} highlight />
      </div>

      <div style={{ background: "#141414", borderRadius: 16, border: "1px solid #2a2a2a", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: cols, padding: "10px 16px", background: "#1f1810", color: "#d4a93d", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>
          <div>Pos</div>
          <div>Jogador</div>
          <div style={{ textAlign: "center" }}>Ent</div>
          <div style={{ textAlign: "center" }}>Reb</div>
          <div style={{ textAlign: "center" }}>KO</div>
          <div style={{ textAlign: "right" }}>Investido</div>
          <div style={{ textAlign: "right" }}>Lucro</div>
          <div style={{ textAlign: "right" }}>Pontos</div>
        </div>
        {sorted.map((p, i) => {
          const d = participantDisplay(p);
          const pts = p.position ? calcTournamentPoints({ totalPlayers: game.participations.length, position: p.position, totalActions, koPoints: p.ko_points || 0 }).total : 0;
          const invested = Number(p.total_invested || 0);
          const prize = Number((p as any).prize_won || 0);
          const profit = prize - invested;
          const profitColor = profit > 0 ? "#22c55e" : profit < 0 ? "#ef4444" : "#999";
          return (
            <div key={p.id} style={{ display: "grid", gridTemplateColumns: cols, padding: "10px 16px", borderTop: i ? "1px solid #222" : "none", alignItems: "center" }}>
              <div style={{ ...goldText }}>{p.position ? `${p.position}º` : "—"}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <PlayerAvatar avatarId={d.avatarId} name={d.nickname} size={28} />
                <span>
                  {d.nickname}
                  {!d.isTemp && (p as any).profile?.level && <span style={levelBadge}>{(p as any).profile.level}</span>}
                </span>
              </div>
              <div style={{ textAlign: "center" }}>{p.entries}</div>
              <div style={{ textAlign: "center" }}>{p.rebuys}</div>
              <div style={{ textAlign: "center" }}>{p.ko_points}</div>
              <div style={{ textAlign: "right", color: "#bbb" }}>{formatBRL(invested)}</div>
              <div style={{ textAlign: "right", color: profitColor, fontWeight: 700 }}>{formatBRL(profit)}</div>
              <div style={{ textAlign: "right", ...goldText }}>{formatPoints(pts)}</div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 24, textAlign: "center", color: "#777", fontSize: 12 }}>Família Poker Champions</div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ background: highlight ? "linear-gradient(135deg, #2a1d08, #1a1410)" : "#141414", border: highlight ? "1px solid #d4a93d" : "1px solid #2a2a2a", borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "#888" }}>{label}</div>
      <div style={{ ...goldText, fontSize: 18, marginTop: 4 }}>{value}</div>
    </div>
  );
}
