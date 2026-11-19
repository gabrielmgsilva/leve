/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { weekdayOf } from '@/lib/dates';

import { nextDue, plannedDays } from './schedule';

// Novembro de 2026 começa num domingo: 1, 8, 15, 22 e 29 são domingos.
const SUNDAY = 0;

describe('próxima aplicação', () => {
  test('o calendário de referência está certo', () => {
    assert.equal(weekdayOf('2026-11-01'), 0);
    assert.equal(weekdayOf('2026-11-18'), 3);
  });

  test('sem registro: o próximo dia da semana do plano', () => {
    assert.deepEqual(nextDue(null, SUNDAY, '2026-11-18'), { day: '2026-11-22', state: 'upcoming', daysUntil: 4 });
    assert.deepEqual(nextDue(null, SUNDAY, '2026-11-22'), { day: '2026-11-22', state: 'today', daysUntil: 0 });
  });

  test('semana normal', () => {
    assert.deepEqual(nextDue('2026-11-15 08:10', SUNDAY, '2026-11-18'), {
      day: '2026-11-22',
      state: 'upcoming',
      daysUntil: 4,
    });
  });

  test('aplicação atrasada volta para o dia habitual, com 3 dias no mínimo', () => {
    assert.equal(nextDue('2026-11-17 09:00', SUNDAY, '2026-11-18').day, '2026-11-22');
    assert.equal(nextDue('2026-11-19 09:00', SUNDAY, '2026-11-19').day, '2026-11-22');
    assert.equal(nextDue('2026-11-20 09:00', SUNDAY, '2026-11-20').day, '2026-11-29');
  });

  test('registrada hoje', () => {
    assert.deepEqual(nextDue('2026-11-22 08:10', SUNDAY, '2026-11-22'), {
      day: '2026-11-29',
      state: 'taken',
      daysUntil: 7,
    });
  });

  test('atrasada sem registro', () => {
    assert.deepEqual(nextDue('2026-11-15 08:10', SUNDAY, '2026-11-24'), {
      day: '2026-11-22',
      state: 'overdue',
      daysUntil: -2,
    });
  });

  test('troca do dia da semana respeita o intervalo mínimo', () => {
    assert.equal(nextDue('2026-11-15 08:10', 2, '2026-11-16').day, '2026-11-24'); // terça
    assert.equal(nextDue('2026-11-15 08:10', 3, '2026-11-16').day, '2026-11-18'); // quarta, 3 dias depois
  });

  test('datas previstas semana a semana', () => {
    const next = nextDue('2026-11-15 08:10', SUNDAY, '2026-11-18');
    assert.deepEqual(plannedDays(next, '2026-11-30'), ['2026-11-22', '2026-11-29']);
  });
});
