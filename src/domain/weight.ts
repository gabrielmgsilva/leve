// Peso: médias diárias, tendência, ritmo, fases de dose, semana a semana, marcos e IMC (R4).
// Tudo em gramas; dias em texto 'AAAA-MM-DD'.

import { dayNum, fromDayNum, shiftDay } from '@/lib/dates';

import type { DosePhase } from './phases';

export type Weighing = { at: string; g: number };
export type DayMean = { day: string; g: number };
/** `g` = média do dia; `t` = tendência no dia. */
export type TrendPoint = { day: string; g: number; t: number };

export const TREND_ALPHA = 0.15;

/** Várias pesagens no mesmo dia viram um ponto só (a média), em ordem de data. */
export function dailyMeans(weights: readonly Weighing[]): DayMean[] {
  const sums = new Map<string, { s: number; n: number }>();
  for (const w of weights) {
    const day = w.at.slice(0, 10);
    const acc = sums.get(day);
    if (acc) {
      acc.s += w.g;
      acc.n += 1;
    } else {
      sums.set(day, { s: w.g, n: 1 });
    }
  }
  return [...sums.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([day, { s, n }]) => ({ day, g: s / n }));
}

/**
 * Média móvel exponencial ajustada ao intervalo: t₁ = p₁; tᵢ = tᵢ₋₁ + a·(pᵢ − tᵢ₋₁),
 * com a = 1 − (1 − α)^Δdias. Funciona com pesagens diárias, semanais ou irregulares.
 */
export function trend(daily: readonly DayMean[], alpha = TREND_ALPHA): TrendPoint[] {
  const out: TrendPoint[] = [];
  for (const p of daily) {
    const prev = out[out.length - 1];
    if (!prev) {
      out.push({ day: p.day, g: p.g, t: p.g });
      continue;
    }
    const a = 1 - Math.pow(1 - alpha, dayNum(p.day) - dayNum(prev.day));
    out.push({ day: p.day, g: p.g, t: prev.t + a * (p.g - prev.t) });
  }
  return out;
}

/** Tendência num dia: a do último ponto até esse dia. Ela só muda quando entra uma pesagem nova. */
export function trendAt(points: readonly TrendPoint[], day: string): number | null {
  let value: number | null = null;
  for (const p of points) {
    if (p.day > day) break;
    value = p.t;
  }
  return value;
}

/** Tendência no início de um intervalo: a de antes dele ou, sem pesagem anterior, a primeira de dentro. */
export function trendAtStart(points: readonly TrendPoint[], from: string, to: string): number | null {
  const before = trendAt(points, shiftDay(from, -1));
  if (before !== null) return before;
  const first = points.find((p) => p.day >= from && p.day <= to);
  return first ? first.t : null;
}

function hasPointIn(points: readonly TrendPoint[], from: string, to: string): boolean {
  return points.some((p) => p.day >= from && p.day <= to);
}

/** Inclinação da regressão linear da tendência, em g por semana. Exige 4 dias ou mais espalhados em 14 dias ou mais. */
export function slopePerWeek(points: readonly TrendPoint[]): number | null {
  if (points.length < 4) return null;
  const xs = points.map((p) => dayNum(p.day));
  if (xs[xs.length - 1] - xs[0] < 14) return null;
  const n = points.length;
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = points.reduce((s, p) => s + p.t, 0) / n;
  let sxy = 0;
  let sxx = 0;
  points.forEach((p, i) => {
    sxy += (xs[i] - mx) * (p.t - my);
    sxx += (xs[i] - mx) ** 2;
  });
  return sxx === 0 ? null : (sxy / sxx) * 7;
}

/** Ritmo dos últimos `windowDays` dias até `endDay` (inclusive), em g por semana. */
export function ratePerWeek(points: readonly TrendPoint[], endDay: string, windowDays = 28): number | null {
  const from = shiftDay(endDay, -(windowDays - 1));
  return slopePerWeek(points.filter((p) => p.day >= from && p.day <= endDay));
}

/** Platô: ritmo das últimas 3 semanas entre −0,1 e +0,1 kg/semana. */
export function isPlateau(points: readonly TrendPoint[], today: string): boolean {
  const rate = ratePerWeek(points, today, 21);
  return rate !== null && Math.abs(rate) < 100;
}

// ---------- Por fase de dose ----------

