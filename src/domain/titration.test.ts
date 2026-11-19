/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { PLAN_TEMPLATES, titrationState } from './titration';

const WEGOVY = PLAN_TEMPLATES[0].steps;

/** Aplicações semanais a partir de 23/08/2026 com as doses dadas (null = semana pulada). */
function weekly(doses: (number | null)[]) {
  const start = Date.UTC(2026, 7, 23);
  return doses.map((dose_mcg, i) => ({
    at: `${new Date(start + i * 7 * 86_400_000).toISOString().slice(0, 10)} 08:00`,
    dose_mcg,
  }));
}

describe('plano de doses', () => {
  test('etapas concluídas, atual e próximas', () => {
    const s = titrationState(WEGOVY, weekly([250, 250, 250, 250, 500, 500, 500, 500, 500, 500, 1000, 1000, 1000]));
    assert.deepEqual(
      s.steps.map((x) => [x.mcg, x.status, x.count]),
      [
        [250, 'done', 4],
        [500, 'done', 6],
        [1000, 'current', 3],
        [1700, 'next', 0],
        [2400, 'next', 0],
      ],
    );
    assert.equal(s.currentMcg, 1000);
    assert.equal(s.weeksAtDose, 3);
    assert.equal(s.runStart, '2026-11-01');
    assert.equal(s.plannedWeeks, 4);
    assert.equal(s.suggestMcg, null);
    assert.equal(s.steps[0].first, '2026-08-23');
    assert.equal(s.steps[0].last, '2026-09-13');
  });

  test('sugere a próxima dose ao completar as semanas previstas, sem aplicar', () => {
    const s = titrationState(WEGOVY, weekly([250, 250, 250, 250]));
    assert.equal(s.suggestMcg, 500);
    assert.equal(s.currentMcg, 250);
  });

  test('semana pulada não interrompe a contagem na dose', () => {
    const s = titrationState(WEGOVY, weekly([250, 250, null, 250]));
    assert.equal(s.weeksAtDose, 3);
  });

  test('dose fora do plano entra como etapa atual', () => {
    const s = titrationState(WEGOVY, weekly([250, 500, 1000, 2000]));
    assert.deepEqual(
      s.steps.map((x) => [x.mcg, x.status, x.inPlan]),
      [
        [250, 'done', true],
        [500, 'done', true],
        [1000, 'done', true],
        [1700, 'done', true],
        [2000, 'current', false],
        [2400, 'next', true],
      ],
    );
    assert.equal(s.suggestMcg, null);
  });

  test('manutenção não sugere nada; sem aplicações tudo é próximo', () => {
    const maintenance = titrationState([{ mcg: 2400, weeks: null }], weekly([2400, 2400, 2400, 2400, 2400]));
    assert.equal(maintenance.suggestMcg, null);
    const empty = titrationState(WEGOVY, []);
    assert.equal(empty.currentMcg, null);
    assert.ok(empty.steps.every((x) => x.status === 'next'));
  });
});
