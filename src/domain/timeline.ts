// Linha do tempo do Diário: aplicações, pesagens, sintomas e notas agrupados por semana de tratamento (5.7, R6).

import type { InjectionRow, JournalRow, WeightRow } from '@/db/queries';
import { dayNum, daysBetween, fromDayNum } from '@/lib/dates';

import { doseOn, dosePhases } from './phases';
import { treatmentWeek, type WeekChange } from './weight';

export type InjectionItem = {
  kind: 'injection';
  at: string;
  injection: InjectionRow;
  firstEver: boolean;
  firstOfDose: boolean; // começo de uma fase de dose
  doseUp: boolean;
  opensPen: boolean; // primeira aplicação com essa caneta
};

export type WeightItem = {
  kind: 'weight';
  at: string;
  weight: WeightRow; // a pesagem mais recente da semana
  othersInWeek: number;
  lowest: boolean; // a menor até então
};

export type JournalItem = {
  kind: 'journal';
  at: string;
  entries: JournalRow[]; // sintomas do mesmo instante juntos; nota sozinha
  daysAfter: number | null; // dias desde a última aplicação
  afterDoseUpMcg: number | null; // a última aplicação foi uma subida para essa dose
};

export type TimelineItem = InjectionItem | WeightItem | JournalItem;

export type TimelineWeek = {
  key: string;
  /** Semana de tratamento; null = antes da primeira aplicação ou sem aplicações. */
  week: number | null;
  from: string;
  to: string;
  mcg: number | null; // dose em vigor no fim da semana
  changeG: number | null; // variação da tendência (só semanas completas)
  items: TimelineItem[]; // mais recentes primeiro
};

const byAt = <T extends { at: string }>(a: T, b: T) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0);

export function buildTimeline(input: {
  injections: readonly InjectionRow[];
  weights: readonly WeightRow[];
  journal: readonly JournalRow[];
  weekChanges: readonly WeekChange[];
  today: string;
}): TimelineWeek[] {
  const { today } = input;
  const injections = [...input.injections].sort(byAt);
  const doses = injections.filter((i) => i.dose_mcg !== null);
  const phases = dosePhases(injections);
  const anchor = doses.length ? doses[0].at.slice(0, 10) : null;

  // Semana de cada dia: de tratamento (com aplicações) ou blocos de 7 dias até hoje (sem aplicações).
  const weekOf = (day: string): { key: string; week: number | null; from: string; to: string } => {
    if (anchor) {
      const n = treatmentWeek(anchor, day);
      if (n >= 1) {
        const from = fromDayNum(dayNum(anchor) + 7 * (n - 1));
        return { key: `w${n}`, week: n, from, to: fromDayNum(dayNum(from) + 6) };
      }
      return { key: 'before', week: null, from: day, to: fromDayNum(dayNum(anchor) - 1) };
    }
    const k = Math.floor(daysBetween(day, today) / 7);
    const to = fromDayNum(dayNum(today) - 7 * k);
    return { key: `b${k}`, week: null, from: fromDayNum(dayNum(to) - 6), to };
  };

  const items: TimelineItem[] = [];

  // Aplicações
  const seenPens = new Set<number>();
  let prevDose: number | null = null;
  injections.forEach((inj) => {
    const opensPen = inj.pen_id !== null && !seenPens.has(inj.pen_id);
    if (inj.pen_id !== null) seenPens.add(inj.pen_id);
    const isDose = inj.dose_mcg !== null;
    const firstOfDose = isDose && inj.dose_mcg !== prevDose;
    items.push({
      kind: 'injection',
      at: inj.at,
      injection: inj,
      firstEver: isDose && prevDose === null,
      firstOfDose,
      doseUp: firstOfDose && prevDose !== null && (inj.dose_mcg as number) > prevDose,
      opensPen: isDose && opensPen,
    });
    if (isDose) prevDose = inj.dose_mcg;
  });

  // Pesagens: uma linha por semana, a mais recente.
  const weights = [...input.weights].sort(byAt);
  const lastByWeek = new Map<string, { w: WeightRow; n: number; lowest: boolean }>();
  let minSoFar = Infinity;
  weights.forEach((w, i) => {
    const lowest = i > 0 && w.g <= minSoFar;
    minSoFar = Math.min(minSoFar, w.g);
    const { key } = weekOf(w.at.slice(0, 10));
    const cur = lastByWeek.get(key);
    lastByWeek.set(key, { w, n: (cur?.n ?? 0) + 1, lowest });
  });
  for (const { w, n, lowest } of lastByWeek.values()) {
    items.push({ kind: 'weight', at: w.at, weight: w, othersInWeek: n - 1, lowest });
  }

  // Sintomas e notas
  const journal = [...input.journal].sort(byAt);
  const groups: JournalRow[][] = [];
  for (const e of journal) {
    const last = groups[groups.length - 1];
    if (e.kind !== 'note' && last && last[0].kind !== 'note' && last[0].at === e.at) last.push(e);
    else groups.push([e]);
  }
  for (const entries of groups) {
    const at = entries[0].at;
    const before = items.filter(
      (it): it is InjectionItem => it.kind === 'injection' && it.injection.dose_mcg !== null && it.at <= at,
    );
    const lastInj = before[before.length - 1];
    items.push({
      kind: 'journal',
      at,
      entries,
      daysAfter: lastInj ? daysBetween(lastInj.at, at) : null,
      afterDoseUpMcg: lastInj?.doseUp ? lastInj.injection.dose_mcg : null,
    });
  }

  // Agrupa por semana, mais recentes primeiro.
  const changes = new Map(input.weekChanges.map((w) => [w.week, w]));
  const weeks = new Map<string, TimelineWeek>();
  for (const it of items.sort(byAt).reverse()) {
    const wk = weekOf(it.at.slice(0, 10));
    let group = weeks.get(wk.key);
    if (!group) {
      const end = wk.to < today ? wk.to : today;
      const change = wk.week !== null ? changes.get(wk.week) : undefined;
      group = {
        key: wk.key,
        week: wk.week,
        from: wk.from,
        to: wk.to,
        mcg: wk.week !== null ? doseOn(phases, end) : null,
        changeG: change && !change.partial ? change.changeG : null,
        items: [],
      };
      weeks.set(wk.key, group);
    }
    if (wk.key === 'before' && wk.from < group.from) group.from = wk.from;
    group.items.push(it);
  }
  return [...weeks.values()].sort((a, b) => (a.to < b.to ? 1 : a.to > b.to ? -1 : 0));
}