export type PhaseStat = {
  mcg: number;
  from: string; // primeiro dia considerado (recortado no período)
  to: string; // último dia considerado
  current: boolean;
  /** Aplicações dessa dose dentro do recorte. */
  count: number;
  changeG: number | null; // null = sem pesagem no recorte
  ratePerWeekG: number | null;
};

/**
 * Variação da tendência em cada fase de dose, da primeira aplicação da dose até a véspera da
 * primeira aplicação da dose seguinte, recortada no período [from, to]. As variações das fases
 * somam a variação do período.
 */
export function phaseStats(
  phases: readonly DosePhase[],
  points: readonly TrendPoint[],
  range: { from: string | null; to: string },
): PhaseStat[] {
  const lastPoint = points[points.length - 1];
  const out: PhaseStat[] = [];
  phases.forEach((ph, i) => {
    const end = ph.to ? shiftDay(ph.to, -1) : range.to;
    const from = range.from && range.from > ph.from ? range.from : ph.from;
    const to = end < range.to ? end : range.to;
    if (from > to) return;
    const count = ph.days.filter((d) => d >= from && d <= to).length;
    let changeG: number | null = null;
    let ratePerWeekG: number | null = null;
    if (hasPointIn(points, from, to)) {
      const a = trendAtStart(points, from, to);
      const b = trendAt(points, to);
      if (a !== null && b !== null) {
        changeG = b - a;
        // A fase em andamento só conta até a última pesagem.
        const effectiveEnd = lastPoint && lastPoint.day < to ? lastPoint.day : to;
        const weeks = Math.max(1, (dayNum(effectiveEnd) - dayNum(from) + 1) / 7);
        ratePerWeekG = changeG / weeks;
      }
    }
    out.push({ mcg: ph.mcg, from, to, current: i === phases.length - 1, count, changeG, ratePerWeekG });
  });
  return out;
}

// ---------- Semana a semana ----------

export type WeekChange = {
  week: number; // semana de tratamento (1 = a da primeira aplicação)
  from: string;
  to: string;
  partial: boolean; // semana em andamento
  changeG: number | null; // null = sem pesagem na semana
};

/**
 * Semana de tratamento n começa em início + 7·(n − 1) (R1). Variação = tendência no fim da semana
 * − tendência no fim da semana anterior; assim as semanas somam a variação total.
 */
export function weeklyChanges(points: readonly TrendPoint[], firstInjectionDay: string, today: string): WeekChange[] {
  const start = dayNum(firstInjectionDay);
  const end = dayNum(today);
  const weeks: WeekChange[] = [];
  for (let n = 1; start + 7 * (n - 1) <= end; n++) {
    const from = fromDayNum(start + 7 * (n - 1));
    const to = fromDayNum(start + 7 * n - 1);
    const partial = dayNum(to) > end;
    const lastDay = partial ? today : to;
    let changeG: number | null = null;
    if (hasPointIn(points, from, lastDay)) {
      const a = trendAtStart(points, from, lastDay);
      const b = trendAt(points, lastDay);
      if (a !== null && b !== null) changeG = b - a;
    }
    weeks.push({ week: n, from, to, partial, changeG });
  }
  return weeks;
}

/** Semana de tratamento de um dia: ⌊(dia − início) / 7⌋ + 1 (R1). Antes do início dá 0 ou menos. */
export function treatmentWeek(firstInjectionDay: string, day: string): number {
  return Math.floor((dayNum(day) - dayNum(firstInjectionDay)) / 7) + 1;
}

// ---------- Marcos ----------

export type Milestone = {
  kind: 'pct' | 'kg' | 'goal';
  /** % para 'pct', gramas perdidos para 'kg', peso da meta para 'goal'. */
  value: number;
  targetG: number;
  reachedOn: string | null; // dia em que a tendência chegou ao alvo
};

const PCTS = [5, 10, 15, 20];
const SAME_TARGET_G = 250;

/**
 * Marcos: −5 %, −10 %, −15 % e −20 % do peso inicial, a cada 5 kg e a meta. Um marco conta como
 * alcançado quando a tendência chega ao alvo. Nada passa da meta; alvos a menos de 250 g um do outro
 * viram um só (fica o de % ou a meta).
 */
