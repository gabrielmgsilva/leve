/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { Site } from '@/db/queries';

import { doseChoices, injectionDefaults, nearbyRecord, openingDay, penForDose, penOutcome, penToClose } from './injection';
import { planForBrand, retroactiveInjections } from './onboarding';
import type { PenLike } from './pens';
import { reminderPlan } from './reminders';
import { nextDue } from './schedule';
import { goalProgress, todayAlert, weekStrip, weekTrendChange } from './today';
import { PLAN_TEMPLATES } from './titration';
import { milestones, nextMilestone, parseWeight, trend, weighingChange, type TrendPoint } from './weight';

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
const SITES: Site[] = ['AE', 'AD', 'CE', 'CD'];
const WEGOVY = PLAN_TEMPLATES[0].steps;

describe('registrar aplicação', () => {
  const injections = [
    { at: '2026-11-01 08:00', dose_mcg: 1000, site: 'CE' as Site, pen_id: 4 },
    { at: '2026-11-08 08:00', dose_mcg: 1000, site: 'CD' as Site, pen_id: 4 },
    { at: '2026-11-15 08:00', dose_mcg: 1000, site: 'AE' as Site, pen_id: 4 },
  ];
  const pens = [pen({ id: 4, opened_on: '2026-11-01' }), pen({ id: 5, brand: 'Ozivy' })];

  test('sugere a dose atual, o local do rodízio e a caneta em uso', () => {
    const d = injectionDefaults({ plan: WEGOVY, injections, pens, sites: SITES });
    assert.equal(d.doseMcg, 1000);
    assert.equal(d.site, 'AD');
    assert.equal(d.penId, 4);
    assert.equal(d.weekAtDose, 4);
    assert.equal(d.plannedWeeks, 4);
    assert.equal(d.suggestMcg, null);
  });

  test('sem histórico: a primeira dose do plano', () => {
    const d = injectionDefaults({ plan: WEGOVY, injections: [], pens: [], sites: SITES });
    assert.equal(d.doseMcg, 250);
    assert.equal(d.penId, null);
    assert.equal(d.site, 'AE');
  });

  test('caneta para a dose: a aberta que entrega; senão, a do estoque', () => {
    assert.equal(penForDose(pens, 1000)?.id, 4);
    assert.equal(penForDose([pen({ id: 4, opened_on: '2026-11-01', dose_mcg: 500, total_mcg: 2000 }), pen({ id: 5 })], 1000)?.id, 5);
    assert.equal(penForDose([pen({ id: 9, done: 1, opened_on: '2026-10-01' })], 1000), null);
  });

  test('a caneta abre na primeira aplicação e finaliza quando não sobra uma dose', () => {
    assert.deepEqual(penOutcome(pen({ id: 5 }), 0, 1000, 1000), { opens: true, finishes: false, dosesLeftAfter: 3 });
    assert.deepEqual(penOutcome(pen({ id: 4, opened_on: '2026-11-01' }), 3000, 1000, 1000), {
      opens: false,
      finishes: true,
      dosesLeftAfter: 0,
    });
  });

  test('doses oferecidas', () => {
    assert.deepEqual(doseChoices(WEGOVY, [2000]), [250, 500, 1000, 1700, 2000, 2400]);
  });
});

describe('onboarding', () => {
  test('gera o histórico semanal fase por fase até a véspera de hoje', () => {
    const list = retroactiveInjections(
      '2026-08-23',
      [
        { mcg: 250, weeks: 4 },
        { mcg: 500, weeks: 6 },
        { mcg: 1000, weeks: null },
      ],
      '08:00',
      '2026-11-18',
    );
    assert.equal(list.length, 13);
    assert.equal(list[0].at, '2026-08-23 08:00');
    assert.equal(list[4].dose_mcg, 500);
    assert.equal(list[10].dose_mcg, 1000);
    assert.equal(list[12].at, '2026-11-15 08:00');
  });

  test('não gera a aplicação de hoje', () => {
    const list = retroactiveInjections('2026-11-08', [{ mcg: 250, weeks: null }], '08:00', '2026-11-15');
    assert.deepEqual(
      list.map((i) => i.at),
      ['2026-11-08 08:00'],
    );
  });

  test('plano pela marca', () => {
    assert.equal(planForBrand('Wegovy').at(-1)?.mcg, 2400);
    assert.equal(planForBrand('Ozivy').at(-1)?.mcg, 2000);
  });
});

