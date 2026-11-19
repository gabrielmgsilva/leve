// Registrar aplicação: valores sugeridos e o que acontece com a caneta (5.3, R2, R3).

import type { Site } from '@/db/queries';
import { dayNum } from '@/lib/dates';

import { canDeliver, dosesFrom, penStatus, type PenLike } from './pens';
import { MIN_GAP_DAYS } from './schedule';
import { suggestSite } from './sites';
import { titrationState, type PlanStep } from './titration';

type InjectionLike = { at: string; dose_mcg: number | null; site: Site | null; pen_id: number | null };

export type InjectionDefaults = {
  doseMcg: number;
  /** Próxima etapa do plano, quando as semanas previstas acabaram. Só sugestão. */
  suggestMcg: number | null;
  site: Site | null;
  penId: number | null;
  /** Semana na dose atual que esta aplicação completa, e as previstas. */
  weekAtDose: number;
  plannedWeeks: number | null;
};

/** Caneta para a dose: a aberta que entrega a dose; senão, a mais antiga do estoque que entrega. */
export function penForDose(pens: readonly PenLike[], doseMcg: number): PenLike | null {
  const usable = pens.filter((p) => penStatus(p) !== 'done' && canDeliver(p, doseMcg));
  const open = usable
    .filter((p) => penStatus(p) === 'open')
    .sort((a, b) => ((a.opened_on ?? '') < (b.opened_on ?? '') ? -1 : 1));
  if (open[0]) return open[0];
  return usable.filter((p) => penStatus(p) === 'stock').sort((a, b) => a.id - b.id)[0] ?? null;
}

/**
 * Valores iniciais do formulário: a dose atual (ou a fixa da caneta em uso, ou a primeira do plano),
 * o local sugerido pelo rodízio e a caneta que entrega essa dose. O app nunca troca a dose sozinho.
 */
export function injectionDefaults(input: {
  plan: readonly PlanStep[];
  injections: readonly InjectionLike[];
  pens: readonly PenLike[];
  sites: readonly Site[];
}): InjectionDefaults {
  const t = titrationState(input.plan, input.injections);
  const open = input.pens.find((p) => penStatus(p) === 'open' && p.dose_mcg !== null);
  const doseMcg = t.currentMcg ?? open?.dose_mcg ?? input.plan[0]?.mcg ?? 250;
  return {
    doseMcg,
    suggestMcg: t.suggestMcg,
    site: suggestSite(input.injections, input.sites),
    penId: penForDose(input.pens, doseMcg)?.id ?? null,
    weekAtDose: t.currentMcg === doseMcg ? t.weeksAtDose + 1 : 1,
    plannedWeeks: t.currentMcg === doseMcg ? t.plannedWeeks : (input.plan.find((s) => s.mcg === doseMcg)?.weeks ?? null),
  };
}

/** Doses oferecidas: as do plano e a atual, em ordem. */
export function doseChoices(plan: readonly PlanStep[], extra: readonly number[] = []): number[] {
  return [...new Set([...plan.map((s) => s.mcg), ...extra])].sort((a, b) => a - b);
}

export type PenOutcome = {
  /** A caneta abre com esta aplicação (estava no estoque). */
  opens: boolean;
  /** Depois desta, o resto não dá mais uma dose: a caneta é finalizada (R3). */
  finishes: boolean;
  dosesLeftAfter: number;
};

/** O que acontece com a caneta ao registrar a dose. */
export function penOutcome(pen: PenLike, usedBeforeMcg: number, doseMcg: number, nextDoseMcg: number): PenOutcome {
  const usedAfter = usedBeforeMcg + doseMcg;
  const dosesLeftAfter = dosesFrom(pen, usedAfter, nextDoseMcg);
  return { opens: pen.opened_on === null, finishes: dosesLeftAfter === 0, dosesLeftAfter };
}

/**
 * Registro (aplicação ou semana pulada) a menos de 3 dias da data escolhida, antes ou depois.
 * Serve para avisar de um provável registro repetido; o app nunca impede o registro.
 */
export function nearbyRecord<T extends Pick<InjectionLike, 'at'>>(injections: readonly T[], stamp: string): T | null {
  const d = dayNum(stamp.slice(0, 10));
  let best: T | null = null;
  let bestGap = MIN_GAP_DAYS;
  for (const i of injections) {
    const gap = Math.abs(dayNum(i.at.slice(0, 10)) - d);
    if (gap < bestGap || (gap === bestGap && best !== null && i.at > best.at)) {
      best = i;
      bestGap = gap;
    }
  }
  return best;
}

/**
 * Ao excluir uma aplicação, a caneta que ela abriu (aberta no mesmo dia e sem outra aplicação) volta
 * para o estoque: a abertura é a da primeira aplicação com a caneta (R3).
 */
export function penToClose<P extends PenLike>(pens: readonly P[], removed: InjectionLike, others: readonly InjectionLike[]): P | null {
  if (removed.pen_id === null) return null;
  const pen = pens.find((p) => p.id === removed.pen_id);
  if (!pen || pen.opened_on !== removed.at.slice(0, 10)) return null;
  return others.some((i) => i.pen_id === pen.id) ? null : pen;
}

/**
 * Data de abertura da caneta depois de registrar uma aplicação com ela no dia `day`: a abertura é a
 * da primeira aplicação (R3). Devolve null quando não muda.
 */
export function openingDay(pen: Pick<PenLike, 'opened_on'>, day: string): string | null {
  return pen.opened_on === null || day < pen.opened_on ? day : null;
}
