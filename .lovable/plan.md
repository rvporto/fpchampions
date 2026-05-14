# Plano de Execução — 3 alterações

Nada será aplicado até comando explícito. Resumo do que muda em cada arquivo.

---

## 1) Dashboard — botão "Relatório" do Ranking do Mês deve gerar o relatório

**Arquivo:** `src/pages/Dashboard.tsx`

Hoje (linha ~196) o botão executa apenas `toast.info("Relatório em breve")`. Vamos:

- Importar `renderAndCapture` de `@/lib/reports` e `RankingReport` de `@/components/Reports`.
- Passar `monthlyRanking` para dentro de `MonthlyRankingCard` (já é passado como `ranking`).
- Trocar o `onClick` do botão por uma função `handleReport` que:
  ```ts
  await renderAndCapture(
    <RankingReport
      title={`Ranking — ${MONTHS_PT[month - 1]} ${year}`}
      subtitle={closed ? "Mês encerrado" : "Mês em andamento"}
      rows={ranking}
    />,
    `ranking-${year}-${String(month).padStart(2, "0")}.jpg`
  );
  ```
- Manter mensagem vazia: se `ranking.length === 0` → `toast.info("Sem dados para gerar relatório.")`.
- Estado `generating` para desabilitar o botão durante a captura (mostrar `Loader2` no lugar de `FileText`).

Sem mudanças em outros componentes.

---

## 2) Hall da Fama — botão "Relatório" em "Vencedores de Rodadas"

**Arquivo novo:** `src/components/HallReport.tsx`

Componente de relatório (mesmo `wrap`/header dourado que `Reports.tsx`) com título "Hall da Fama — Temporada {ano}" (ou "Todas as temporadas"). Recebe:
- `rounds: HallEntry[]` (vitórias por jogador)
- `monthsByPlayerKey: Map<string, number>` (meses vencidos por jogador, usando a mesma `key` do HallEntry)

Layout grande e legível:
- Lista vertical, fonte ~22px para o nome, badge dourado grande para "X vitórias" e, quando aplicável, um segundo badge "Y meses".
- Avatar 64px à esquerda, posição à esquerda, nick centralizado, badges à direita.
- Empty state se `rounds.length === 0`.

**Arquivo:** `src/pages/HallDaFama.tsx`

- Importar `renderAndCapture` e o novo `HallReport`.
- Em `SeasonFilter` (TabsContent "rounds"), adicionar ao lado do `Select` um `Button` (variant outline) com ícone `FileText` → `Relatório`.
- Função `handleRoundsReport`:
  - Calcula `monthsList` correspondente ao mesmo filtro de ano:
    - se `roundsYear === "all"`: `data.monthsAll`
    - senão: `data.monthsByYear[Number(roundsYear)] ?? []`
  - Monta `Map<string, number>` de `entry.key → entry.count` a partir dessa `monthsList`.
  - Chama `renderAndCapture(<HallReport rounds={roundsList} monthsByPlayerKey={mapMeses} year={roundsYear==='all'?null:Number(roundsYear)} />, "hall-rodadas-{year|todas}.jpg")`.
- Botão fica desabilitado e mostra `Loader2` enquanto gera.
- Não alterar a aba "Meses" nem o restante.

**Arquivo:** `src/hooks/useHallOfFame.ts` — sem alteração (já expõe `monthsByYear`/`monthsAll`).

---

## 3) Financeiro — adicionar 2 KPIs e reordenar

**Arquivo:** `src/pages/AdminFinanceiro.tsx`

- Calcular o mês vigente:
  ```ts
  const currentMonth = new Date().getMonth() + 1;
  const currentMonthData = byMonth.find(m => m.month === currentMonth);
  const rakeAsMonth = currentMonthData?.rakeAs ?? 0;
  const rakeMonthMonth = currentMonthData?.rakeMonth ?? 0;
  const monthLabel = MONTHS_PT[currentMonth - 1];
  ```
- Trocar o grid (linhas 61–66) para 6 colunas e nesta ordem:
  1. `Rake Ás (${monthLabel})` → `formatBRL(rakeAsMonth)` `accent`
  2. `Rake (${monthLabel})` → `formatBRL(rakeMonthMonth)`
  3. `Total Ás (ano)` → `formatBRL(totals.rakeAs)` `accent`
  4. `Total Mês (${year})` → `formatBRL(totals.rakeMonth)`
  5. `Saldo do Ás` → `formatBRL(totals.asBalance)` `highlight`
  6. `Premiação Distribuída` → `formatBRL(totals.prize)`
- Grid responsivo: `grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3`.

Nenhuma mudança em hooks/SQL.

---

## Resumo de arquivos tocados

| Arquivo | Tipo |
|---|---|
| `src/pages/Dashboard.tsx` | edit (botão Relatório do mês) |
| `src/components/HallReport.tsx` | new (componente de relatório do Hall) |
| `src/pages/HallDaFama.tsx` | edit (botão Relatório na aba Rodadas) |
| `src/pages/AdminFinanceiro.tsx` | edit (2 novos KPIs + reordenação) |

Sem mudanças de banco/SQL. Aguardando comando para executar (tudo ou itens específicos).
