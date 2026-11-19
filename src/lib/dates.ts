// Datas como texto na hora local: dia 'AAAA-MM-DD' e instante 'AAAA-MM-DD HH:MM'.

const pad = (n: number) => String(n).padStart(2, '0');
const DAY_MS = 86_400_000;

export function toDay(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toStamp(d: Date): string {
  return `${toDay(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function parseStamp(s: string): Date {
  const [day, time = '00:00'] = s.split(' ');
  const [y, m, d] = day.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  return new Date(y, m - 1, d, h, min);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Aritmética de dias sobre o texto 'AAAA-MM-DD' (ou o começo de um instante), sem fuso horário.

/** Número do dia (dias desde 1970-01-01). A diferença entre dois dias é exata. */
export function dayNum(day: string): number {
  const [y, m, d] = day.slice(0, 10).split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function fromDayNum(n: number): string {
  const d = new Date(n * DAY_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function shiftDay(day: string, n: number): string {
  return fromDayNum(dayNum(day) + n);
}

/** Dias de `from` até `to` (positivo se `to` vem depois). */
export function daysBetween(from: string, to: string): number {
  return dayNum(to) - dayNum(from);
}

/** 0 = domingo … 6 = sábado. */
export function weekdayOf(day: string): number {
  return (((dayNum(day) + 4) % 7) + 7) % 7; // 1970-01-01 foi uma quinta-feira
}

/** Dia 'AAAA-MM-DD' como Date local à meia-noite. */
export function dayToDate(day: string): Date {
  const [y, m, d] = day.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}
