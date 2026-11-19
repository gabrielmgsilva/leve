/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { InjectionRow, JournalRow, WeightRow } from '@/db/queries';

import { buildTimeline, type InjectionItem, type JournalItem, type WeightItem } from './timeline';

const injections: InjectionRow[] = [
  { id: 1, at: '2026-11-01 08:00', dose_mcg: 500, site: 'AE', pen_id: 1, note: null },
  { id: 2, at: '2026-11-08 08:05', dose_mcg: 1000, site: 'AD', pen_id: 2, note: null },
  { id: 3, at: '2026-11-15 08:10', dose_mcg: 1000, site: 'CE', pen_id: 2, note: null },
];
const weights: WeightRow[] = [
  { id: 1, at: '2026-11-01 07:00', g: 81000 },
  { id: 2, at: '2026-11-03 07:00', g: 80800 },
  { id: 3, at: '2026-11-05 07:00', g: 80900 },
  { id: 4, at: '2026-11-10 07:00', g: 80500 },
];
const journal: JournalRow[] = [
  { id: 1, at: '2026-11-09 20:15', kind: 'nausea', level: 1, text: null },
  { id: 2, at: '2026-11-09 20:15', kind: 'fatigue', level: 1, text: null },
  { id: 3, at: '2026-11-09 20:15', kind: 'note', level: null, text: 'Primeira semana com 1 mg.' },
  { id: 4, at: '2026-11-17 21:40', kind: 'heartburn', level: 1, text: null },
];

describe('linha do tempo', () => {
  const weeks = buildTimeline({ injections, weights, journal, weekChanges: [], today: '2026-11-18' });

  test('semanas de tratamento, da mais recente para a mais antiga', () => {
    assert.deepEqual(
      weeks.map((w) => [w.week, w.from, w.to, w.mcg]),
      [
        [3, '2026-11-15', '2026-11-21', 1000],
        [2, '2026-11-08', '2026-11-14', 1000],
        [1, '2026-11-01', '2026-11-07', 500],
      ],
    );
  });

  test('subida de dose e caneta nova na aplicação', () => {
    const inj = weeks[1].items.find((i): i is InjectionItem => i.kind === 'injection');
    assert.ok(inj);
    assert.equal(inj.firstOfDose, true);
    assert.equal(inj.doseUp, true);
    assert.equal(inj.opensPen, true);
    const first = weeks[2].items.find((i): i is InjectionItem => i.kind === 'injection');
    assert.equal(first?.firstEver, true);
  });

  test('sintomas do mesmo instante juntos; nota separada', () => {
    const entries = weeks[1].items.filter((i): i is JournalItem => i.kind === 'journal');
    assert.equal(entries.length, 2);
    const symptoms = entries.find((e) => e.entries[0].kind !== 'note');
    assert.deepEqual(
      symptoms?.entries.map((e) => e.kind),
      ['nausea', 'fatigue'],
    );
    assert.equal(symptoms?.daysAfter, 1);
    assert.equal(symptoms?.afterDoseUpMcg, 1000);
    const heartburn = weeks[0].items.find((i): i is JournalItem => i.kind === 'journal');
    assert.equal(heartburn?.daysAfter, 2);
    assert.equal(heartburn?.afterDoseUpMcg, null);
  });

  test('uma linha de peso por semana, a mais recente', () => {
    const w1 = weeks[2].items.filter((i): i is WeightItem => i.kind === 'weight');
    assert.equal(w1.length, 1);
    assert.equal(w1[0].weight.id, 3);
    assert.equal(w1[0].othersInWeek, 2);
    assert.equal(w1[0].lowest, false);
    const w2 = weeks[1].items.find((i): i is WeightItem => i.kind === 'weight');
    assert.equal(w2?.lowest, true);
  });

  test('sem aplicações: blocos de 7 dias até hoje', () => {
    const only = buildTimeline({ injections: [], weights, journal: [], weekChanges: [], today: '2026-11-18' });
    assert.deepEqual(
      only.map((w) => [w.week, w.from, w.to]),
      [
        [null, '2026-11-05', '2026-11-11'],
        [null, '2026-10-29', '2026-11-04'],
      ],
    );
  });
});
