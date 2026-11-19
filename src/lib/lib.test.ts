/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { injectionsCsv, measuresCsv, toCsv, weightsCsv } from './csv';
import { money, moneyInput, onWeekday } from './format';
import { patternText } from './patternText';
import { escapeHtml, reportHtml } from './report';

describe('CSV', () => {
  test('separa com ponto e vírgula, escapa aspas e começa com BOM', () => {
    const csv = toCsv(['A', 'B'], [['x;y', 'diz "oi"'], [1, null]]);
    assert.equal(csv, '﻿A;B\r\n"x;y";"diz ""oi"""\r\n1;\r\n');
  });

  test('pesagens com vírgula decimal e tendência', () => {
    const csv = weightsCsv([
      { id: 1, at: '2026-11-18 07:05', g: 80000 },
      { id: 2, at: '2026-11-19 07:10', g: 79700 },
    ]);
    const lines = csv.split('\r\n'); // trim() tiraria o BOM
    assert.equal(lines[0], '﻿Data;Hora;Peso (kg);Tendência do dia (kg)');
    assert.equal(lines[1], '18/11/2026;07:05;80,00;80,00');
    assert.ok(lines[2].startsWith('19/11/2026;07:10;79,70;79,9'));
  });

  test('aplicações com semana pulada, local e caneta', () => {
    const csv = injectionsCsv(
      [
        { id: 1, at: '2026-11-15 08:00', dose_mcg: 1000, site: 'AD', pen_id: 1, note: null },
        { id: 2, at: '2026-11-22 08:00', dose_mcg: null, site: null, pen_id: null, note: 'viagem' },
      ],
      [{ id: 1, brand: 'Wegovy', total_mcg: 4000, dose_mcg: 1000, days_open: 42, opened_on: '2026-11-15', done: 0, price_cents: null }],
    );
    const lines = csv.trim().split('\r\n');
    assert.equal(lines[1], '15/11/2026;08:00;1;abdômen direito;Caneta 1 (Wegovy 1 mg);');
    assert.equal(lines[2], '22/11/2026;08:00;semana pulada;;;viagem');
  });

  test('medidas em centímetros', () => {
    const csv = measuresCsv([{ id: 1, at: '2026-11-10 07:30', kind: 'waist', mm: 905 }]);
    assert.equal(csv.trim().split('\r\n')[1], '10/11/2026;07:30;Cintura;90,5');
  });
});

describe('padrões em texto', () => {
  test('janela depois da aplicação', () => {
    assert.equal(
      patternText({ type: 'afterInjection', kind: 'nausea', fromDay: 1, toDay: 2, hits: 4, total: 5 }),
      'Náusea costuma aparecer 1 a 2 dias depois da aplicação (4 de 5 registros).',
    );
    assert.equal(
      patternText({ type: 'afterInjection', kind: 'fatigue', fromDay: 0, toDay: 0, hits: 3, total: 3 }),
      'Cansaço costuma aparecer no dia da aplicação (3 de 3 registros).',
    );
  });
  test('subida de dose', () => {
    assert.equal(
      patternText({ type: 'doseIncrease', kind: 'nausea', hits: 4, increaseWeeks: 2, otherWeeks: 10 }),
      'Náusea apareceu mais nas semanas em que a dose subiu (4 registros em 2 semanas de subida).',
    );
  });
});

describe('relatório', () => {
  const base = {
    name: 'Ana <b>',
    today: '2026-11-19',
    generatedAt: '2026-11-19 10:00',
    from: '2026-10-01',
    heightCm: 165,
    goalG: 70000,
    plan: [
      { mcg: 250, weeks: 4 },
      { mcg: 500, weeks: 4 },
    ],
    weights: [
      { id: 1, at: '2026-10-01 07:00', g: 86000 },
      { id: 2, at: '2026-11-19 07:00', g: 82000 },
    ],
    injections: [
      { id: 1, at: '2026-10-04 08:00', dose_mcg: 250, site: 'AE' as const, pen_id: null, note: '<script>' },
      { id: 2, at: '2026-11-01 08:00', dose_mcg: 500, site: 'AD' as const, pen_id: null, note: null },
    ],
    pens: [],
    journal: [
      { id: 1, at: '2026-10-05 20:00', kind: 'nausea', level: 2, text: null },
      { id: 2, at: '2026-10-06 20:00', kind: 'note', level: null, text: 'Consulta & exames' },
    ],
    measures: [{ id: 1, at: '2026-10-01 07:30', kind: 'waist', mm: 950 }],
    includeNotes: true,
  };

  test('traz resumo, gráfico, aplicações, sintomas, medidas e notas, com o texto escapado', () => {
    const html = reportHtml(base);
    assert.ok(html.includes('Relatório do tratamento · Ana &lt;b&gt;'));
    assert.ok(html.includes('01/10/2026 a 19/11/2026'));
    assert.ok(html.includes('<svg'));
    assert.ok(html.includes('−4,0 kg (−4,7%)'));
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(!html.includes('<script>'));
    assert.ok(html.includes('Náusea'));
    assert.ok(html.includes('Cintura'));
    assert.ok(html.includes('Consulta &amp; exames'));
    assert.ok(html.includes('não substitui a avaliação'));
  });

  test('sem notas quando ela não quer', () => {
    assert.ok(!reportHtml({ ...base, includeNotes: false }).includes('Consulta'));
  });

  test('escapa HTML', () => {
    assert.equal(escapeHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });
});

describe('formatos', () => {
  test('dinheiro em reais', () => {
    assert.equal(money(129900), 'R$ 1.299,00');
    assert.equal(money(98990), 'R$ 989,90');
    assert.equal(money(123456789), 'R$ 1.234.567,89');
    assert.equal(moneyInput(98990), '989,90');
  });
  test('artigo do dia da semana', () => {
    assert.equal(onWeekday(0), 'no domingo');
    assert.equal(onWeekday(3), 'na quarta');
    assert.equal(onWeekday(6), 'no sábado');
  });
});
