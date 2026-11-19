// Lembretes locais: o que agendar e quando (5.8, H4, H5; docs/03-arquitetura.md § 6).

import { dayNum, fromDayNum } from '@/lib/dates';

import type { NextDue } from './schedule';

export type ReminderKind = 'injection' | 'followUp' | 'lastDose' | 'expiry' | 'backup';

export type Reminder = {
  id: string;
  kind: ReminderKind;
  at: string; // 'AAAA-MM-DD HH:MM', hora local
};

export type ReminderInput = {
  next: NextDue;
  time: string; // 'HH:MM'
  followUpHours: number; // 0 = sem reforço
  now: string; // 'AAAA-MM-DD HH:MM'
  injection: boolean;
  pen: boolean;
  /** A próxima aplicação usa a última dose da caneta em uso. */
  lastDose: boolean;
  /** Dia em que a caneta aberta vence (abertura + validade), se houver. */
  useBy: string | null;
  /** Quantas semanas à frente agendar o lembrete da aplicação. */
  weeksAhead?: number;
  /** Dia em que o backup vence (último backup ou primeiro registro + 30 dias); null = sem lembrete. */
  backupDue?: string | null;
};

const pad = (n: number) => String(n).padStart(2, '0');

function addHours(stamp: string, hours: number): string {
  const [day, hm] = stamp.split(' ');
  const [h, m] = hm.split(':').map(Number);
  const total = h * 60 + m + Math.round(hours * 60);
  const days = Math.floor(total / 1440);
  const mins = ((total % 1440) + 1440) % 1440;
  return `${fromDayNum(dayNum(day) + days)} ${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
}

/**
 * Lembretes a agendar a partir de agora: a próxima aplicação (e as das semanas seguintes), o reforço
 * algumas horas depois se ela ainda não registrou, a véspera da última dose da caneta e o aviso de
 * 7 dias antes de a caneta aberta vencer. Só entra o que ainda vai acontecer.
 */
export function reminderPlan(input: ReminderInput): Reminder[] {
  const out: Reminder[] = [];
  const add = (r: Reminder) => {
    if (r.at > input.now) out.push(r);
  };
  const weeks = input.weeksAhead ?? 4;
  // Atrasada: o lembrete volta para o dia habitual da semana seguinte.
  let first = dayNum(input.next.day);
  if (input.next.state === 'overdue') first += 7 * Math.ceil(-input.next.daysUntil / 7);

  if (input.injection) {
    for (let k = 0; k < weeks; k++) {
      const day = fromDayNum(first + 7 * k);
      add({ id: `injection-${day}`, kind: 'injection', at: `${day} ${input.time}` });
    }
    if (input.followUpHours > 0 && input.next.state !== 'overdue') {
      const at = addHours(`${fromDayNum(first)} ${input.time}`, input.followUpHours);
      add({ id: `followUp-${fromDayNum(first)}`, kind: 'followUp', at });
    }
  }
  if (input.pen) {
    if (input.lastDose) {
      const eve = fromDayNum(first - 1);
      add({ id: `lastDose-${eve}`, kind: 'lastDose', at: `${eve} ${input.time}` });
    }
    if (input.useBy) {
      const warn = fromDayNum(dayNum(input.useBy) - 7);
      add({ id: `expiry-${warn}`, kind: 'expiry', at: `${warn} ${input.time}` });
    }
  }
  if (input.backupDue) {
    // Um aviso só, no dia em que vence; atrasado, fica o aviso da Hoje.
    add({ id: `backup-${input.backupDue}`, kind: 'backup', at: `${input.backupDue} ${input.time}` });
  }
  return out.sort((a, b) => (a.at < b.at ? -1 : 1));
}

/** Lembretes que levam os botões "Já apliquei" e "Lembrar em 1 h". */
export function hasInjectionActions(kind: ReminderKind): boolean {
  return kind === 'injection' || kind === 'followUp';
}

/** Mais tarde: o mesmo lembrete daqui a `minutes` minutos. */
export function snoozeAt(now: string, minutes = 60): string {
  return addHours(now, minutes / 60);
}
