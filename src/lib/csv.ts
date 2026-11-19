// Planilhas em CSV para abrir no Excel, no Google Planilhas ou no LibreOffice (pt-BR: ";" e vírgula decimal).

import type { InjectionRow, JournalRow, MeasureRow, PenRow, WeightRow } from '@/db/queries';
import { penNumbers } from '@/domain/pens';
import { dailyMeans, trend } from '@/domain/weight';

import { ddmmyyyy, mgPlain, num, timeOf } from './format';
import { LEVEL_LABEL, MEASURE_LABEL, penLabel, SITE_NAME, SYMPTOM_LABEL } from './labels';

type Cell = string | number | null;

const cell = (v: Cell): string => {
  if (v === null) return '';
  const s = String(v);
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Cabeçalho e linhas → texto CSV com BOM (para o Excel reconhecer o UTF-8) e quebra de linha CRLF. */
export function toCsv(header: readonly string[], rows: readonly (readonly Cell[])[]): string {
  return `﻿${[header, ...rows].map((r) => r.map(cell).join(';')).join('\r\n')}\r\n`;
}

const date = (at: string) => ddmmyyyy(at.slice(0, 10));

export function weightsCsv(weights: readonly WeightRow[]): string {
  const points = new Map(trend(dailyMeans(weights)).map((p) => [p.day, p.t]));
  return toCsv(
    ['Data', 'Hora', 'Peso (kg)', 'Tendência do dia (kg)'],
    weights.map((w) => {
      const t = points.get(w.at.slice(0, 10));
      return [date(w.at), timeOf(w.at), num(w.g / 1000, 2), t !== undefined ? num(t / 1000, 2) : null];
    }),
  );
}

export function injectionsCsv(injections: readonly InjectionRow[], pens: readonly PenRow[]): string {
  const numbers = penNumbers(pens);
  const byId = new Map(pens.map((p) => [p.id, p]));
  return toCsv(
    ['Data', 'Hora', 'Dose (mg)', 'Local', 'Caneta', 'Observação'],
    injections.map((i) => {
      const pen = i.pen_id !== null ? byId.get(i.pen_id) : undefined;
      return [
        date(i.at),
        timeOf(i.at),
        i.dose_mcg === null ? 'semana pulada' : mgPlain(i.dose_mcg),
        i.site ? SITE_NAME[i.site] : null,
        pen ? `Caneta ${numbers.get(pen.id)} (${penLabel(pen)})` : null,
        i.note,
      ];
    }),
  );
}

export function journalCsv(journal: readonly JournalRow[]): string {
  return toCsv(
    ['Data', 'Hora', 'Tipo', 'Intensidade', 'Texto'],
    journal.map((j) => [
      date(j.at),
      timeOf(j.at),
      SYMPTOM_LABEL[j.kind] ?? j.kind,
      j.level !== null ? (LEVEL_LABEL[j.level] ?? String(j.level)) : null,
      j.text,
    ]),
  );
}

export function measuresCsv(measures: readonly MeasureRow[]): string {
  return toCsv(
    ['Data', 'Hora', 'Medida', 'Centímetros'],
    measures.map((m) => [date(m.at), timeOf(m.at), MEASURE_LABEL[m.kind] ?? m.kind, num(m.mm / 10, 1)]),
  );
}
