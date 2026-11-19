// Medidas corporais (Futuro → implementado): cintura, quadril e outras, em milímetros.

import { dayNum } from '@/lib/dates';

export const MEASURE_KINDS = ['waist', 'hip', 'abdomen', 'chest', 'arm', 'thigh'] as const;
export type MeasureKind = (typeof MEASURE_KINDS)[number];

type MeasureLike = { at: string; kind: string; mm: number };

export const MIN_MEASURE_MM = 100; // 10 cm
export const MAX_MEASURE_MM = 3000; // 300 cm

/** "90,5" → 905 mm; null fora de 10–300 cm ou com mais de uma casa decimal. */
export function parseCm(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (!/^\d{1,3}(\.\d)?$/.test(t)) return null;
  const mm = Math.round(Number(t) * 10);
  return mm >= MIN_MEASURE_MM && mm <= MAX_MEASURE_MM ? mm : null;
}

export type MeasureStat = {
  kind: string;
  first: { at: string; mm: number };
  latest: { at: string; mm: number };
  /** latest − first, em mm (negativo = diminuiu). */
  changeMm: number;
  count: number;
  /** Série para o minigráfico (uma medida por dia: a última do dia). */
  series: { day: string; mm: number }[];
};

/** Primeira e última de cada medida, na ordem de MEASURE_KINDS (as desconhecidas no fim). */
export function measureStats(measures: readonly MeasureLike[]): MeasureStat[] {
  const byKind = new Map<string, MeasureLike[]>();
  for (const m of [...measures].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0))) {
    const list = byKind.get(m.kind) ?? [];
    list.push(m);
    byKind.set(m.kind, list);
  }
  const order = (k: string) => {
    const i = (MEASURE_KINDS as readonly string[]).indexOf(k);
    return i < 0 ? MEASURE_KINDS.length : i;
  };
  return [...byKind.entries()]
    .sort(([a], [b]) => order(a) - order(b) || (a < b ? -1 : 1))
    .map(([kind, list]) => {
      const perDay = new Map<string, number>();
      for (const m of list) perDay.set(m.at.slice(0, 10), m.mm);
      const first = list[0];
      const latest = list[list.length - 1];
      return {
        kind,
        first: { at: first.at, mm: first.mm },
        latest: { at: latest.at, mm: latest.mm },
        changeMm: latest.mm - first.mm,
        count: list.length,
        series: [...perDay.entries()].map(([day, mm]) => ({ day, mm })).sort((a, b) => dayNum(a.day) - dayNum(b.day)),
      };
    });
}

/** Relação cintura/quadril da última medição que tem as duas; null sem par. */
export function waistHipRatio(measures: readonly MeasureLike[]): { at: string; ratio: number } | null {
  const byAt = new Map<string, { waist?: number; hip?: number }>();
  for (const m of measures) {
    if (m.kind !== 'waist' && m.kind !== 'hip') continue;
    const e = byAt.get(m.at) ?? {};
    e[m.kind] = m.mm;
    byAt.set(m.at, e);
  }
  const pairs = [...byAt.entries()].filter(([, e]) => e.waist && e.hip).sort(([a], [b]) => (a < b ? -1 : 1));
  const last = pairs[pairs.length - 1];
  if (!last) return null;
  const [at, e] = last;
  return { at, ratio: (e.waist as number) / (e.hip as number) };
}
