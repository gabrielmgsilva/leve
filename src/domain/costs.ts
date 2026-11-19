// Custos do tratamento (Futuro → implementado): o preço pago por caneta, opcional.

import { dayNum } from '@/lib/dates';

import { penStatus, type PenLike } from './pens';

type PricedPen = PenLike & { price_cents: number | null };

export type CostSummary = {
  /** Soma dos preços informados (canetas usadas e do estoque). */
  totalCents: number;
  pricedPens: number;
  unpricedPens: number;
  averageCents: number | null; // por caneta com preço
  /**
   * Gasto por mês com as canetas já abertas, desde a abertura da primeira caneta com preço;
   * null com menos de 4 semanas de dados.
   */
  perMonthCents: number | null;
};

const DAYS_PER_MONTH = 30.44;
const MIN_DAYS_FOR_MONTHLY = 28;

/**
 * Resumo dos gastos. A média mensal usa só as canetas já abertas (as do estoque ainda não foram
 * consumidas), contando desde a abertura da primeira delas: assim, canetas antigas sem preço não
 * diluem a conta.
 */
export function costSummary(pens: readonly PricedPen[], today: string): CostSummary | null {
  const priced = pens.filter((p) => p.price_cents !== null);
  if (!priced.length) return null;
  const totalCents = priced.reduce((s, p) => s + (p.price_cents as number), 0);
  const opened = priced.filter((p) => penStatus(p) !== 'stock' && p.opened_on !== null);
  const usedCents = opened.reduce((s, p) => s + (p.price_cents as number), 0);
  const since = opened.map((p) => p.opened_on as string).sort()[0];
  const days = since ? dayNum(today) - dayNum(since) + 1 : 0;
  return {
    totalCents,
    pricedPens: priced.length,
    unpricedPens: pens.length - priced.length,
    averageCents: Math.round(totalCents / priced.length),
    perMonthCents: days >= MIN_DAYS_FOR_MONTHLY && usedCents > 0 ? Math.round((usedCents / days) * DAYS_PER_MONTH) : null,
  };
}

/** "1.234,56" ou "R$ 1.234,56" → centavos; null se não for um valor. */
export function parseMoney(text: string): number | null {
  const t = text.replace(/R\$\s?/i, '').trim().replace(/\./g, '').replace(',', '.');
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(Number(t) * 100);
}
