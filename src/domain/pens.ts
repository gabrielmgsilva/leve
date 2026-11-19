// Canetas: catálogo, restante, doses, validade depois de aberta, avisos e cobertura do estoque (R3).

import { daysBetween, shiftDay } from '@/lib/dates';

export type PenModel = {
  brand: string;
  model: string; // nome do modelo na embalagem
  totalMcg: number;
  doseMcg: number | null; // null = dose ajustável
  /** Doses possíveis numa caneta ajustável. */
  doses?: number[];
};

/** Catálogo no código, editável no cadastro. Confira sempre na embalagem e na bula. */
export const PEN_CATALOG: PenModel[] = [
  { brand: 'Wegovy', model: '0,25 mg', totalMcg: 1000, doseMcg: 250 },
  { brand: 'Wegovy', model: '0,5 mg', totalMcg: 2000, doseMcg: 500 },
  { brand: 'Wegovy', model: '1 mg', totalMcg: 4000, doseMcg: 1000 },
  { brand: 'Wegovy', model: '1,7 mg', totalMcg: 6800, doseMcg: 1700 },
  { brand: 'Wegovy', model: '2,4 mg', totalMcg: 9600, doseMcg: 2400 },
  { brand: 'Ozivy', model: '0,25/0,5 mg', totalMcg: 2000, doseMcg: null, doses: [250, 500] },
  { brand: 'Ozivy', model: '1 mg', totalMcg: 4000, doseMcg: 1000 },
  { brand: 'Ozempic', model: '0,25/0,5 mg', totalMcg: 2000, doseMcg: null, doses: [250, 500] },
  { brand: 'Ozempic', model: '1 mg', totalMcg: 4000, doseMcg: 1000 },
  { brand: 'Ozempic', model: '2 mg', totalMcg: 8000, doseMcg: 2000 },
];

export const DEFAULT_DAYS_OPEN = 42;
export const EXPIRY_WARNING_DAYS = 7;

export type PenLike = {
  id: number;
  brand: string;
  total_mcg: number;
  dose_mcg: number | null;
  days_open: number;
  opened_on: string | null;
  done: number;
};

export type PenStatus = 'stock' | 'open' | 'done';

/** Fechada = no estoque; aberta e não finalizada = em uso. */
export function penStatus(pen: PenLike): PenStatus {
  if (pen.done) return 'done';
  return pen.opened_on ? 'open' : 'stock';
}

export function findModel(pen: Pick<PenLike, 'brand' | 'total_mcg' | 'dose_mcg'>): PenModel | undefined {
  return PEN_CATALOG.find((m) => m.brand === pen.brand && m.totalMcg === pen.total_mcg && m.doseMcg === pen.dose_mcg);
}

/** A caneta entrega essa dose? Dose fixa só a dela; ajustável, as do modelo (ou qualquer uma, se fora do catálogo). */
export function canDeliver(pen: PenLike, doseMcg: number): boolean {
  if (pen.dose_mcg !== null) return pen.dose_mcg === doseMcg;
  const doses = findModel(pen)?.doses;
  return doses ? doses.includes(doseMcg) : true;
}

/** Doses inteiras que ainda saem da caneta nessa dose. */
export function dosesFrom(pen: PenLike, usedMcg: number, doseMcg: number): number {
  if (doseMcg <= 0 || !canDeliver(pen, doseMcg)) return 0;
  return Math.max(0, Math.floor((pen.total_mcg - usedMcg) / doseMcg));
}

export type PenState = {
  usedMcg: number;
  leftMcg: number;
  /** Doses restantes na dose da próxima aplicação. */
  dosesLeft: number;
  useBy: string | null; // abertura + validade depois de aberta
  daysToExpiry: number | null;
  /** A próxima aplicação usa a última dose. */
  lastDose: boolean;
  expiringSoon: boolean; // vence em 7 dias ou menos
  expired: boolean;
};

