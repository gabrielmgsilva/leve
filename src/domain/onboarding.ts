// Primeiros passos: histórico retroativo de quem já começou o tratamento (5.1, H6).

import { dayNum, fromDayNum } from '@/lib/dates';

import { PLAN_TEMPLATES, type PlanStep } from './titration';

/** Uma fase informada no onboarding: dose e semanas; null = a fase atual, até hoje. */
export type PastPhase = { mcg: number; weeks: number | null };

/**
 * Aplicações semanais desde a primeira, fase por fase, até a véspera de hoje.
 * A fase atual (sem semanas) segue até hoje; a aplicação de hoje ela registra normalmente.
 */
export function retroactiveInjections(
  firstDay: string,
  phases: readonly PastPhase[],
  time: string,
  today: string,
): { at: string; dose_mcg: number }[] {
  const out: { at: string; dose_mcg: number }[] = [];
  const end = dayNum(today);
  let d = dayNum(firstDay);
  for (const ph of phases) {
    const count = ph.weeks ?? Number.POSITIVE_INFINITY;
    for (let k = 0; k < count && d < end; k++, d += 7) {
      out.push({ at: `${fromDayNum(d)} ${time}`, dose_mcg: ph.mcg });
    }
    if (d >= end) break;
  }
  return out;
}

/** Modelo de plano pela marca: Wegovy usa o dele; Ozivy, Ozempic e outras, o da semaglutida de 2 mg. */
export function planForBrand(brand: string): PlanStep[] {
  const id = brand === 'Wegovy' ? 'wegovy' : 'ozivy';
  return (PLAN_TEMPLATES.find((t) => t.id === id) ?? PLAN_TEMPLATES[0]).steps.map((s) => ({ ...s }));
}

/** Doses da marca para o onboarding. */
export function dosesForBrand(brand: string): number[] {
  return planForBrand(brand).map((s) => s.mcg);
}
