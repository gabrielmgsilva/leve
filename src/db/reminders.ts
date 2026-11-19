// Lembretes locais (expo-notifications): canal, permissão, reagendamento e os botões do lembrete.
// O que agendar vem de src/domain/reminders.ts.

import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { addDatabaseChangeListener, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { injectionDefaults } from '@/domain/injection';
import { penNumbers, penOverview, usedMcgByPen } from '@/domain/pens';
import { hasInjectionActions, reminderPlan, snoozeAt, type Reminder } from '@/domain/reminders';
import { nextDue } from '@/domain/schedule';
import { titrationState } from '@/domain/titration';
import { backupDueDay } from '@/domain/today';
import { daysBetween, parseStamp, toDay, toStamp } from '@/lib/dates';
import { ddmm, mg, plural, timeOf } from '@/lib/format';
import { penLabel, SITE_IN, SITE_NAME } from '@/lib/labels';

import { saveFromDefaults } from './injectionSave';
import type { InjectionRow, PenRow } from './queries';
import { parseSettings } from './settings';

const CHANNEL = 'lembretes';
const CATEGORY = 'aplicacao';
export const ACTION_DONE = 'ja-apliquei';
export const ACTION_SNOOZE = 'lembrar-1h';

/** Mostra o lembrete mesmo com o app aberto. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Canal "Lembretes" e os botões do lembrete da aplicação. O Android pede o canal antes da permissão. */
export async function ensureChannel(): Promise<void> {
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Lembretes',
    description: 'Aplicação da semana, avisos da caneta e backup',
    importance: AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 200, 250],
    lightColor: '#6A55D8',
  });
  await Notifications.setNotificationCategoryAsync(CATEGORY, [
    { identifier: ACTION_DONE, buttonTitle: 'Já apliquei', options: { opensAppToForeground: false } },
    { identifier: ACTION_SNOOZE, buttonTitle: 'Lembrar em 1 h', options: { opensAppToForeground: false } },
  ]);
}

export type PermissionState = 'granted' | 'denied' | 'ask';

export async function reminderPermission(): Promise<PermissionState> {
  const p = await Notifications.getPermissionsAsync();
  if (p.granted) return 'granted';
  return p.canAskAgain ? 'ask' : 'denied';
}

/** Pede a permissão de notificação (Android 13+). Cria o canal antes, como o Android pede. */
export async function askReminderPermission(): Promise<boolean> {
  await ensureChannel();
  const p = await Notifications.requestPermissionsAsync();
  return p.granted;
}

type Texts = { title: string; body: string; url: string };

/** Primeiro dia com registro (pesagem ou aplicação), para o primeiro lembrete de backup. */
async function firstRecordDay(db: SQLiteDatabase): Promise<string | null> {
  const row = await db.getFirstAsync<{ at: string | null }>(
    'SELECT MIN(at) AS at FROM (SELECT MIN(at) AS at FROM weights UNION ALL SELECT MIN(at) AS at FROM injections)',
  );
  return row?.at ? row.at.slice(0, 10) : null;
}

/**
 * Cancela e agenda de novo a partir do estado atual do banco. Um "Lembrar em 1 h" pendente fica,
 * enquanto a aplicação da semana não for registrada.
 */