export function penState(pen: PenLike, usedMcg: number, nextDoseMcg: number, today: string): PenState {
  const leftMcg = Math.max(0, pen.total_mcg - usedMcg);
  const dosesLeft = dosesFrom(pen, usedMcg, nextDoseMcg);
  const useBy = pen.opened_on ? shiftDay(pen.opened_on, pen.days_open) : null;
  const daysToExpiry = useBy ? daysBetween(today, useBy) : null;
  return {
    usedMcg,
    leftMcg,
    dosesLeft,
    useBy,
    daysToExpiry,
    lastDose: dosesLeft === 1,
    expiringSoon: daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry <= EXPIRY_WARNING_DAYS,
    expired: daysToExpiry !== null && daysToExpiry < 0,
  };
}

/** Dose da próxima aplicação com essa caneta: a fixa dela ou a dose atual do tratamento. */
export function nextDoseFor(pen: PenLike, currentMcg: number | null): number | null {
  return pen.dose_mcg ?? currentMcg;
}

/** Último dia coberto pelas doses disponíveis, uma por semana a partir da próxima prevista. */
export function coverageUntil(nextDueDay: string, dosesAvailable: number): string | null {
  return dosesAvailable > 0 ? shiftDay(nextDueDay, 7 * (dosesAvailable - 1)) : null;
}

/** Hora de comprar: o estoque não tem doses para a dose atual e a caneta em uso tem 1 dose ou menos. */
export function needsPurchase(dosesLeftInUse: number, stockDoses: number): boolean {
  return stockDoses === 0 && dosesLeftInUse <= 1;
}

/** Soma das doses aplicadas com cada caneta. */
export function usedMcgByPen(injections: readonly { pen_id: number | null; dose_mcg: number | null }[]): Map<number, number> {
  const used = new Map<number, number>();
  for (const i of injections) {
    if (i.pen_id === null || i.dose_mcg === null) continue;
    used.set(i.pen_id, (used.get(i.pen_id) ?? 0) + i.dose_mcg);
  }
  return used;
}

/** Número de cada caneta na ordem de cadastro ("caneta 4"). */
export function penNumbers(pens: readonly { id: number }[]): Map<number, number> {
  return new Map([...pens].sort((a, b) => a.id - b.id).map((p, i) => [p.id, i + 1]));
}

export type PenOverview = {
  /** A caneta aberta mais antiga ainda não finalizada. */
  inUse: PenLike | null;
  inUseState: PenState | null;
  stock: PenLike[];
  /** Doses do estoque na dose atual. */
  stockDoses: number;
  nextDoseMcg: number | null;
  coverage: string | null; // último dia coberto (em uso + estoque)
  buy: boolean; // hora de comprar
};

/** Resumo do card "Caneta em uso" (R3). */
export function penOverview(
  pens: readonly PenLike[],
  used: ReadonlyMap<number, number>,
  currentMcg: number | null,
  nextDueDay: string,
  today: string,
): PenOverview {
  const open = pens.filter((p) => penStatus(p) === 'open').sort((a, b) => ((a.opened_on ?? '') < (b.opened_on ?? '') ? -1 : 1));
  const inUse = open[0] ?? null;
  const stock = pens.filter((p) => penStatus(p) === 'stock');
  const nextDoseMcg = inUse ? nextDoseFor(inUse, currentMcg) : currentMcg;
  const inUseState = inUse && nextDoseMcg !== null ? penState(inUse, used.get(inUse.id) ?? 0, nextDoseMcg, today) : null;
  const stockDoses = nextDoseMcg === null ? 0 : stock.reduce((s, p) => s + dosesFrom(p, 0, nextDoseMcg), 0);
  const inUseDoses = inUseState?.dosesLeft ?? 0;
  return {
    inUse,
    inUseState,
    stock,
    stockDoses,
    nextDoseMcg,
    coverage: coverageUntil(nextDueDay, inUseDoses + stockDoses),
    buy: inUse !== null && nextDoseMcg !== null && needsPurchase(inUseDoses, stockDoses),
  };
}
