/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { Site } from '@/db/queries';

import { rotation, suggestSite } from './sites';

const inj = (at: string, site: Site, dose_mcg: number | null = 1000) => ({ at, site, dose_mcg });
const ACTIVE: Site[] = ['AE', 'AD', 'CE', 'CD'];

describe('rodízio de locais', () => {
  test('sugere o local ativo usado há mais tempo', () => {
    const history = [
      inj('2026-10-25 08:00', 'AD'),
      inj('2026-11-01 08:00', 'CE'),
      inj('2026-11-08 08:00', 'CD'),
      inj('2026-11-15 08:00', 'AE'),
    ];
    assert.equal(suggestSite(history, ACTIVE), 'AD');
    assert.deepEqual(
      rotation(history, ACTIVE).map((u) => u.site),
      ['AD', 'CE', 'CD', 'AE'],
    );
  });

  test('local nunca usado vem antes; empate segue a ordem fixa', () => {
    assert.equal(suggestSite([inj('2026-11-15 08:00', 'AE')], ACTIVE), 'AD');
    assert.equal(suggestSite([], ACTIVE), 'AE');
  });

  test('nunca repete a última região quando há outra ativa', () => {
    const history = [inj('2026-11-08 08:00', 'AE'), inj('2026-11-15 08:00', 'AD')];
    assert.equal(suggestSite(history, ['AE', 'AD']), 'AE');
    assert.equal(suggestSite(history, ['AD']), 'AD');
  });

  test('ignora locais desativados e semanas puladas', () => {
    const history = [inj('2026-11-01 08:00', 'BE'), inj('2026-11-08 08:00', 'AE', null)];
    assert.equal(suggestSite(history, ['AE', 'BE']), 'AE');
    assert.equal(suggestSite(history, ['CE', 'CD']), 'CE');
  });
});