describe('hoje', () => {
  test('faixa de segunda a domingo com hoje, pesagens e a aplicação prevista', () => {
    const strip = weekStrip('2026-11-18', new Set(['2026-11-17']), new Set(), '2026-11-22');
    assert.deepEqual(
      strip.map((d) => d.day),
      ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22'],
    );
    assert.equal(strip[2].isToday, true);
    assert.equal(strip[1].weighed, true);
    assert.equal(strip[6].planned, true);
  });

  test('variação da semana e progresso da meta', () => {
    const pts: TrendPoint[] = trend([
      { day: '2026-11-08', g: 80600 },
      { day: '2026-11-17', g: 79700 },
    ]);
    const change = weekTrendChange(pts, '2026-11-18');
    assert.ok(change !== null && change < 0);
    assert.equal(weekTrendChange(pts, '2026-12-30'), null);
    assert.ok(Math.abs((goalProgress(86400, 79700, 70000) as number) - 6700 / 16400) < 1e-9);
    assert.equal(goalProgress(86400, 79700, null), null);
  });

  test('um aviso por vez, na prioridade', () => {
    const pts: TrendPoint[] = [
      { day: '2026-08-23', g: 86400, t: 86400 },
      { day: '2026-10-18', g: 82000, t: 82050 },
      { day: '2026-11-17', g: 79700, t: 80100 },
    ];
    const ms = milestones(86400, 70000, pts);
    const next = nextMilestone(ms, 86400, 79700);
    const base = { milestones: ms, next, plateau: true, today: '2026-11-18', tipCount: 3 };
    assert.equal(todayAlert({ ...base, buy: true }).kind, 'buy');
    assert.equal(todayAlert({ ...base, buy: false }).kind, 'milestoneReached'); // −5 kg em 17/11
    assert.equal(todayAlert({ ...base, buy: false, today: '2026-11-30' }).kind, 'milestoneNear');
    assert.equal(todayAlert({ ...base, buy: false, today: '2026-11-30', next: null }).kind, 'plateau');
    assert.equal(todayAlert({ ...base, buy: false, today: '2026-11-30', next: null, plateau: false }).kind, 'tip');
  });
});

describe('lembretes', () => {
  test('aplicação, reforço, véspera da última dose e vencimento', () => {
    const next = nextDue('2026-11-15 08:10', 0, '2026-11-18');
    const plan = reminderPlan({
      next,
      time: '08:00',
      followUpHours: 3,
      now: '2026-11-18 10:00',
      injection: true,
      pen: true,
      lastDose: true,
      useBy: '2026-12-13',
      weeksAhead: 2,
    });
    assert.deepEqual(
      plan.map((r) => [r.kind, r.at]),
      [
        ['lastDose', '2026-11-21 08:00'],
        ['injection', '2026-11-22 08:00'],
        ['followUp', '2026-11-22 11:00'],
        ['injection', '2026-11-29 08:00'],
        ['expiry', '2026-12-06 08:00'],
      ],
    );
  });

  test('registrada hoje: lembra só da próxima semana; desligados não agendam', () => {
    const next = nextDue('2026-11-22 08:10', 0, '2026-11-22');
    const plan = reminderPlan({
      next,
      time: '08:00',
      followUpHours: 0,
      now: '2026-11-22 08:15',
      injection: true,
      pen: false,
      lastDose: true,
      useBy: null,
      weeksAhead: 1,
    });
    assert.deepEqual(
      plan.map((r) => [r.kind, r.at]),
      [['injection', '2026-11-29 08:00']],
    );
    assert.deepEqual(reminderPlan({ ...{ next, time: '08:00', followUpHours: 3, now: '2026-11-22 08:15' }, injection: false, pen: false, lastDose: false, useBy: null }), []);
  });

  test('atrasada: o lembrete vai para o dia habitual seguinte', () => {
    const next = nextDue('2026-11-15 08:10', 0, '2026-11-24');
    const plan = reminderPlan({
      next,
      time: '08:00',
      followUpHours: 3,
      now: '2026-11-24 09:00',
      injection: true,
      pen: false,
      lastDose: false,
      useBy: null,
      weeksAhead: 1,
    });
    assert.deepEqual(
      plan.map((r) => [r.kind, r.at]),
      [['injection', '2026-11-29 08:00']],
    );
  });
});

