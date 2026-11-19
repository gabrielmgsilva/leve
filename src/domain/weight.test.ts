/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { dosePhases } from './phases';
import {
  bmi,
  bmiBand,
  dailyMeans,
  isPlateau,
  milestones,
  nextMilestone,
  phaseStats,
  ratePerWeek,
  slopePerWeek,
  trend,
  trendAt,
  treatmentWeek,
  weeklyChanges,
  type TrendPoint,
} from './weight';

const close = (actual: number | null, expected: number, tol = 1e-6) =>
  assert.ok(actual !== null && Math.abs(actual - expected) <= tol, `${actual} ≉ ${expected}`);

/** Pontos de tendência com t linear: t = base + slope·(dia − 1). */
const linear = (days: number[], base: number, slopePerDay: number): TrendPoint[] =>
  days.map((d) => {
    const day = `2026-11-${String(d).padStart(2, '0')}`;
    const t = base + slopePerDay * (d - 1);
    return { day, g: t, t };
  });

describe('dailyMeans', () => {
  test('várias pesagens no mesmo dia viram a média, em ordem de data', () => {
    const r = dailyMeans([
      { at: '2026-11-03 07:00', g: 80000 },
      { at: '2026-11-01 07:00', g: 81000 },
      { at: '2026-11-03 21:00', g: 80600 },
    ]);
    assert.deepEqual(r, [
      { day: '2026-11-01', g: 81000 },
      { day: '2026-11-03', g: 80300 },
    ]);
  });
});

describe('trend', () => {
  test('começa na primeira média e ajusta o peso ao intervalo em dias', () => {
    const r = trend([
      { day: '2026-11-01', g: 80000 },
      { day: '2026-11-02', g: 79000 },
      { day: '2026-11-04', g: 79000 },
    ]);
    assert.equal(r[0].t, 80000);
    close(r[1].t, 80000 + 0.15 * (79000 - 80000)); // 79850
    const a = 1 - 0.85 ** 2; // dois dias
    close(r[2].t, 79850 + a * (79000 - 79850));
  });

  test('trendAt usa o último ponto até o dia', () => {
    const r = trend([
      { day: '2026-11-01', g: 80000 },
      { day: '2026-11-05', g: 79000 },
    ]);
    assert.equal(trendAt(r, '2026-10-31'), null);
    assert.equal(trendAt(r, '2026-11-03'), 80000);
    assert.equal(trendAt(r, '2026-11-09'), r[1].t);
  });
});

describe('ritmo e platô', () => {
  test('inclinação em g por semana', () => {
    close(slopePerWeek(linear([1, 5, 9, 15], 80000, -100)), -700);
  });

  test('exige 4 dias espalhados em 14 dias ou mais', () => {
    assert.equal(slopePerWeek(linear([1, 5, 9], 80000, -100)), null);
    assert.equal(slopePerWeek(linear([1, 3, 6, 10], 80000, -100)), null);
  });

  test('ritmo só olha a janela até o dia final', () => {
    const pts = [...linear([1, 2, 3], 90000, 500), ...linear([10, 14, 18, 24, 28], 80000, -100)];
    close(ratePerWeek(pts, '2026-11-28', 21), -700);
  });

  test('platô: ritmo de 21 dias abaixo de 0,1 kg/semana', () => {
    assert.equal(isPlateau(linear([8, 12, 16, 20, 24, 28], 80000, -5), '2026-11-28'), true);
    assert.equal(isPlateau(linear([8, 12, 16, 20, 24, 28], 80000, -100), '2026-11-28'), false);
    assert.equal(isPlateau(linear([26, 27, 28], 80000, 0), '2026-11-28'), false);
  });
});

