/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { costSummary, parseMoney } from './costs';
import { importableWeights } from './health';
import { measureStats, parseCm, waistHipRatio } from './measures';
import type { PenLike } from './pens';

describe('medidas', () => {
  test('lê centímetros com vírgula', () => {
    assert.equal(parseCm('90,5'), 905);
    assert.equal(parseCm(' 104 '), 1040);
    assert.equal(parseCm('9'), null); // menos de 10 cm
    assert.equal(parseCm('90,55'), null);
    assert.equal(parseCm('abc'), null);
  });

  test('primeira, última e variação de cada medida, na ordem fixa', () => {
    const stats = measureStats([
      { at: '2026-10-01 07:30', kind: 'hip', mm: 1100 },
      { at: '2026-10-01 07:30', kind: 'waist', mm: 980 },
      { at: '2026-11-01 07:30', kind: 'waist', mm: 950 },
      { at: '2026-11-01 07:40', kind: 'waist', mm: 945 },
      { at: '2026-11-15 07:30', kind: 'waist', mm: 930 },
    ]);
    assert.deepEqual(
      stats.map((s) => [s.kind, s.first.mm, s.latest.mm, s.changeMm, s.count]),
      [
        ['waist', 980, 930, -50, 4],
        ['hip', 1100, 1100, 0, 1],
      ],
    );
    assert.deepEqual(stats[0].series.map((p) => p.mm), [980, 945, 930]); // a última do dia
  });

  test('relação cintura/quadril da última medição com as duas', () => {
    const r = waistHipRatio([
      { at: '2026-10-01 07:30', kind: 'waist', mm: 980 },
      { at: '2026-10-01 07:30', kind: 'hip', mm: 1100 },
      { at: '2026-11-01 07:30', kind: 'waist', mm: 950 },
    ]);
    assert.ok(r);
    assert.equal(r.at, '2026-10-01 07:30');
    assert.equal(Math.round(r.ratio * 100), 89);
    assert.equal(waistHipRatio([{ at: '2026-10-01 07:30', kind: 'waist', mm: 980 }]), null);
  });
});

describe('custos', () => {
  const pen = (id: number, price: number | null, opened_on: string | null, done = 0): PenLike & { price_cents: number | null } => ({
    id,
    brand: 'Wegovy',
    total_mcg: 4000,
    dose_mcg: 1000,
    days_open: 42,
    opened_on,
    done,
    price_cents: price,
  });

  test('total, média por caneta e por mês de tratamento', () => {
    const s = costSummary(
      [pen(1, 100000, '2026-09-01', 1), pen(2, 120000, '2026-09-29'), pen(3, 110000, null), pen(4, null, null)],
      '2026-10-30',
    );
    assert.ok(s);
    assert.equal(s.totalCents, 330000);
    assert.equal(s.pricedPens, 3);
    assert.equal(s.unpricedPens, 1);
    assert.equal(s.averageCents, 110000);
    // 2.200,00 em 60 dias → cerca de 1.115,73 por mês (só as abertas)
    assert.equal(s.perMonthCents, Math.round((220000 / 60) * 30.44));
  });

  test('sem preço não há resumo; menos de 4 semanas não tem média mensal', () => {
    assert.equal(costSummary([pen(1, null, null)], '2026-11-19'), null);
    const s = costSummary([pen(1, 100000, '2026-11-10')], '2026-11-19');
    assert.equal(s?.perMonthCents, null);
  });

  test('canetas antigas sem preço não diluem a média mensal', () => {
    // Tratamento desde setembro, mas só a caneta aberta em 18/11 tem preço.
    const s = costSummary([pen(1, null, '2026-09-20', 1), pen(2, 109990, '2026-11-18')], '2026-11-19');
    assert.equal(s?.perMonthCents, null);
    assert.equal(s?.averageCents, 109990);
  });

  test('lê valores em reais', () => {
    assert.equal(parseMoney('989,90'), 98990);
    assert.equal(parseMoney('R$ 1.299,00'), 129900);
    assert.equal(parseMoney('1299'), 129900);
    assert.equal(parseMoney('12,345'), null);
    assert.equal(parseMoney(''), null);
  });
});

describe('Health Connect', () => {
  test('converte para hora local e gramas, sem repetir', () => {
    const local = (iso: string) => {
      const d = new Date(iso);
      const p = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    };
    const at = local('2026-11-18T10:05:00Z');
    const out = importableWeights(
      [
        { time: '2026-11-18T10:05:00Z', kg: 79.7 }, // já está no app
        { time: '2026-11-19T10:02:30Z', kg: 79.45 },
        { time: '2026-11-19T10:02:40Z', kg: 79.46 }, // mesma pesagem enviada duas vezes
        { time: '2026-11-19T11:00:00Z', kg: 12 }, // fora da faixa
        { time: 'ontem', kg: 80 },
        { time: '2026-11-20T10:00:00Z', kg: 79.3 }, // ela digitou 79,3 dez minutos depois
        { time: '2026-11-20T18:00:00Z', kg: 79.9 }, // outra pesagem no mesmo dia
      ],
      [
        { at, g: 79700 },
        { at: local('2026-11-20T10:10:00Z'), g: 79300 },
      ],
    );
    assert.deepEqual(out, [
      { at: local('2026-11-19T10:02:30Z'), g: 79450 },
      { at: local('2026-11-20T18:00:00Z'), g: 79900 },
    ]);
  });
});
