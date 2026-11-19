// Formatos pt-BR: vírgula decimal, "−" (sinal de menos) e datas por extenso.

import { dayToDate } from './dates';

export const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const WEEKDAYS_PLURAL = ['domingos', 'segundas', 'terças', 'quartas', 'quintas', 'sextas', 'sábados'];
const WEEKDAYS_SHORT = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];
export const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const comma = (s: string) => s.replace('.', ',');
const pad = (n: number) => String(n).padStart(2, '0');
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** 1234.5 → "1234,5" (com `digits` casas). */
export function num(x: number, digits = 1): string {
  return comma(x.toFixed(digits));
}

/** 79700 → "79,7" */
export function kg(g: number, digits = 1): string {
  return comma((g / 1000).toFixed(digits));
}

/** 79700 → "79,7 kg" */
export function kgUnit(g: number, digits = 1): string {
  return `${kg(g, digits)} kg`;
}

/** −700 → "−0,7"; 300 → "+0,3"; arredonda antes de escolher o sinal (−30 g vira "0,0"). */
export function signedKg(g: number, digits = 1): string {
  const text = kg(Math.abs(g), digits);
  const zero = Number((Math.abs(g) / 1000).toFixed(digits)) === 0;
  const sign = zero ? '' : g < 0 ? '−' : '+';
  return sign + text;
}

/** −0,078 → "−7,8%" */
export function signedPct(fraction: number, digits = 1): string {
  const value = Math.abs(fraction * 100);
  const zero = Number(value.toFixed(digits)) === 0;
  return `${zero ? '' : fraction < 0 ? '−' : '+'}${comma(value.toFixed(digits))}%`;
}

/** 129900 → "R$ 1.299,00" */
export function money(cents: number): string {
  const [int, dec] = (Math.round(cents) / 100).toFixed(2).split('.');
  return `R$ ${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}`;
}

/** 129900 → "1299,00" (para o campo de texto) */
export function moneyInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

/** 250 → "0,25 mg"; 1700 → "1,7 mg" */
export function mg(mcg: number): string {
  return `${mgPlain(mcg)} mg`;
}

/** 1700 → "1,7" (sem unidade, para listas como "1,7 e 2,4 mg"). */
export function mgPlain(mcg: number): string {
  return comma(String(Math.round(mcg) / 1000));
}

/** 165 → "1,65 m" */
export function meters(cm: number): string {
  return `${comma((cm / 100).toFixed(2))} m`;
}

/** "Quarta, 18 de novembro" */
export function longDate(d: Date): string {
  return `${capitalize(WEEKDAYS[d.getDay()])}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

/** "dom., 15/11" */
export function shortDate(d: Date): string {
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/** '2026-11-15' → "15/11" */
export function ddmm(day: string): string {
  return `${day.slice(8, 10)}/${day.slice(5, 7)}`;
}

/** '2026-11-15' → "15/11/2026" */
export function ddmmyyyy(day: string): string {
  return `${ddmm(day)}/${day.slice(0, 4)}`;
}

/** '2026-11-15' → "dom., 15/11" */
export function dayShort(day: string): string {
  return shortDate(dayToDate(day));
}

/** '2026-11-15' → "dom." */
export function weekdayShort(day: string): string {
  return WEEKDAYS_SHORT[dayToDate(day).getDay()];
}

/** '2026-11-18' → "quarta, 18/11" */
export function weekdayAndDate(day: string): string {
  return `${WEEKDAYS[dayToDate(day).getDay()]}, ${ddmm(day)}`;
}

/** 0 → "no domingo"; 3 → "na quarta" */
export function onWeekday(weekday: number): string {
  return `${weekday === 0 || weekday === 6 ? 'no' : 'na'} ${WEEKDAYS[weekday]}`;
}

/** 0 → "domingos" */
export function weekdayPlural(weekday: number): string {
  return WEEKDAYS_PLURAL[weekday];
}

/** '2026-11-15 08:12' → "08:12" */
export function timeOf(stamp: string): string {
  return stamp.slice(11, 16);
}

/** Ano e mês (0–11) → "Novembro de 2026" */
export function monthTitle(year: number, month: number): string {
  return `${capitalize(MONTHS[month])} de ${year}`;
}

/** Mês aproximado: "abril de 2027" */
export function monthYear(day: string): string {
  return `${MONTHS[Number(day.slice(5, 7)) - 1]} de ${day.slice(0, 4)}`;
}

/** Distância até hoje: "hoje", "ontem", "há 3 dias", "há 2 semanas", "há 3 meses". */
export function ago(days: number): string {
  if (days <= 0) return 'hoje';
  if (days === 1) return 'ontem';
  if (days < 14) return `há ${days} dias`;
  if (days < 60) return `há ${Math.floor(days / 7)} semanas`;
  const months = Math.floor(days / 30);
  return months < 24 ? `há ${months} meses` : `há ${Math.floor(days / 365)} anos`;
}

/** "a", "a e b", "a, b e c" */
export function joinPt(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

/** "semana 3 de 4", ou "semana 6 (plano: 4)" quando passou do previsto. */
export function weekOfPlan(week: number, planned: number | null): string {
  if (planned === null) return `semana ${week}`;
  return week <= planned ? `semana ${week} de ${planned}` : `semana ${week} (plano: ${planned})`;
}

/** Plural simples: plural(2, 'dose', 'doses') → "2 doses" */
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function greeting(d: Date): string {
  const h = d.getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}
