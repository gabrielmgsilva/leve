/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  canDeliver,
  coverageUntil,
  dosesFrom,
  needsPurchase,
  penNumbers,
  penOverview,
  penState,
  penStatus,
  usedMcgByPen,
  type PenLike,
} from './pens';

const pen = (p: Partial<PenLike>): PenLike => ({
  id: 1,
  brand: 'Wegovy',
  total_mcg: 4000,
  dose_mcg: 1000,
  days_open: 42,
  opened_on: null,
  done: 0,
  ...p,
});

describe('canetas', () => {
  test('estado pela abertura e pela finalização', () => {
    assert.equal(penStatus(pen({})), 'stock');
    assert.equal(penStatus(pen({ opened_on: '2026-11-01' })), 'open');
    assert.equal(penStatus(pen({ opened_on: '2026-11-01', done: 1 })), 'done');
  });

  test('restante, doses, usar até e última dose', () => {
    const s = penState(pen({ opened_on: '2026-11-01' }), 3000, 1000, '2026-11-18');
    assert.equal(s.leftMcg, 1000);
    assert.equal(s.dosesLeft, 1);
    assert.equal(s.lastDose, true);
    assert.equal(s.useBy, '2026-12-13');
    assert.equal(s.daysToExpiry, 25);
    assert.equal(s.expiringSoon, false);
  });

  test('aviso de vencimento com 7 dias ou menos', () => {
    const s = penState(pen({ opened_on: '2026-11-01' }), 1000, 1000, '2026-12-08');
    assert.equal(s.daysToExpiry, 5);
    assert.equal(s.expiringSoon, true);
    assert.equal(penState(pen({ opened_on: '2026-11-01' }), 1000, 1000, '2026-12-14').expired, true);
  });

  test('dose fixa só entrega a própria dose; ajustável, as do modelo', () => {
    const ozivy = pen({ brand: 'Ozivy', total_mcg: 2000, dose_mcg: null });
    assert.equal(canDeliver(ozivy, 500), true);
    assert.equal(canDeliver(ozivy, 1000), false);
    assert.equal(canDeliver(pen({ dose_mcg: 500, total_mcg: 2000 }), 1000), false);
    assert.equal(canDeliver(pen({ brand: 'Outra', total_mcg: 5000, dose_mcg: null }), 1000), true);
    assert.equal(dosesFrom(ozivy, 1000, 500), 2);
    assert.equal(dosesFrom(ozivy, 1000, 1000), 0);
  });

  test('cobertura do estoque e hora de comprar', () => {
    assert.equal(coverageUntil('2026-11-22', 5), '2026-12-20');
    assert.equal(coverageUntil('2026-11-22', 0), null);
    assert.equal(needsPurchase(1, 0), true);
    assert.equal(needsPurchase(1, 4), false);
    assert.equal(needsPurchase(2, 0), false);
  });
});

describe('resumo das canetas', () => {
  test('caneta em uso, estoque e até quando as doses cobrem', () => {
    const pens: PenLike[] = [
      pen({ id: 1, total_mcg: 2000, dose_mcg: 500, opened_on: '2026-10-04', done: 1 }),
      pen({ id: 4, opened_on: '2026-11-01' }), // Wegovy 1 mg, 3 doses usadas
      pen({ id: 5, brand: 'Ozivy' }), // Ozivy 1 mg fechada
      pen({ id: 6, brand: 'Ozivy', total_mcg: 2000, dose_mcg: null }), // 0,25/0,5: não serve para 1 mg
    ];
    const o = penOverview(pens, new Map([[4, 3000]]), 1000, '2026-11-22', '2026-11-18');
    assert.equal(o.inUse?.id, 4);
    assert.equal(o.inUseState?.dosesLeft, 1);
    assert.equal(o.stock.length, 2);
    assert.equal(o.stockDoses, 4);
    assert.equal(o.coverage, '2026-12-20');
    assert.equal(o.buy, false);
    const empty = penOverview(pens.slice(0, 2), new Map([[4, 3000]]), 1000, '2026-11-22', '2026-11-18');
    assert.equal(empty.buy, true);
  });

  test('usado por caneta e numeração', () => {
    const used = usedMcgByPen([
      { pen_id: 4, dose_mcg: 1000 },
      { pen_id: 4, dose_mcg: 1000 },
      { pen_id: null, dose_mcg: 500 },
      { pen_id: 4, dose_mcg: null },
    ]);
    assert.equal(used.get(4), 2000);
    assert.deepEqual([...penNumbers([{ id: 9 }, { id: 2 }, { id: 5 }]).entries()], [[2, 1], [5, 2], [9, 3]]);
  });
});
