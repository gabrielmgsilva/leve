// Evolução: período escolhido (1M · 3M · 6M · Tudo) e o resumo dele (5.5).

import { shiftDay } from '@/lib/dates';

import { slopePerWeek, trendAt, trendAtStart, type TrendPoint, type Weighing } from './weight';

export type Period = '1M' | '3M' | '6M' | 'all';

const PERIOD_DAYS: Record<Exclude<Period, 'all'>, number> = { '1M': 30, '3M': 91, '6M': 182 };

/** Primeiro dia do período; nunca antes do primeiro registro. */
export function periodStart(period: Period, today: string, firstDay: string): string {
  if (period === 'all') return firstDay;
  const start = shiftDay(today, -(PERIOD_DAYS[period] - 1));
  return start > firstDay ? start : firstDay;
}

export type PeriodSummary<W extends Weighing = Weighing> = {
  weighings: W[];
  points: TrendPoint[];
  /** Variação da tendência no período. */
  changeG: number | null;
  /** Ritmo médio (inclinação da tendência), g por semana. */
  rateG: number | null;
  min: W | null;
};

export function periodSummary<W extends Weighing>(
  weighings: readonly W[],
  points: readonly TrendPoint[],
  from: string,
  to: string,
): PeriodSummary<W> {
  const inRange = (day: string) => day >= from && day <= to;
  const ws = weighings.filter((w) => inRange(w.at.slice(0, 10)));
  const ps = points.filter((p) => inRange(p.day));
  const start = trendAtStart(points, from, to);
  const end = trendAt(points, to);
  let min: W | null = null;
  for (const w of ws) if (!min || w.g <= min.g) min = w;
  return {
    weighings: ws,
    points: ps,
    changeG: ps.length && start !== null && end !== null ? end - start : null,
    rateG: slopePerWeek(ps),
    min,
  };
}