export function milestones(startG: number, goalG: number | null, points: readonly TrendPoint[]): Milestone[] {
  const goal = goalG !== null && goalG < startG ? goalG : null;
  const floor = goal ?? startG * 0.8;
  const list: Milestone[] = [];
  if (goal !== null) list.push({ kind: 'goal', value: goal, targetG: goal, reachedOn: null });
  for (const pct of PCTS) {
    const targetG = startG * (1 - pct / 100);
    if (targetG >= floor) list.push({ kind: 'pct', value: pct, targetG, reachedOn: null });
  }
  for (let lost = 5000; startG - lost >= floor; lost += 5000) {
    list.push({ kind: 'kg', value: lost, targetG: startG - lost, reachedOn: null });
  }
  // Prioridade nos alvos repetidos: meta, depois %, depois kg.
  const kept: Milestone[] = [];
  for (const m of list) {
    if (kept.some((k) => Math.abs(k.targetG - m.targetG) < SAME_TARGET_G)) continue;
    kept.push(m);
  }
  kept.sort((a, b) => b.targetG - a.targetG);
  for (const m of kept) {
    const hit = points.find((p) => p.t <= m.targetG);
    m.reachedOn = hit ? hit.day : null;
  }
  return kept;
}

export type NextMilestone = {
  milestone: Milestone;
  /** 0–1, do marco anterior (ou do peso inicial) até este, pela última pesagem. */
  progress: number;
  remainingG: number;
};

/** O próximo marco ainda não alcançado; o "faltam X kg" usa a última pesagem (R4). */
export function nextMilestone(list: readonly Milestone[], startG: number, latestG: number): NextMilestone | null {
  // A lista vem do maior alvo para o menor, e a meta é sempre o último.
  const idx = list.findIndex((m) => m.reachedOn === null);
  if (idx < 0) return null;
  const target = list[idx];
  const prevG = idx > 0 ? list[idx - 1].targetG : startG;
  const span = prevG - target.targetG;
  const progress = span > 0 ? Math.min(1, Math.max(0, (prevG - latestG) / span)) : 0;
  return { milestone: target, progress, remainingG: Math.max(0, latestG - target.targetG) };
}

// ---------- Registro ----------

export const MIN_WEIGHT_G = 30000;
export const MAX_WEIGHT_G = 300000;

/** Texto do teclado ("79,7") em gramas; null fora da faixa de 30 a 300 kg ou com mais de 2 casas (R4). */
export function parseWeight(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (!/^\d{1,3}(\.\d{0,2})?$/.test(t)) return null;
  const g = Math.round(Number(t) * 1000);
  return g >= MIN_WEIGHT_G && g <= MAX_WEIGHT_G ? g : null;
}

/** Comparação com a pesagem anterior, para a frase acolhedora do registro. */
export function weighingChange(newG: number, previousG: number | null): 'first' | 'down' | 'up' | 'same' {
  if (previousG === null) return 'first';
  const diff = Math.round((newG - previousG) / 10); // em dezenas de gramas: menos de 5 g conta como igual
  if (diff === 0) return 'same';
  return diff < 0 ? 'down' : 'up';
}

// ---------- IMC ----------

export type BmiBand = 'under' | 'normal' | 'over' | 'obese1' | 'obese2' | 'obese3';

export function bmi(g: number, heightCm: number): number {
  const m = heightCm / 100;
  return g / 1000 / (m * m);
}

/** Faixas da OMS. */
export function bmiBand(value: number): BmiBand {
  if (value < 18.5) return 'under';
  if (value < 25) return 'normal';
  if (value < 30) return 'over';
  if (value < 35) return 'obese1';
  if (value < 40) return 'obese2';
  return 'obese3';
}

// ---------- Projeção da meta (P1) ----------

export type GoalProjection = {
  day: string; // dia estimado, mostrado como mês aproximado
  rateG: number; // ritmo usado, em g por semana (negativo)
};

const MIN_PROJECTION_RATE_G = -100; // −0,1 kg/semana
const MAX_PROJECTION_DAYS = 548; // 18 meses

/**
 * Quando a meta chega se o ritmo das últimas 4 semanas continuar (R4): só com ritmo de −0,1 kg/semana
 * ou mais rápido, e escondida se passar de 18 meses. Hoje + (tendência − meta) / |ritmo|.
 */
export function goalProjection(points: readonly TrendPoint[], goalG: number | null, today: string): GoalProjection | null {
  if (goalG === null) return null;
  const t = trendAt(points, today);
  if (t === null || t <= goalG) return null;
  const rate = ratePerWeek(points, today, 28);
  if (rate === null || rate > MIN_PROJECTION_RATE_G) return null;
  const days = Math.round(((t - goalG) / -rate) * 7);
  if (days > MAX_PROJECTION_DAYS) return null;
  return { day: shiftDay(today, days), rateG: rate };
}