export async function rescheduleAll(db: SQLiteDatabase): Promise<Reminder[]> {
  const settings = parseSettings(await db.getAllAsync('SELECT key, value FROM settings'));
  const allowed = settings.onboarded && (await reminderPermission()) === 'granted';
  const injections = await db.getAllAsync<InjectionRow>('SELECT * FROM injections ORDER BY at, id');
  const now = new Date();
  const today = toDay(now);
  const last = injections[injections.length - 1];
  const next = nextDue(last ? last.at.slice(0, 10) : null, settings.schedule.weekday, today);

  const pending = allowed && settings.reminders.injection && (next.state === 'today' || next.state === 'overdue');
  for (const n of await Notifications.getAllScheduledNotificationsAsync()) {
    if (pending && n.identifier.startsWith('snooze-')) continue;
    await Notifications.cancelScheduledNotificationAsync(n.identifier);
  }
  if (!allowed) return [];

  const pens = await db.getAllAsync<PenRow>('SELECT * FROM pens ORDER BY id');
  const titration = titrationState(settings.plan, injections);
  const overview = penOverview(pens, usedMcgByPen(injections), titration.currentMcg, next.day, today);
  const defaults = injectionDefaults({ plan: settings.plan, injections, pens, sites: settings.sites });
  const numbers = penNumbers(pens);
  const pen = overview.inUse;

  const plan = reminderPlan({
    next,
    time: settings.schedule.time,
    followUpHours: settings.reminders.followUpHours,
    now: toStamp(now),
    injection: settings.reminders.injection,
    pen: settings.reminders.pen,
    lastDose: overview.inUseState?.lastDose ?? false,
    useBy: overview.inUseState?.useBy ?? null,
    backupDue: settings.reminders.backup ? backupDueDay(settings.lastBackup, await firstRecordDay(db)) : null,
  });

  const firstInjection = plan.find((r) => r.kind === 'injection')?.id;
  const texts = (r: Reminder): Texts => {
    switch (r.kind) {
      case 'injection':
        return r.id === firstInjection
          ? {
              title: 'Dia de aplicação',
              body: `Hoje é dia de ${mg(defaults.doseMcg)}${defaults.site ? `, ${SITE_IN[defaults.site]}` : ''}. Registre no Leve quando aplicar.`,
              url: '/log/injection',
            }
          : { title: 'Dia de aplicação', body: 'Hoje é dia da aplicação da semana. Registre no Leve quando aplicar.', url: '/log/injection' };
      case 'followUp':
        return {
          title: 'Você aplicou hoje?',
          body: 'A aplicação de hoje ainda não foi registrada. Se já aplicou, é só registrar.',
          url: '/log/injection',
        };
      case 'lastDose':
        return {
          title: 'Amanhã é a última dose da caneta',
          body: `${pen ? `A caneta ${numbers.get(pen.id)} (${penLabel(pen)})` : 'A caneta em uso'} tem só mais uma dose.${
            overview.buy ? ' Hora de comprar a próxima.' : ''
          }`,
          url: '/treatment',
        };
      case 'expiry':
        return {
          title: 'Caneta perto de vencer',
          body: `${pen ? `A caneta ${numbers.get(pen.id)}` : 'A caneta em uso'} deve ser usada até ${ddmm(overview.inUseState?.useBy ?? '')}, a validade depois de aberta.`,
          url: '/treatment',
        };
      case 'backup':
        return {
          title: 'Hora do backup',
          body: 'Faz um mês do último backup do Leve. Exporte o arquivo e guarde no Drive ou no WhatsApp.',
          url: '/settings',
        };
    }
  };

  for (const r of plan) {
    const { title, body, url } = texts(r);
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: { title, body, data: { url }, ...(hasInjectionActions(r.kind) ? { categoryIdentifier: CATEGORY } : {}) },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: parseStamp(r.at), channelId: CHANNEL },
    });
  }
  return plan;
}

const handled = new Set<string>();

/**
 * Botões do lembrete, com o app aberto ou fechado (src/db/reminderTask.ts):
 * "Já apliquei" grava a aplicação com os valores do formulário e avisa o que gravou;
 * "Lembrar em 1 h" agenda o mesmo lembrete para daqui a uma hora.
 */
