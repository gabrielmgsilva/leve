// Hoje: faixa da semana, peso da semana, meta e o aviso do dia (5.2).

import { dayNum, fromDayNum, weekdayOf } from '@/lib/dates';

import type { Milestone, NextMilestone, TrendPoint } from './weight';
import { trendAt } from './weight';

export type StripDay = {
  day: string;
  isToday: boolean;
  weighed: boolean;
  applied: boolean; // aplicação registrada nesse dia
  planned: boolean; // aplicação prevista nesse dia
};

/** Semana de segunda a domingo que contém hoje. */
export function weekStrip(
  today: string,
  weighDays: ReadonlySet<string>,
  appliedDays: ReadonlySet<string>,
  plannedDay: string | null,
): StripDay[] {
  const offset = (weekdayOf(today) + 6) % 7; // segunda = 0
  const monday = dayNum(today) - offset;
  return Array.from({ length: 7 }, (_, i) => {
    const day = fromDayNum(monday + i);
    return {
      day,
      isToday: day === today,
      weighed: weighDays.has(day),
      applied: appliedDays.has(day),
      planned: plannedDay === day && !appliedDays.has(day),
    };
  });
}

/** Variação da tendência nos últimos 7 dias; null sem pesagem nesse intervalo ou antes dele. */
export function weekTrendChange(points: readonly TrendPoint[], today: string): number | null {
  const end = trendAt(points, today);
  const start = trendAt(points, fromDayNum(dayNum(today) - 7));
  const recent = points.some((p) => dayNum(p.day) > dayNum(today) - 7 && p.day <= today);
  return end !== null && start !== null && recent ? end - start : null;
}

/** Progresso até a meta (0–1) pela última pesagem; null sem meta acima do peso inicial. */
export function goalProgress(startG: number, latestG: number, goalG: number | null): number | null {
  if (goalG === null || goalG >= startG) return null;
  return Math.min(1, Math.max(0, (startG - latestG) / (startG - goalG)));
}

/** Últimos `days` dias da tendência, para o minigráfico. */
export function recentTrend(points: readonly TrendPoint[], today: string, days = 30): TrendPoint[] {
  const from = dayNum(today) - (days - 1);
  return points.filter((p) => dayNum(p.day) >= from && p.day <= today);
}

export type TodayAlert =
  | { kind: 'buy' }
  | { kind: 'backup'; daysSince: number | null }
  | { kind: 'milestoneReached'; milestone: Milestone }
  | { kind: 'milestoneNear'; next: NextMilestone; lastReached: Milestone | null }
  | { kind: 'plateau' }
  | { kind: 'tip'; index: number };

const NEAR_G = 2000;
const RECENT_DAYS = 7;

/** Intervalo do lembrete de backup (5.9). */
export const BACKUP_EVERY_DAYS = 30;

/**
 * Backup atrasado: 30 dias ou mais desde o último ou, sem nenhum, desde o primeiro registro.
 * Devolve os dias desde o último backup (null = nunca fez) ou null quando está em dia.
 */
export function backupOverdue(lastBackup: string | null, firstRecordDay: string | null, today: string): { daysSince: number | null } | null {
  const since = lastBackup ?? firstRecordDay;
  if (since === null) return null;
  const days = dayNum(today) - dayNum(since.slice(0, 10));
  if (days < BACKUP_EVERY_DAYS) return null;
  return { daysSince: lastBackup ? days : null };
}

/** Dia em que o próximo backup vence (para o lembrete), ou null sem registros. */
export function backupDueDay(lastBackup: string | null, firstRecordDay: string | null): string | null {
  const since = lastBackup ?? firstRecordDay;
  return since === null ? null : fromDayNum(dayNum(since.slice(0, 10)) + BACKUP_EVERY_DAYS);
}

/**
 * Um aviso por vez, nesta prioridade: caneta acabando sem estoque > marco atingido há pouco >
 * backup atrasado > marco próximo > platô > dica.
 */
export function todayAlert(input: {
  buy: boolean;
  backup?: { daysSince: number | null } | null;
  milestones: readonly Milestone[];
  next: NextMilestone | null;
  plateau: boolean;
  today: string;
  tipCount: number;
}): TodayAlert {
  if (input.buy) return { kind: 'buy' };
  const reached = input.milestones.filter((m) => m.reachedOn !== null);
  const last = reached[reached.length - 1] ?? null;
  if (last && dayNum(input.today) - dayNum(last.reachedOn as string) < RECENT_DAYS) {
    return { kind: 'milestoneReached', milestone: last };
  }
  if (input.backup) return { kind: 'backup', daysSince: input.backup.daysSince };
  if (input.next && input.next.remainingG <= NEAR_G) return { kind: 'milestoneNear', next: input.next, lastReached: last };
  if (input.plateau) return { kind: 'plateau' };
  return { kind: 'tip', index: dayNum(input.today) % Math.max(1, input.tipCount) };
}
