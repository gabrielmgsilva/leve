/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { backupCounts, makeBackup, parseBackup, settingsRows, type BackupTables } from './backup';

const tables = (): BackupTables => ({
  pens: [{ id: 1, brand: 'Wegovy', total_mcg: 4000, dose_mcg: 1000, days_open: 42, opened_on: '2026-11-01', done: 0, price_cents: 98990 }],
  injections: [
    { id: 1, at: '2026-11-01 08:20', dose_mcg: 1000, site: 'CE', pen_id: 1, note: null },
    { id: 2, at: '2026-11-08 08:05', dose_mcg: null, site: null, pen_id: null, note: 'viagem' },
  ],
  weights: [{ id: 7, at: '2026-11-17 07:05', g: 79700 }],
  journal: [{ id: 3, at: '2026-11-09 20:15', kind: 'nausea', level: 1, text: null }],
  measures: [
    { id: 1, at: '2026-11-10 07:30', kind: 'waist', mm: 905 },
    { id: 2, at: '2026-11-10 07:30', kind: 'hip', mm: 1040 },
  ],
  photos: [{ id: 1, at: '2026-11-10 07:35', file: 'p-20261110-0735.jpg', note: null, data: 'AAEC/w==' }],
});

const settings = [
  { key: 'profile', value: JSON.stringify({ name: '', heightCm: 165, goalG: 70000 }) },
  { key: 'theme', value: JSON.stringify('dark') },
];

describe('backup', () => {
  test('ida e volta recupera tudo', () => {
    const backup = makeBackup(settings, tables(), '2026-11-18 21:00');
    assert.deepEqual(backup.settings.profile, { name: '', heightCm: 165, goalG: 70000 });
    const parsed = parseBackup(JSON.stringify(backup));
    assert.ok(parsed.ok);
    assert.deepEqual(parsed.backup, backup);
    assert.deepEqual(settingsRows(parsed.backup), settings);
    assert.deepEqual(backupCounts(parsed.backup), { weights: 1, injections: 1, pens: 1, journal: 1, measures: 1, photos: 1 });
  });

  test('recusa arquivo que não é do Leve', () => {
    assert.equal(parseBackup('não é json').ok, false);
    assert.equal(parseBackup(JSON.stringify({ app: 'outro' })).ok, false);
  });

  test('recusa versão mais nova', () => {
    const backup = { ...makeBackup(settings, tables(), '2026-11-18 21:00'), version: 99 };
    const r = parseBackup(JSON.stringify(backup));
    assert.equal(r.ok, false);
    assert.match(r.ok ? '' : r.error, /versão mais nova/);
  });

  test('aponta a linha com problema', () => {
    const t = tables();
    t.weights.push({ id: 8, at: '2026-11-18 07:00', g: 7970 }); // 7,97 kg: fora da faixa
    const r = parseBackup(JSON.stringify(makeBackup(settings, t, '2026-11-18 21:00')));
    assert.deepEqual(r, { ok: false, error: 'O backup está corrompido (pesagem 2).' });
  });

  test('recusa ids repetidos e caneta inexistente', () => {
    const dup = tables();
    dup.journal.push({ ...dup.journal[0] });
    assert.equal(parseBackup(JSON.stringify(makeBackup(settings, dup, '2026-11-18 21:00'))).ok, false);
    const orphan = tables();
    orphan.injections[0].pen_id = 9;
    const r = parseBackup(JSON.stringify(makeBackup(settings, orphan, '2026-11-18 21:00')));
    assert.deepEqual(r, { ok: false, error: 'O backup está corrompido (aplicação 1).' });
  });

  test('descarta campos desconhecidos', () => {
    const raw = JSON.parse(JSON.stringify(makeBackup(settings, tables(), '2026-11-18 21:00')));
    raw.weights[0].extra = 'x';
    const r = parseBackup(JSON.stringify(raw));
    assert.ok(r.ok);
    assert.deepEqual(Object.keys(r.backup.weights[0]), ['id', 'at', 'g']);
  });
});

describe('backup v1', () => {
  test('backup antigo entra sem medidas, sem fotos e sem preço', () => {
    const t = tables();
    const v1 = {
      app: 'leve',
      version: 1,
      exportedAt: '2026-11-18 21:00',
      settings: {},
      pens: t.pens.map(({ price_cents: _price, ...p }) => p),
      injections: t.injections,
      weights: t.weights,
      journal: t.journal,
    };
    const r = parseBackup(JSON.stringify(v1));
    assert.ok(r.ok);
    assert.equal(r.backup.pens[0].price_cents, null);
    assert.deepEqual(r.backup.measures, []);
    assert.deepEqual(r.backup.photos, []);
  });

  test('recusa foto com nome de arquivo perigoso', () => {
    const backup = makeBackup(settings, tables(), '2026-11-18 21:00');
    backup.photos[0].file = '../../banco.db';
    assert.equal(parseBackup(JSON.stringify(backup)).ok, false);
  });
});
