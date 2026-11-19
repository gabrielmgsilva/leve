// Relatório para a consulta: HTML de uma página A4 (ou mais) que o expo-print transforma em PDF.
// Tudo calculado pelas funções do domínio; aqui só a montagem e o desenho do gráfico em SVG.

import type { InjectionRow, JournalRow, MeasureRow, PenRow, WeightRow } from '@/db/queries';
import { measureStats } from '@/domain/measures';
import { symptomPatterns } from '@/domain/patterns';
import { dosePhases } from '@/domain/phases';
import { penNumbers } from '@/domain/pens';
import { doseRank, type PlanStep } from '@/domain/titration';
import { bmi, dailyMeans, goalProjection, phaseStats, ratePerWeek, trend, trendAt, trendAtStart } from '@/domain/weight';
import { light as c, doseScale } from '@/theme/tokens';

import { dayNum } from './dates';
import { ddmm, ddmmyyyy, kg, mg, monthYear, num, plural, signedKg, signedPct, timeOf } from './format';
import { LEVEL_LABEL, MEASURE_LABEL, penLabel, SITE_NAME, SYMPTOM_LABEL } from './labels';
import { patternText } from './patternText';

export type ReportInput = {
  name: string;
  today: string; // 'AAAA-MM-DD'
  generatedAt: string; // 'AAAA-MM-DD HH:MM'
  from: string; // início do período
  heightCm: number | null;
  goalG: number | null;
  plan: readonly PlanStep[];
  weights: readonly WeightRow[];
  injections: readonly InjectionRow[];
  pens: readonly PenRow[];
  journal: readonly JournalRow[];
  measures: readonly MeasureRow[];
  includeNotes: boolean;
};

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string);
}

const inPeriod = (at: string, from: string, to: string) => at.slice(0, 10) >= from && at.slice(0, 10) <= to;

/** Gráfico de peso: faixas de dose, pesagens (pontos) e tendência (linha). */
function chartSvg(input: ReportInput, points: ReturnType<typeof trend>): string {
  const W = 680;
  const H = 220;
  const padL = 8;
  const padR = 44;
  const padT = 22;
  const padB = 22;
  const { from, today } = input;
  const ws = input.weights.filter((w) => inPeriod(w.at, from, today));
  const ps = points.filter((p) => p.day >= from && p.day <= today);
  if (!ws.length) return '<p class="muted">Nenhuma pesagem no período.</p>';
  const vals = [...ws.map((w) => w.g), ...ps.map((p) => p.t)];
  const lo = Math.floor((Math.min(...vals) - 500) / 1000) * 1000;
  const hi = Math.ceil((Math.max(...vals) + 500) / 1000) * 1000;
  const d0 = dayNum(from);
  const d1 = Math.max(dayNum(today), d0 + 1);
  const x = (day: string) => padL + ((dayNum(day) - d0) / (d1 - d0)) * (W - padL - padR);
  const y = (g: number) => padT + (1 - (g - lo) / (hi - lo)) * (H - padT - padB);
  const parts: string[] = [];

  // Faixas de dose
  for (const ph of dosePhases(input.injections)) {
    const a = ph.from > from ? ph.from : from;
    const b = ph.to && ph.to < today ? ph.to : today;
    if (a > today || (ph.to !== null && ph.to <= from)) continue;
    const color = doseScale.light[Math.min(doseRank(ph.mcg, input.plan), doseScale.light.length - 1)];
    const x0 = x(a);
    const x1 = Math.max(x(b), x0 + 2);
    parts.push(`<rect x="${x0.toFixed(1)}" y="${padT}" width="${(x1 - x0).toFixed(1)}" height="${H - padT - padB}" fill="${color}" opacity="0.16"/>`);
    if (x1 - x0 > 34) parts.push(`<text x="${(x0 + 4).toFixed(1)}" y="${padT - 7}" class="axis">${mg(ph.mcg)}</text>`);
  }
  // Grade (4 linhas) e eixo à direita
  for (let i = 0; i <= 3; i++) {
    const g = lo + ((hi - lo) * i) / 3;
    const yy = y(g).toFixed(1);
    parts.push(`<line x1="${padL}" x2="${W - padR}" y1="${yy}" y2="${yy}" stroke="${c.line}" stroke-width="1"/>`);
    parts.push(`<text x="${W - padR + 6}" y="${(y(g) + 4).toFixed(1)}" class="axis">${kg(g, 0)}</text>`);
  }
  parts.push(`<text x="${padL}" y="${H - 5}" class="axis">${ddmm(from)}</text>`);
  parts.push(`<text x="${W - padR}" y="${H - 5}" class="axis" text-anchor="end">${ddmm(today)}</text>`);
  // Meta
  if (input.goalG !== null && input.goalG >= lo && input.goalG <= hi) {
    const yy = y(input.goalG).toFixed(1);
    parts.push(`<line x1="${padL}" x2="${W - padR}" y1="${yy}" y2="${yy}" stroke="${c.body}" stroke-width="1" stroke-dasharray="4 4"/>`);
  }
  // Pesagens e tendência
  for (const w of ws) {
    parts.push(`<circle cx="${x(w.at.slice(0, 10)).toFixed(1)}" cy="${y(w.g).toFixed(1)}" r="2.6" fill="${c.point}"/>`);
  }
  if (ps.length > 1) {
    const path = ps.map((p, i) => `${i ? 'L' : 'M'}${x(p.day).toFixed(1)} ${y(p.t).toFixed(1)}`).join('');
    parts.push(`<path d="${path}" fill="none" stroke="${c.body}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`);
  }
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Gráfico de peso">${parts.join('')}</svg>`;
}