describe('fases de dose', () => {
  const injections = [
    { at: '2026-10-04 08:00', dose_mcg: 250 },
    { at: '2026-10-11 08:00', dose_mcg: 250 },
    { at: '2026-10-18 08:00', dose_mcg: 500 },
    { at: '2026-10-25 08:00', dose_mcg: null }, // semana pulada
    { at: '2026-11-01 08:00', dose_mcg: 500 },
  ];
  const daily = [
    ['2026-10-04', 86000],
    ['2026-10-09', 85500],
    ['2026-10-16', 85000],
    ['2026-10-20', 84800],
    ['2026-10-30', 84500],
    ['2026-11-05', 84100],
  ].map(([day, g]) => ({ day: day as string, g: g as number }));
  const pts = trend(daily);

  test('semana pulada não quebra a fase', () => {
    const phases = dosePhases(injections);
    assert.equal(phases.length, 2);
    assert.deepEqual(phases[1].days, ['2026-10-18', '2026-11-01']);
    assert.equal(phases[0].to, '2026-10-18');
  });

  test('as fases somam a variação do período', () => {
    const stats = phaseStats(dosePhases(injections), pts, { from: null, to: '2026-11-08' });
    assert.equal(stats.length, 2);
    assert.equal(stats[0].count, 2);
    assert.equal(stats[1].current, true);
    const sum = stats.reduce((s, x) => s + (x.changeG ?? 0), 0);
    close(sum, pts[pts.length - 1].t - pts[0].t);
  });

  test('o período recorta as fases', () => {
    const stats = phaseStats(dosePhases(injections), pts, { from: '2026-10-25', to: '2026-11-08' });
    assert.equal(stats.length, 1);
    assert.equal(stats[0].from, '2026-10-25');
    assert.equal(stats[0].count, 1);
    close(stats[0].changeG, pts[pts.length - 1].t - (trendAt(pts, '2026-10-24') as number));
  });
});

describe('semana a semana', () => {
  const pts = trend([
    { day: '2026-11-01', g: 80000 },
    { day: '2026-11-04', g: 79600 },
    { day: '2026-11-09', g: 79500 },
    { day: '2026-11-20', g: 79000 },
  ]);

  test('semanas somam a variação total; semana sem pesagem fica vazia', () => {
    const weeks = weeklyChanges(pts, '2026-11-01', '2026-11-20');
    assert.deepEqual(
      weeks.map((w) => [w.week, w.from, w.partial]),
      [
        [1, '2026-11-01', false],
        [2, '2026-11-08', false],
        [3, '2026-11-15', true],
      ],
    );
    const known = weeks.filter((w) => w.changeG !== null);
    close(
      known.reduce((s, w) => s + (w.changeG as number), 0),
      pts[pts.length - 1].t - pts[0].t,
    );
    const empty = weeklyChanges(pts, '2026-11-01', '2026-11-30');
    assert.equal(empty[3].changeG, null); // 22 a 28/11, sem pesagem
  });

  test('semana de tratamento', () => {
    assert.equal(treatmentWeek('2026-11-01', '2026-11-01'), 1);
    assert.equal(treatmentWeek('2026-11-01', '2026-11-07'), 1);
    assert.equal(treatmentWeek('2026-11-01', '2026-11-08'), 2);
    assert.equal(treatmentWeek('2026-11-01', '2026-10-31'), 0);
  });
});

describe('marcos', () => {
  const pts: TrendPoint[] = [
    { day: '2026-08-23', g: 86400, t: 86400 },
    { day: '2026-10-18', g: 82000, t: 82050 },
    { day: '2026-11-17', g: 79700, t: 80100 },
  ];

  test('%, a cada 5 kg e a meta, do maior alvo para o menor', () => {
    const list = milestones(86400, 70000, pts);
    assert.deepEqual(
      list.map((m) => [m.kind, m.value]),
      [
        ['pct', 5],
        ['kg', 5000],
        ['pct', 10],
        ['kg', 10000],
        ['pct', 15],
        ['kg', 15000],
        ['goal', 70000],
      ],
    );
    assert.equal(list[0].reachedOn, '2026-10-18'); // a tendência passou de 82,08 kg
    assert.equal(list[1].reachedOn, '2026-11-17'); // 81,4 kg
    assert.equal(list[2].reachedOn, null);
  });

  test('nada passa da meta e alvos iguais viram um só', () => {
    const list = milestones(86400, 80000, pts);
    assert.deepEqual(
      list.map((m) => m.kind),
      ['pct', 'kg', 'goal'],
    );
    const round = milestones(100000, null, []);
    assert.equal(round.filter((m) => Math.abs(m.targetG - 95000) < 1).length, 1);
    assert.equal(round.find((m) => Math.abs(m.targetG - 95000) < 1)?.kind, 'pct');
  });

  test('próximo marco: progresso desde o anterior e quanto falta pela última pesagem', () => {
    const list = milestones(86400, 70000, pts);
    const next = nextMilestone(list, 86400, 79700);
    assert.ok(next);
    assert.equal(next.milestone.kind, 'pct');
    assert.equal(next.milestone.value, 10);
    close(next.remainingG, 79700 - 77760);
    close(next.progress, (81400 - 79700) / (81400 - 77760));
  });
});

describe('IMC', () => {
  test('peso / altura² e faixa da OMS', () => {
    close(bmi(79700, 165), 29.274, 0.001);
    assert.equal(bmiBand(29.27), 'over');
    assert.equal(bmiBand(24.9), 'normal');
    assert.equal(bmiBand(30), 'obese1');
  });
});