export async function handleReminderAction(db: SQLiteDatabase, response: Notifications.NotificationResponse): Promise<void> {
  const req = response.notification.request;
  const key = `${req.identifier}:${response.actionIdentifier}`;
  if (handled.has(key)) return;
  handled.add(key);
  await Notifications.dismissNotificationAsync(req.identifier).catch(() => undefined);

  if (response.actionIdentifier === ACTION_SNOOZE) {
    await Notifications.scheduleNotificationAsync({
      identifier: `snooze-${req.identifier.replace(/^snooze-/, '')}`,
      content: {
        title: req.content.title ?? 'Dia de aplicação',
        body: req.content.body ?? 'Hoje é dia da aplicação da semana.',
        data: req.content.data ?? { url: '/log/injection' },
        categoryIdentifier: CATEGORY,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: parseStamp(snoozeAt(toStamp(new Date()))), channelId: CHANNEL },
    });
    return;
  }
  if (response.actionIdentifier !== ACTION_DONE) return;

  const now = toStamp(new Date());
  const result = await saveFromDefaults(db, now);
  if ('saved' in result) {
    const { row, dosesLeft } = result.saved;
    const pens = await db.getAllAsync<PenRow>('SELECT * FROM pens ORDER BY id');
    const n = result.pen ? penNumbers(pens).get(result.pen.id) : null;
    const penText = n ? ` · caneta ${n}${dosesLeft !== null ? `, ${plural(dosesLeft, 'dose restante', 'doses restantes')}` : ''}` : '';
    await notifyNow(
      `done-${row.id}`,
      'Aplicação registrada',
      `${mg(row.dose_mcg ?? 0)}${row.site ? `, ${SITE_NAME[row.site]}` : ''}${penText}. Toque para conferir ou desfazer.`,
      `/log/injection?id=${row.id}`,
    );
  } else if (result.skipped === 'recent') {
    // O mesmo toque entregue duas vezes não avisa de novo.
    const fresh = daysBetween(result.recent.at, now.slice(0, 10)) === 0 && minutesBetween(result.recent.at, now) < 10;
    if (!fresh) {
      const r = result.recent;
      await notifyNow(
        `done-${r.id}`,
        'Aplicação já registrada',
        `Há um registro em ${ddmm(r.at)} às ${timeOf(r.at)}. Toque para conferir.`,
        `/log/injection?id=${r.id}`,
      );
    }
  }
  await rescheduleAll(db);
}

function minutesBetween(a: string, b: string): number {
  return Math.abs(parseStamp(b).getTime() - parseStamp(a).getTime()) / 60000;
}

async function notifyNow(identifier: string, title: string, body: string, url: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({ identifier, content: { title, body, data: { url } }, trigger: { channelId: CHANNEL } });
}

/**
 * Mantém os lembretes em dia: ao abrir o app, ao voltar para ele e depois de cada mudança em
 * aplicações, canetas ou ajustes.
 */
export function useReminderSync(): void {
  const db = useSQLiteContext();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        rescheduleAll(db).catch((error: unknown) => {
          if (__DEV__) console.warn('rescheduleAll', error);
        });
      }, 800);
    };
    void ensureChannel().then(run);
    const dbSub = addDatabaseChangeListener((e) => {
      if (e.tableName === 'injections' || e.tableName === 'pens' || e.tableName === 'settings') run();
    });
    const appSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') run();
    });
    return () => {
      if (timer) clearTimeout(timer);
      dbSub.remove();
      appSub.remove();
    };
  }, [db]);
}

/**
 * Tocar no lembrete abre a tela certa (registrar aplicação, Tratamento, Ajustes). Os botões, com o
 * app aberto, são tratados aqui; com o app em segundo plano ou fechado, pela tarefa em reminderTask.ts.
 */
export function useReminderTaps(open: (url: string) => void): void {
  const db = useSQLiteContext();
  useEffect(() => {
    const go = (r: Notifications.NotificationResponse | null, live: boolean) => {
      if (!r) return;
      if (r.actionIdentifier === ACTION_DONE || r.actionIdentifier === ACTION_SNOOZE) {
        if (live) {
          handleReminderAction(db, r).catch((error: unknown) => {
            if (__DEV__) console.warn('handleReminderAction', error);
          });
        }
        return;
      }
      const url = r.notification.request.content.data?.url;
      if (typeof url !== 'string') return;
      Notifications.clearLastNotificationResponse(); // não reabre na próxima montagem
      open(url);
    };
    go(Notifications.getLastNotificationResponse(), false);
    const sub = Notifications.addNotificationResponseReceivedListener((r) => go(r, true));
    return () => sub.remove();
  }, [db, open]);
}
