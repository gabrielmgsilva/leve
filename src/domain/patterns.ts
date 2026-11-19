// Diário: padrões percebidos entre sintomas e aplicações (5.7, P1). Só descreve os registros dela;
// não interpreta nem recomenda nada.

import { dayNum } from '@/lib/dates';

type InjectionLike = { at: string; dose_mcg: number | null };
type JournalLike = { at: string; kind: string };

export type SymptomPattern =
  | {
      type: 'afterInjection';
      kind: string;
      /** Janela de dias depois da aplicação (0 = no dia). */
      fromDay: number;
      toDay: number;
      hits: number; // dias com o sintoma dentro da janela
      total: number; // dias com o sintoma até 6 dias depois de uma aplicação
    }
  | {
      type: 'doseIncrease';
      kind: string;
      hits: number; // dias com o sintoma nas semanas em que a dose subiu
      increaseWeeks: number;
      otherWeeks: number;
    };

const NOT_SYMPTOMS = new Set(['note', 'well']);
const MIN_HITS = 3;
const MIN_SHARE = 0.6;

/** Dias distintos com cada sintoma. */
function symptomDays(journal: readonly JournalLike[]): Map<string, number[]> {
  const out = new Map<string, Set<number>>();
  for (const j of journal) {
    if (NOT_SYMPTOMS.has(j.kind)) continue;
    const set = out.get(j.kind) ?? new Set<number>();
    set.add(dayNum(j.at.slice(0, 10)));
    out.set(j.kind, set);
  }
  return new Map([...out].map(([k, v]) => [k, [...v].sort((a, b) => a - b)]));
}

/** Semanas de aplicação (do dia da aplicação até 6 dias depois), marcando as que começam com subida de dose. */
function injectionWeeks(injections: readonly InjectionLike[]): { start: number; up: boolean }[] {
  const doses = injections.filter((i) => i.dose_mcg !== null).sort((a, b) => (a.at < b.at ? -1 : 1));
  return doses.map((inj, i) => ({
    start: dayNum(inj.at.slice(0, 10)),
    up: i > 0 && (inj.dose_mcg as number) > (doses[i - 1].dose_mcg as number),
  }));
}

/** Dias desde a última aplicação (0–6); null se não houve aplicação nos 6 dias anteriores. */
function daysAfter(weeks: readonly { start: number }[], day: number): number | null {
  let best: number | null = null;
  for (const w of weeks) {
    if (w.start > day) break;
    best = w.start;
  }
  if (best === null) return null;
  const d = day - best;
  return d <= 6 ? d : null;
}

/**
 * Padrões nos registros: (1) um sintoma que costuma aparecer num mesmo dia ou em dois dias seguidos
 * depois da aplicação (3 registros ou mais e 60 % ou mais deles na janela); (2) um sintoma que aparece
 * pelo menos o dobro de vezes nas semanas em que a dose subiu (3 registros ou mais nessas semanas e
 * 2 semanas ou mais sem subida para comparar). Do mais forte para o mais fraco.
 */
export function symptomPatterns(journal: readonly JournalLike[], injections: readonly InjectionLike[]): SymptomPattern[] {
  const weeks = injectionWeeks(injections);
  if (!weeks.length) return [];
  const out: { p: SymptomPattern; score: number }[] = [];

  for (const [kind, days] of symptomDays(journal)) {
    // (1) janela depois da aplicação
    const offsets = days.map((d) => daysAfter(weeks, d)).filter((d): d is number => d !== null);
    if (offsets.length >= MIN_HITS) {
      let best: { from: number; to: number; hits: number } | null = null;
      for (let from = 0; from <= 6; from++) {
        for (const width of [0, 1]) {
          const to = Math.min(6, from + width);
          const hits = offsets.filter((d) => d >= from && d <= to).length;
          // Prefere a janela mais estreita com o mesmo número de registros.
          if (!best || hits > best.hits || (hits === best.hits && to - from < best.to - best.from)) best = { from, to, hits };
        }
      }
      if (best && best.hits >= MIN_HITS && best.hits / offsets.length >= MIN_SHARE) {
        out.push({
          p: { type: 'afterInjection', kind, fromDay: best.from, toDay: best.to, hits: best.hits, total: offsets.length },
          score: best.hits / offsets.length,
        });
      }
    }

    // (2) semanas com subida de dose
    const upWeeks = weeks.filter((w, i) => w.up && (weeks[i + 1]?.start ?? Infinity) > w.start);
    const otherWeeks = weeks.filter((w) => !w.up);
    if (upWeeks.length && otherWeeks.length >= 2) {
      const inWeek = (w: { start: number }, d: number) => d >= w.start && d <= w.start + 6;
      const upHits = days.filter((d) => upWeeks.some((w) => inWeek(w, d))).length;
      const otherHits = days.filter((d) => otherWeeks.some((w) => inWeek(w, d)) && !upWeeks.some((w) => inWeek(w, d))).length;
      const upRate = upHits / upWeeks.length;
      const otherRate = otherHits / otherWeeks.length;
      if (upHits >= MIN_HITS && upRate >= 2 * otherRate) {
        out.push({
          p: { type: 'doseIncrease', kind, hits: upHits, increaseWeeks: upWeeks.length, otherWeeks: otherWeeks.length },
          score: otherRate === 0 ? 1 : Math.min(1, upRate / otherRate / 4),
        });
      }
    }
  }
  return out.sort((a, b) => b.score - a.score || (a.p.kind < b.p.kind ? -1 : 1)).map((x) => x.p);
}
