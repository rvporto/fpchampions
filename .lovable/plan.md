
# Plano de Execução — 5 alterações

Nada será aplicado até seu comando explícito. Abaixo, exatamente o que será mudado em cada arquivo.

---

## 1) Dashboard — 5 partidas recentes + visualização rápida

**Arquivo:** `src/pages/Dashboard.tsx`

- Linha 75: trocar `slice(0, 3)` por `slice(0, 5)` em `recentGames`.
- Componente `RecentGamesCard` (linhas 294–313):
  - Remover `<Link to="/partidas">` que envolve cada partida.
  - Adicionar estado local `const [quickId, setQuickId] = useState<string | null>(null);`.
  - Cada item vira um `<button onClick={() => setQuickId(g.id)}>` (mantendo as classes `fpc-card fpc-hover-gold p-3`).
  - Renderizar ao final um novo modal `<GameQuickViewModal gameId={quickId} onOpenChange={(v) => !v && setQuickId(null)} />`.

**Arquivo novo:** `src/components/GameQuickViewModal.tsx`

- Modal somente-leitura (Dialog do shadcn).
- Usa o hook existente `useGame(gameId)` (já em `src/hooks/useGames.ts`).
- Mostra: nome, data (`formatDateTime`), buy-in/rebuy, pote total, prêmio, status; e a lista de participantes ordenada por `position` com avatar, apelido, posição, KOs, pontos de ranking, prêmio.
- Botão "Ver detalhes completos" abre `GameDetailsModal` (opcional — ou apenas linka para `/partidas`).
- Não duplica o `GameDetailsModal` (que tem edição admin); este é leve e público.

---

## 2) Partidas — filtros (ano + mês) e paginação de 10

**Arquivo:** `src/pages/Partidas.tsx`

- Adicionar estados:
  - `const [yearF, setYearF] = useState<number>(new Date().getFullYear());`
  - `const [monthF, setMonthF] = useState<"all" | number>("all");`
  - `const [visible, setVisible] = useState(10);`
- Derivar `years` a partir de `games` (set de `g.season_year`, ordenado desc), garantindo que o ano vigente apareça mesmo sem partidas.
- Filtragem com `useMemo`:
  ```ts
  const filtered = games.filter(g =>
    g.season_year === yearF && (monthF === "all" || g.month === monthF)
  );
  const shown = filtered.slice(0, visible);
  ```
- UI dos filtros (acima da lista, dentro do header da página): dois `Select` (shadcn) — "Temporada" (lista de anos) e "Mês" (`Todos` + `MONTHS_PT`). Ao alterar qualquer filtro, resetar `setVisible(10)`.
- Botão "Mostrar mais" (`variant="outline"`, full width) renderizado apenas se `filtered.length > visible`; ao clicar: `setVisible(v => v + 10)`.
- Mensagem vazia adaptada quando o filtro não retorna nada.

---

## 3) Hall da Fama público (sem login)

**Arquivo:** `src/App.tsx`

- Linhas 52–59: remover o wrapper `<ProtectedRoute>` da rota `/hall-da-fama`, deixando:
  ```tsx
  <Route path="/hall-da-fama" element={<HallDaFama />} />
  ```

**Arquivo:** `src/pages/HallDaFama.tsx`

- O `useAuth().isAdmin` já trata a ausência de usuário (volta `false`), então os botões de admin somem naturalmente. Sem outras mudanças necessárias.

**Verificar:** `src/components/AppLayout.tsx` — confirmar que o link "Hall da Fama" aparece na navegação para visitantes (se houver gating por `user`, removê-lo apenas para esse item). Se já é público no menu, nenhuma mudança.

---

## 4) Hall da Fama — filtro por temporada em "Rodadas" e "Mês"

**Arquivo:** `src/hooks/useHallOfFame.ts`

Mudança estrutural: hoje `rounds` e `months` são agregados globais. Para permitir filtragem por temporada, precisamos manter a granularidade por ano.

