// Plano de doses (escalonamento), independente da marca (R2). O app só sugere; nunca muda a dose sozinho.

import type { InjectionLike } from './phases';

/** `weeks` null = manutenção (sem prazo). */
export type PlanStep = { mcg: number; weeks: number | null };

export const PLAN_TEMPLATES: { id: 'wegovy' | 'ozivy'; label: string; steps: PlanStep[] }[] = [
  {
    id: 'wegovy',
    label: 'Wegovy',
    steps: [
      { mcg: 250, weeks: 4 },
      { mcg: 500, weeks: 4 },
      { mcg: 1000, weeks: 4 },
      { mcg: 1700, weeks: 4 },
      { mcg: 2400, weeks: null },
    ],
  },
  {
    id: 'ozivy',
    label: 'Ozivy ou Ozempic',
    steps: [
      { mcg: 250, weeks: 4 },
      { mcg: 500, weeks: 4 },
      { mcg: 1000, weeks: 4 },
      { mcg: 2000, weeks: null },
    ],
  },
];

/** Posição da dose na escala de cores: a etapa no plano ou, fora dele, onde ela entraria. */
export function doseRank(mcg: number, plan: readonly PlanStep[]): number {
  const i = plan.findIndex((s) => s.mcg === mcg);
  return i >= 0 ? i : plan.filter((s) => s.mcg < mcg).length;
}

/** Doses oferecidas no editor do plano. */
export const PLAN_DOSES = [250, 500, 1000, 1700, 2000, 2400, 7200];

export type StepStatus = 'done' | 'current' | 'next';

export type StepView = {
  mcg: number;
  plannedWeeks: number | null;
  status: StepStatus;
  inPlan: boolean; // false = dose fora do plano, em uso agora
  count: number; // aplicações nessa dose
  first: string | null; // dia da primeira
  last: string | null; // dia da última
};

export type TitrationState = {
  steps: StepView[];
  currentMcg: number | null; // dose da última aplicação
  /** Aplicações seguidas na dose atual (semanas puladas não interrompem). */
  weeksAtDose: number;
  runStart: string | null; // dia da primeira aplicação dessa sequência
  plannedWeeks: number | null; // semanas previstas para a dose atual
  /** Próxima dose do plano quando as semanas previstas acabaram. Só sugestão. */
  suggestMcg: number | null;
};

export function titrationState(plan: readonly PlanStep[], injections: readonly InjectionLike[]): TitrationState {
  const doses = injections
    .filter((i): i is { at: string; dose_mcg: number } => i.dose_mcg !== null)
    .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  const currentMcg = doses.length ? doses[doses.length - 1].dose_mcg : null;

  let weeksAtDose = 0;
  let runStart: string | null = null;
  for (let i = doses.length - 1; i >= 0 && doses[i].dose_mcg === currentMcg; i--) {
    weeksAtDose += 1;
    runStart = doses[i].at.slice(0, 10);
  }

  const history = (mcg: number) => {
    const at = doses.filter((d) => d.dose_mcg === mcg).map((d) => d.at.slice(0, 10));
    return { count: at.length, first: at[0] ?? null, last: at[at.length - 1] ?? null };
  };

  const currentIndex = currentMcg === null ? -1 : plan.findIndex((s) => s.mcg === currentMcg);
  const steps: StepView[] = plan.map((s, i) => {
    let status: StepStatus = 'next';
    if (currentIndex >= 0) status = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'next';
    else if (currentMcg !== null) status = s.mcg < currentMcg ? 'done' : 'next';
    return { mcg: s.mcg, plannedWeeks: s.weeks, status, inPlan: true, ...history(s.mcg) };
  });

  // Dose fora do plano: entra como etapa atual na posição pela dose.
  if (currentMcg !== null && currentIndex < 0) {
    const at = steps.findIndex((s) => s.mcg > currentMcg);
    const off: StepView = { mcg: currentMcg, plannedWeeks: null, status: 'current', inPlan: false, ...history(currentMcg) };
    steps.splice(at < 0 ? steps.length : at, 0, off);
  }

  const plannedWeeks = currentIndex >= 0 ? plan[currentIndex].weeks : null;
  const next = currentIndex >= 0 ? plan[currentIndex + 1] : undefined;
  const suggestMcg = next && plannedWeeks !== null && weeksAtDose >= plannedWeeks ? next.mcg : null;

  return { steps, currentMcg, weeksAtDose, runStart, plannedWeeks, suggestMcg };
}