const row = (cells: readonly string[]) => `<tr>${cells.map((v) => `<td>${v}</td>`).join('')}</tr>`;

/** HTML completo do relatório. */
export function reportHtml(input: ReportInput): string {
  const { from, today } = input;
  const points = trend(dailyMeans(input.weights));
  const period = `${ddmmyyyy(from)} a ${ddmmyyyy(today)}`;
  const first = input.weights[0];
  const latest = input.weights[input.weights.length - 1];

  // Resumo
  const summary: [string, string][] = [];
  if (first && latest) {
    summary.push(['Última pesagem', `${kg(latest.g)} kg em ${ddmmyyyy(latest.at.slice(0, 10))}`]);
    summary.push(['Peso inicial', `${kg(first.g)} kg em ${ddmmyyyy(first.at.slice(0, 10))}`]);
    const total = latest.g - first.g;
    summary.push(['Desde o início', `${signedKg(total)} kg (${signedPct(total / first.g)})`]);
    const a = trendAtStart(points, from, today);
    const b = trendAt(points, today);
    if (a !== null && b !== null) summary.push(['Tendência no período', `${signedKg(b - a)} kg`]);
    const rate = ratePerWeek(points, today, 28);
    summary.push(['Ritmo (últimas 4 semanas)', rate !== null ? `${signedKg(rate, 2)} kg por semana` : 'dados insuficientes']);
    if (input.heightCm) summary.push(['IMC', num(bmi(latest.g, input.heightCm))]);
    if (input.goalG !== null) {
      const proj = goalProjection(points, input.goalG, today);
      summary.push([
        'Meta',
        `${kg(input.goalG)} kg${proj ? ` · no ritmo atual, por volta de ${monthYear(proj.day)}` : ''}`,
      ]);
    }
  }

  // Por fase de dose
  const phases = phaseStats(dosePhases(input.injections), points, { from, to: today });
  const phaseRows = phases.map((p) =>
    row([
      mg(p.mcg),
      `${ddmm(p.from)} a ${ddmm(p.to)}${p.current ? ' (atual)' : ''}`,
      plural(p.count, 'aplicação', 'aplicações'),
      p.changeG !== null ? `${signedKg(p.changeG)} kg` : '—',
      p.ratePerWeekG !== null ? `${signedKg(p.ratePerWeekG, 2)} kg/sem` : '—',
    ]),
  );

  // Aplicações
  const numbers = penNumbers(input.pens);
  const penById = new Map(input.pens.map((p) => [p.id, p]));
  const injRows = input.injections
    .filter((i) => inPeriod(i.at, from, today))
    .map((i) => {
      const pen = i.pen_id !== null ? penById.get(i.pen_id) : undefined;
      return row([
        `${ddmm(i.at)} ${timeOf(i.at)}`,
        i.dose_mcg === null ? '<em>semana pulada</em>' : mg(i.dose_mcg),
        i.site ? SITE_NAME[i.site] : '—',
        pen ? escapeHtml(`Caneta ${numbers.get(pen.id)} · ${penLabel(pen)}`) : '—',
        i.note ? escapeHtml(i.note) : '',
      ]);
    });

  // Sintomas no período
  const symptoms = input.journal.filter((j) => j.kind !== 'note' && j.kind !== 'well' && inPeriod(j.at, from, today));
  const byKind = new Map<string, { n: number; levels: number[] }>();
  for (const s of symptoms) {
    const e = byKind.get(s.kind) ?? { n: 0, levels: [] };
    e.n += 1;
    if (s.level !== null) e.levels.push(s.level);
    byKind.set(s.kind, e);
  }
  const symptomRows = [...byKind.entries()]
    .sort((a, b) => b[1].n - a[1].n)
    .map(([kind, e]) => {
      const avg = e.levels.length ? Math.round(e.levels.reduce((s, l) => s + l, 0) / e.levels.length) : null;
      return row([escapeHtml(SYMPTOM_LABEL[kind] ?? kind), String(e.n), avg !== null ? (LEVEL_LABEL[avg] ?? '') : '—']);
    });
  const patterns = symptomPatterns(
    input.journal.filter((j) => inPeriod(j.at, from, today)),
    input.injections,
  ).map((p) => `<li>${escapeHtml(patternText(p))}</li>`);

  // Medidas
  const measureRows = measureStats(input.measures.filter((m) => inPeriod(m.at, from, today))).map((m) =>
    row([
      escapeHtml(MEASURE_LABEL[m.kind] ?? m.kind),
      `${num(m.first.mm / 10)} cm em ${ddmm(m.first.at)}`,
      `${num(m.latest.mm / 10)} cm em ${ddmm(m.latest.at)}`,
      m.count > 1 ? `${m.changeMm > 0 ? '+' : m.changeMm < 0 ? '−' : ''}${num(Math.abs(m.changeMm) / 10)} cm` : '—',
    ]),
  );

  // Notas
  const notes = input.includeNotes
    ? input.journal
        .filter((j) => j.kind === 'note' && j.text && inPeriod(j.at, from, today))
        .map((j) => `<li><strong>${ddmm(j.at)}</strong> ${escapeHtml(j.text as string)}</li>`)
    : [];

  const table = (head: readonly string[], rows: readonly string[]) =>
    `<table><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Leve · Relatório</title>
<style>
  @page { size: A4; margin: 14mm 14mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Roboto, 'Segoe UI', Arial, sans-serif; color: ${c.ink}; font-size: 11pt; line-height: 1.4; margin: 0; }
  header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid ${c.med}; padding-bottom: 8px; margin-bottom: 14px; }
  h1 { font-size: 18pt; margin: 0; font-weight: 600; }
  h2 { font-size: 12.5pt; margin: 18px 0 6px; color: ${c.medStrong}; font-weight: 600; }
  .muted { color: ${c.text3}; font-size: 9.5pt; }
  .brand { color: ${c.med}; font-weight: 700; letter-spacing: .5px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 18px; }
  .kv { display: flex; justify-content: space-between; border-bottom: 1px solid ${c.line}; padding: 4px 0; }
  .kv span:first-child { color: ${c.text2}; }
  .kv span:last-child { font-weight: 600; text-align: right; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  th { text-align: left; color: ${c.text2}; font-weight: 600; border-bottom: 1px solid ${c.line}; padding: 4px 6px 4px 0; }
  td { border-bottom: 1px solid ${c.line}; padding: 4px 6px 4px 0; vertical-align: top; }
  .axis { font-size: 9px; fill: ${c.text3}; }
  ul { margin: 4px 0; padding-left: 18px; }
  section { break-inside: avoid; }
  footer { margin-top: 20px; border-top: 1px solid ${c.line}; padding-top: 6px; }
</style></head>
<body>
<header>
  <div><div class="brand">LEVE</div><h1>Relatório do tratamento${input.name ? ` · ${escapeHtml(input.name)}` : ''}</h1></div>
  <div class="muted" style="text-align:right">Período: ${period}<br>Gerado em ${ddmmyyyy(input.generatedAt.slice(0, 10))} às ${timeOf(input.generatedAt)}</div>
</header>
<section><h2>Resumo</h2>${
    summary.length
      ? `<div class="grid">${summary.map(([k, v]) => `<div class="kv"><span>${k}</span><span>${v}</span></div>`).join('')}</div>`
      : '<p class="muted">Sem pesagens registradas.</p>'
  }</section>
<section><h2>Peso</h2>${chartSvg(input, points)}<div class="muted">Pontos: pesagens · Linha: tendência (média que suaviza as oscilações do dia a dia) · Faixas: dose de cada fase${
    input.goalG !== null ? ' · Tracejado: meta' : ''
  }</div></section>
${phaseRows.length ? `<section><h2>Por fase de dose</h2>${table(['Dose', 'Período', 'Aplicações', 'Variação da tendência', 'Ritmo'], phaseRows)}</section>` : ''}
<section><h2>Aplicações no período</h2>${
    injRows.length ? table(['Data', 'Dose', 'Local', 'Caneta', 'Observação'], injRows) : '<p class="muted">Nenhuma aplicação no período.</p>'
  }</section>
<section><h2>Sintomas no período</h2>${
    symptomRows.length ? table(['Sintoma', 'Registros', 'Intensidade mais comum'], symptomRows) : '<p class="muted">Nenhum sintoma registrado no período.</p>'
  }${patterns.length ? `<p class="muted" style="margin:8px 0 2px">Padrões percebidos nos registros:</p><ul>${patterns.join('')}</ul>` : ''}</section>
${measureRows.length ? `<section><h2>Medidas</h2>${table(['Medida', 'Primeira', 'Última', 'Variação'], measureRows)}</section>` : ''}
${notes.length ? `<section><h2>Notas</h2><ul>${notes.join('')}</ul></section>` : ''}
<footer class="muted">Registro pessoal feito no app Leve. As doses seguem a prescrição médica; este relatório não substitui a avaliação de um profissional de saúde.</footer>
</body></html>`;
}