- Em `HallData`, mudar:
  - `rounds: HallEntry[]` → `roundsByYear: Record<number, HallEntry[]>` **e** `roundsAll: HallEntry[]` (agregação total — usado no modo "Todas as temporadas").
  - `months: HallEntry[]` → `monthsByYear: Record<number, HallEntry[]>` **e** `monthsAll: HallEntry[]`.
  - Adicionar `years: number[]` (lista de anos disponíveis em ordem desc).
- Lógica:
  - Para `rounds`: agrupar `parts` por `gamesList` cruzando `game_id → game.season_year`. Construir um mapa por ano `{ year → Map<key, HallEntry> }` e simultaneamente o agregado `roundsAll`.
  - Para `months`: já temos `monthly_rankings` com `season_year`; agrupar por `season_year` e produzir `monthsAll` somando todos.
  - `years`: união de `gamesList.map(g.season_year)` com `monthly_rankings.map(season_year)`, com `season_champions.map(year)`. Ordenar desc.
- Manter `yearChampions` e `asChampions` como estão (já têm `year`).

**Arquivo:** `src/pages/HallDaFama.tsx`

- Adicionar estado:
  ```ts
  const currentYear = new Date().getFullYear();
  const [roundsYear, setRoundsYear] = useState<number | "all">(currentYear);
  const [monthsYear, setMonthsYear] = useState<number | "all">(currentYear);
  ```
- Computar listas filtradas:
  - `roundsList = roundsYear === "all" ? data.roundsAll : (data.roundsByYear[roundsYear] ?? [])` (já ordenado desc por `count`).
  - Idem para `monthsList`.
- Em cada `TabsContent` ("rounds" e "months"), renderizar acima do `CountList` um `<Select>` com as opções: `Todas as temporadas` + `data.years` mapeadas. Default = ano vigente; se o vigente não existir em `years`, mostrar "Todas".
- `CountList` continua igual (recebe `entries`).

---

## 5) Perfil — filtro por temporada no histórico + paginação de 5

**Arquivo:** `src/pages/Perfil.tsx`

- Adicionar estados:
  ```ts
  const [histYear, setHistYear] = useState<number | "all">(new Date().getFullYear());
  const [histVisible, setHistVisible] = useState(5);
  ```
- Computar:
  ```ts
  const histYears = useMemo(() => {
    const ys = new Set((stats?.history ?? []).map(h => h.game.season_year));
    return [...ys].sort((a,b)=>b-a);
  }, [stats]);
  const filteredHist = useMemo(() => {
    const list = stats?.history ?? [];
    return histYear === "all" ? list : list.filter(h => h.game.season_year === histYear);
  }, [stats, histYear]);
  const shownHist = filteredHist.slice(0, histVisible);
  ```
- No card "Histórico de Partidas":
  - Adicionar no `CardHeader` (ao lado do título, com `flex justify-between`) um `<Select>` para temporada (`Todas` + `histYears`).
  - Trocar `stats?.history.map` por `shownHist.map`.
  - Após a lista, se `filteredHist.length > histVisible`: renderizar botão `Mostrar mais` (`variant="outline"`, full width) que faz `setHistVisible(v => v + 5)`.
  - Resetar `histVisible` para 5 quando `histYear` muda (via `useEffect`).
- Verificar: o tipo `stats.history[i].game` deve ter `season_year` (ele tem — vem de `DbGame`).

---

## Resumo de arquivos tocados

| Arquivo | Tipo |
|---|---|
| `src/pages/Dashboard.tsx` | edit |
| `src/components/GameQuickViewModal.tsx` | new |
| `src/pages/Partidas.tsx` | edit |
| `src/App.tsx` | edit (remover ProtectedRoute do hall) |
| `src/components/AppLayout.tsx` | verificar/edit (visibilidade do link sem login) |
| `src/hooks/useHallOfFame.ts` | edit (estrutura por ano) |
| `src/pages/HallDaFama.tsx` | edit (filtros por temporada) |
| `src/pages/Perfil.tsx` | edit (filtro + paginação histórico) |

Nada de mudanças de SQL/banco — só frontend.

Aguardando seu OK para executar (pode pedir para fazer tudo, ou só os itens 1, 2, 3, 4 ou 5).