describe('registrar peso', () => {
  test('lê o teclado com vírgula e respeita a faixa', () => {
    assert.equal(parseWeight('79,7'), 79700);
    assert.equal(parseWeight('79,75'), 79750);
    assert.equal(parseWeight('79,'), 79000);
    assert.equal(parseWeight('79,755'), null);
    assert.equal(parseWeight('29'), null);
    assert.equal(parseWeight('301'), null);
    assert.equal(parseWeight(''), null);
  });

  test('compara com a pesagem anterior', () => {
    assert.equal(weighingChange(79700, null), 'first');
    assert.equal(weighingChange(79600, 79700), 'down');
    assert.equal(weighingChange(79900, 79700), 'up');
    assert.equal(weighingChange(79702, 79700), 'same');
  });
});

describe('nearbyRecord', () => {
  const rows = [
    { id: 1, at: '2026-11-08 08:00' },
    { id: 2, at: '2026-11-15 08:00' },
    { id: 3, at: '2026-11-19 04:28' },
  ];
  test('acha o registro do mesmo dia', () => {
    assert.equal(nearbyRecord(rows, '2026-11-19 09:00')?.id, 3);
  });
  test('acha registros até 2 dias antes ou depois', () => {
    assert.equal(nearbyRecord(rows, '2026-11-16 08:00')?.id, 2);
    assert.equal(nearbyRecord(rows, '2026-11-13 08:00')?.id, 2);
  });
  test('ignora registros a 3 dias ou mais', () => {
    assert.equal(nearbyRecord(rows, '2026-11-12 08:00'), null);
    assert.equal(nearbyRecord(rows, '2026-11-22 08:00'), null);
    assert.equal(nearbyRecord([], '2026-11-19 08:00'), null);
  });
  test('prefere o mais próximo e, no empate, o mais recente', () => {
    assert.equal(nearbyRecord(rows, '2026-11-18 20:00')?.id, 3);
    const tie = [
      { id: 1, at: '2026-11-17 08:00' },
      { id: 2, at: '2026-11-19 08:00' },
    ];
    assert.equal(nearbyRecord(tie, '2026-11-18 08:00')?.id, 2);
  });
});

describe('penToClose', () => {
  const pen = (id: number, opened_on: string | null): PenLike => ({ id, brand: 'Wegovy', total_mcg: 4000, dose_mcg: 1000, days_open: 42, opened_on, done: 0 });
  const inj = (at: string, pen_id: number | null) => ({ at, dose_mcg: 1000, site: null, pen_id });
  test('a caneta aberta só por esta aplicação volta para o estoque', () => {
    assert.equal(penToClose([pen(1, '2026-11-19')], inj('2026-11-19 08:00', 1), [])?.id, 1);
  });
  test('fica aberta se outra aplicação usa a caneta', () => {
    assert.equal(penToClose([pen(1, '2026-11-12')], inj('2026-11-19 08:00', 1), [inj('2026-11-12 08:00', 1)]), null);
    assert.equal(penToClose([pen(1, '2026-11-19')], inj('2026-11-19 08:00', 1), [inj('2026-11-26 08:00', 1)]), null);
  });
  test('fica aberta se foi aberta em outro dia ou não há caneta', () => {
    assert.equal(penToClose([pen(1, '2026-11-18')], inj('2026-11-19 08:00', 1), []), null);
    assert.equal(penToClose([pen(1, '2026-11-19')], inj('2026-11-19 08:00', null), []), null);
  });
});

describe('openingDay', () => {
  test('caneta do estoque abre no dia da aplicação', () => {
    assert.equal(openingDay({ opened_on: null }, '2026-11-19'), '2026-11-19');
  });
  test('aplicação registrada antes da abertura antecipa a abertura', () => {
    assert.equal(openingDay({ opened_on: '2026-11-19' }, '2026-11-18'), '2026-11-18');
  });
  test('aplicação depois da abertura não muda nada', () => {
    assert.equal(openingDay({ opened_on: '2026-11-12' }, '2026-11-19'), null);
    assert.equal(openingDay({ opened_on: '2026-11-19' }, '2026-11-19'), null);
  });
});
