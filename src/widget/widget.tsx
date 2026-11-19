// Dados do widget, a tarefa que o Android chama (com o app aberto ou fechado) e a atualização a
// partir do app. As regras vêm do domínio (próxima aplicação, valores do registro, caneta em uso).

import { openDatabaseAsync, useSQLiteContext, addDatabaseChangeListener, type SQLiteDatabase } from 'expo-sqlite';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { requestWidgetUpdate, type WidgetTaskHandlerProps } from 'react-native-android-widget';

import type { InjectionRow, PenRow } from '@/db/queries';
import { migrate } from '@/db/schema';
import { parseSettings } from '@/db/settings';
import { injectionDefaults } from '@/domain/injection';
import { penNumbers, penOverview, usedMcgByPen } from '@/domain/pens';
import { nextDue } from '@/domain/schedule';
import { daysBetween, toDay } from '@/lib/dates';
import { dayShort, mg, plural } from '@/lib/format';
import { SITE_LABEL } from '@/lib/labels';
import { dark, light } from '@/theme/tokens';

import { NextWidget, WIDGET_NAME, type WidgetData } from './NextWidget';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export async function widgetData(db: SQLiteDatabase): Promise<WidgetData> {
  const settings = parseSettings(await db.getAllAsync('SELECT key, value FROM settings'));
  if (!settings.onboarded) return { kind: 'empty' };
  const injections = await db.getAllAsync<InjectionRow>('SELECT * FROM injections ORDER BY at, id');
  const pens = await db.getAllAsync<PenRow>('SELECT * FROM pens ORDER BY id');
  const today = toDay(new Date());
  const last = injections[injections.length - 1];
  const next = nextDue(last ? last.at.slice(0, 10) : null, settings.schedule.weekday, today);
  const d = injectionDefaults({ plan: settings.plan, injections, pens, sites: settings.sites });
  const overview = penOverview(pens, usedMcgByPen(injections), d.doseMcg, next.day, today);
  const numbers = penNumbers(pens);
  const what = `${mg(d.doseMcg)}${d.site ? ` · ${SITE_LABEL[d.site]}` : ''}`;
  const pen = overview.inUse
    ? `Caneta ${numbers.get(overview.inUse.id)} · ${plural(overview.inUseState?.dosesLeft ?? 0, 'dose', 'doses')}`
    : overview.stock.length
      ? `${plural(overview.stock.length, 'caneta', 'canetas')} no estoque`
      : 'Sem caneta';

  switch (next.state) {
    case 'today':
      return { kind: 'ok', overline: 'Aplicação de hoje', title: 'Hoje', sub: `${what} · ${settings.schedule.time}`, pen, registerUri: 'leve://log/injection', warn: false };
    case 'taken':
      return { kind: 'ok', overline: 'Aplicação da semana', title: 'Feita hoje', sub: `Próxima: ${dayShort(next.day)}`, pen, registerUri: null, warn: false };
    case 'overdue':
      return {
        kind: 'ok',
        overline: 'Não registrada',
        title: capitalize(dayShort(next.day)),
        sub: 'Se você aplicou, toque para registrar.',
        pen,
        registerUri: `leve://log/injection?day=${next.day}`,
        warn: true,
      };
    default: {
      const n = daysBetween(today, next.day);
      return {
        kind: 'ok',
        overline: 'Próxima aplicação',
        title: capitalize(dayShort(next.day)),
        sub: `${n === 1 ? 'amanhã' : `em ${n} dias`} · ${what}`,
        pen,
        registerUri: null,
        warn: false,
      };
    }
  }
}

async function render(db?: SQLiteDatabase) {
  let own: SQLiteDatabase | null = null;
  try {
    if (!db) {
      own = await openDatabaseAsync('leve.db', { useNewConnection: true }); // ver reminderTask.ts
      await migrate(own);
    }
    const data = await widgetData((db ?? own) as SQLiteDatabase);
    return { light: <NextWidget data={data} c={light} />, dark: <NextWidget data={data} c={dark} /> };
  } finally {
    await own?.closeAsync();
  }
}

/** Chamada pelo Android: widget adicionado, atualização periódica ou redimensionado. */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  if (props.widgetInfo.widgetName !== WIDGET_NAME) return;
  if (props.widgetAction === 'WIDGET_ADDED' || props.widgetAction === 'WIDGET_UPDATE' || props.widgetAction === 'WIDGET_RESIZED') {
    props.renderWidget(await render());
  }
}

/** Redesenha o widget com os dados atuais (sem widget na tela inicial, não faz nada). */
export function refreshWidget(db: SQLiteDatabase): Promise<void> {
  return requestWidgetUpdate({ widgetName: WIDGET_NAME, renderWidget: () => render(db) });
}

/** Mantém o widget em dia: ao abrir o app, ao voltar para ele e depois de cada registro ou ajuste. */
export function useWidgetSync(): void {
  const db = useSQLiteContext();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        refreshWidget(db).catch((error: unknown) => {
          if (__DEV__) console.warn('refreshWidget', error);
        });
      }, 1000);
    };
    run();
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
