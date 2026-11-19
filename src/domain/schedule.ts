// Agenda semanal da aplicação (R1).

import { dayNum, fromDayNum, weekdayOf } from '@/lib/dates';

/** Intervalo mínimo entre duas aplicações, em dias (a bula pede 3 dias, ou 72 h). */
export const MIN_GAP_DAYS = 3;

export type DueState = 'upcoming' | 'today' | 'taken' | 'overdue';

export type NextDue = {
  day: string;
  state: DueState;
  /** Dias até a data prevista; negativo quando está atrasada. */
  daysUntil: number;
};

/**
 * Próxima aplicação prevista: o primeiro dia no dia da semana do plano que caia 3 dias ou mais
 * depois do último registro (aplicação ou semana pulada). Uma aplicação atrasada volta para o dia
 * habitual, e uma troca de dia respeita o intervalo mínimo.
 */
export function nextDue(lastRecordDay: string | null, weekday: number, today: string): NextDue {
  const t = dayNum(today);
  let d = lastRecordDay ? dayNum(lastRecordDay) + MIN_GAP_DAYS : t;
  while (weekdayOf(fromDayNum(d)) !== weekday) d++;
  const day = fromDayNum(d);
  if (lastRecordDay !== null && lastRecordDay.slice(0, 10) === today) return { day, state: 'taken', daysUntil: d - t };
  if (d === t) return { day, state: 'today', daysUntil: 0 };
  return { day, state: d < t ? 'overdue' : 'upcoming', daysUntil: d - t };
}

/** Datas previstas a partir da próxima, semana a semana, até `untilDay` (inclusive). */
export function plannedDays(next: NextDue, untilDay: string): string[] {
  const out: string[] = [];
  for (let d = dayNum(next.day); d <= dayNum(untilDay); d += 7) out.push(fromDayNum(d));
  return out;
}
