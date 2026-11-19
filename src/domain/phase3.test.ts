/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { symptomPatterns } from './patterns';
import { reminderPlan, snoozeAt } from './reminders';
import { nextDue } from './schedule';
import { backupDueDay, backupOverdue, todayAlert } from './today';
import { dailyMeans, goalProjection, trend } from './weight';

const series = (from: string, days: number, startG: number, perDayG: number) => {
  const base = new Date(`${from}T08:00:00`);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { at: `${day} 08:00`, g: Math.round(startG + perDayG * i) };
  });
};

describe('goalProjection', () => {
  test('ritmo de −0,7 kg/semana projeta a meta', () => {
    const points = trend(dailyMeans(series('2026-10-01', 50, 90000, -100)));
    const p = goalProjection(points, 80000, '2026-11-19');
    assert.ok(p);
    assert.ok(p.rateG < -600 && p.rateG > -800);
    assert.ok(p.day > '2026-11-19' && p.day < '2027-03-01');
  });
  test('sem meta, meta alcançada ou ritmo lento não projeta', () => {
    const points = trend(dailyMeans(series('2026-10-01', 50, 90000, -100)));
    assert.equal(goalProjection(points, null, '2026-11-19'), null);
    assert.equal(goalProjection(points, 95000, '2026-11-19'), null);
    const slow = trend(dailyMeans(series('2026-10-01', 50, 90000, -10)));
    assert.equal(goalProjection(slow, 80000, '2026-11-19'), null);
  });
  test('esconde projeção além de 18 meses', () => {
    const points = trend(dailyMeans(series('2026-10-01', 50, 90000, -20)));
    assert.equal(goalProjection(points, 30000, '2026-11-19'), null);
  });
});

describe('symptomPatterns', () => {
  const weekly = (from: string, n: number, doses: number[]) =>
    Array.from({ length: n }, (_, i) => {
      const d = new Date(`${from}T08:00:00`);
      d.setDate(d.getDate() + 7 * i);
      const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { at: `${day} 08:00`, dose_mcg: doses[i] ?? doses[doses.length - 1] };
    });
  const plus = (at: string, days: number) => {
    const d = new Date(`${at.slice(0, 10)}T08:00:00`);
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} 20:00`;
  };

  test('náusea 1 a 2 dias depois da aplicação', () => {
    const inj = weekly('2026-09-06', 8, [250]);
    const journal = [
      { at: plus(inj[0].at, 1), kind: 'nausea' },
      { at: plus(inj[1].at, 2), kind: 'nausea' },
      { at: plus(inj[2].at, 1), kind: 'nausea' },
      { at: plus(inj[4].at, 1), kind: 'nausea' },
      { at: plus(inj[5].at, 5), kind: 'nausea' },
    ];
    const [p] = symptomPatterns(journal, inj);
    assert.equal(p.type, 'afterInjection');
    assert.equal(p.kind, 'nausea');
    if (p.type === 'afterInjection') {
      assert.deepEqual([p.fromDay, p.toDay, p.hits, p.total], [1, 2, 4, 5]);
    }
  });

  test('sintoma espalhado na semana não vira padrão', () => {
    const inj = weekly('2026-09-06', 8, [250]);
    const journal = [0, 1, 2, 3, 4, 5, 6].map((d, i) => ({ at: plus(inj[i].at, d), kind: 'fatigue' }));
    assert.deepEqual(
      symptomPatterns(journal, inj).filter((p) => p.type === 'afterInjection'),
      [],
    );
  });

  test('mais náusea nas semanas em que a dose sobe', () => {
    const inj = weekly('2026-09-06', 12, [250, 250, 250, 250, 500, 500, 500, 500, 1000, 1000, 1000, 1000]);
    const journal = [
      { at: plus(inj[4].at, 3), kind: 'nausea' },
      { at: plus(inj[4].at, 5), kind: 'nausea' },
      { at: plus(inj[8].at, 4), kind: 'nausea' },
      { at: plus(inj[8].at, 6), kind: 'nausea' },
      { at: plus(inj[1].at, 3), kind: 'nausea' },
    ];
    const up = symptomPatterns(journal, inj).find((p) => p.type === 'doseIncrease');
    assert.ok(up);
    if (up?.type === 'doseIncrease') assert.deepEqual([up.hits, up.increaseWeeks, up.otherWeeks], [4, 2, 10]);
  });

  test('ignora notas, "bem" e diário sem aplicações', () => {
    const journal = [1, 2, 3, 4].map((d) => ({ at: `2026-11-0${d} 08:00`, kind: 'note' }));
    assert.deepEqual(symptomPatterns(journal, weekly('2026-10-25', 3, [250])), []);
    assert.deepEqual(symptomPatterns([{ at: '2026-11-01 08:00', kind: 'nausea' }], []), []);
  });
});

describe('backup', () => {
  test('em dia, atrasado e nunca feito', () => {
    assert.equal(backupOverdue('2026-11-01 10:00', '2026-09-01', '2026-11-19'), null);
    assert.deepEqual(backupOverdue('2026-10-01 10:00', '2026-09-01', '2026-11-19'), { daysSince: 49 });
    assert.deepEqual(backupOverdue(null, '2026-09-01', '2026-11-19'), { daysSince: null });
    assert.equal(backupOverdue(null, '2026-11-10', '2026-11-19'), null);
    assert.equal(backupOverdue(null, null, '2026-11-19'), null);
  });
  test('dia do próximo backup', () => {
    assert.equal(backupDueDay('2026-11-01 10:00', '2026-09-01'), '2026-12-01');
    assert.equal(backupDueDay(null, '2026-11-10'), '2026-12-10');
    assert.equal(backupDueDay(null, null), null);
  });
  test('aviso da Hoje: depois de caneta e marco recente, antes do marco próximo', () => {
    const base = { buy: false, milestones: [], next: null, plateau: true, today: '2026-11-19', tipCount: 3 };
    assert.deepEqual(todayAlert({ ...base, backup: { daysSince: 40 } }), { kind: 'backup', daysSince: 40 });
    assert.deepEqual(todayAlert({ ...base, buy: true, backup: { daysSince: 40 } }), { kind: 'buy' });
    assert.deepEqual(todayAlert({ ...base, backup: null }), { kind: 'plateau' });
  });
  test('lembrete de backup no dia em que vence', () => {
    const plan = reminderPlan({
      next: nextDue('2026-11-15', 0, '2026-11-19'),
      time: '08:00',
      followUpHours: 3,
      now: '2026-11-19 09:00',
      injection: false,
      pen: false,
      lastDose: false,
      useBy: null,
      backupDue: '2026-12-01',
    });
    assert.deepEqual(plan, [{ id: 'backup-2026-12-01', kind: 'backup', at: '2026-12-01 08:00' }]);
  });
});

describe('snoozeAt', () => {
  test('uma hora depois, virando o dia', () => {
    assert.equal(snoozeAt('2026-11-19 08:30'), '2026-11-19 09:30');
    assert.equal(snoozeAt('2026-11-19 23:40'), '2026-11-20 00:40');
  });
});
