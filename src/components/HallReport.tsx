import logo from "@/assets/logo.png";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import type { HallEntry } from "@/hooks/useHallOfFame";

const wrap: React.CSSProperties = {
  width: 1080,
  background: "linear-gradient(135deg, #0a0a0a, #1a1410)",
  color: "#f5e8c9",
  padding: 48,
  fontFamily: "Inter, system-ui, sans-serif",
};
const headerStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 16, borderBottom: "2px solid #d4a93d", paddingBottom: 16, marginBottom: 24 };
const goldText: React.CSSProperties = { color: "#e8c34a", fontWeight: 800 };

export function HallReport({
  rounds,
  monthsByPlayerKey,
  year,
}: {
  rounds: HallEntry[];
  monthsByPlayerKey: Map<string, number>;
  year: number | null;
}) {
  const subtitle = year ? `Temporada ${year}` : "Todas as temporadas";
  return (
    <div style={wrap}>
      <div style={headerStyle}>
        <img src={logo} alt="" width={64} height={64} style={{ borderRadius: 8 }} />
        <div>
          <div style={{ ...goldText, fontSize: 32, lineHeight: 1.1 }}>Hall da Fama — Vencedores de Rodada</div>
          <div style={{ color: "#999", marginTop: 4 }}>{subtitle}</div>
        </div>
      </div>

      <div style={{ background: "#141414", borderRadius: 16, overflow: "hidden", border: "1px solid #2a2a2a" }}>
        {rounds.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", color: "#888" }}>Sem registros para o período.</div>
        )}
        {rounds.map((r, i) => {
          const meses = monthsByPlayerKey.get(r.key) ?? 0;
          return (
            <div key={r.key} style={{ display: "grid", gridTemplateColumns: "60px 90px 1fr 140px 140px", alignItems: "center", gap: 16, padding: "16px 20px", borderTop: i ? "1px solid #222" : "none" }}>
              <div style={{ ...goldText, textAlign: "center", fontSize: 22 }}>{i + 1}º</div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <PlayerAvatar avatarId={r.avatarId} name={r.nickname} size={80} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>
                  {r.nickname}
                  {r.isTemp && <span style={{ marginLeft: 10, fontSize: 11, color: "#999", textTransform: "uppercase" }}>temp</span>}
                </div>
              </div>
              <div style={{ background: "linear-gradient(135deg, #2a1d08, #1a1410)", border: "1px solid #d4a93d", borderRadius: 12, padding: "10px 16px", textAlign: "center" }}>
                <div style={{ ...goldText, fontSize: 26, lineHeight: 1 }}>{r.count}</div>
                <div style={{ fontSize: 11, color: "#d4a93d", textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>vitórias</div>
              </div>
              <div style={{ background: meses > 0 ? "#1a1a1a" : "transparent", border: meses > 0 ? "1px solid #2a2a2a" : "1px solid transparent", borderRadius: 12, padding: "10px 16px", textAlign: "center" }}>
                {meses > 0 && (
                  <>
                    <div style={{ ...goldText, fontSize: 22, lineHeight: 1 }}>{meses}</div>
                    <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>{meses === 1 ? "mês" : "meses"}</div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 24, textAlign: "center", color: "#777", fontSize: 12 }}>Família Poker Champions · gerado em {new Date().toLocaleDateString("pt-BR")}</div>
    </div>
  );
}
