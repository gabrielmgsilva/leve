// Ajustes guardados na tabela settings (chave → JSON), com os valores padrão.

import type { SQLiteDatabase } from 'expo-sqlite';
import { useMemo } from 'react';

import { DEFAULT_SITES } from '@/domain/sites';
import { PLAN_TEMPLATES, type PlanStep } from '@/domain/titration';
import type { ThemePref } from '@/theme/ThemeProvider';

import { setSetting, type Site } from './queries';
import { useQueryState } from './useQuery';

export type Profile = { name: string; heightCm: number | null; goalG: number | null };
export type Schedule = { weekday: number; time: string }; // 0 = domingo; 'HH:MM'
/** IMC na Evolução: escondido, só o número ou o número com a faixa da OMS. */
export type BmiPref = 'off' | 'number' | 'band';
/**
 * Lembretes: da aplicação (com reforço N horas depois se não registrar), da caneta e do backup mensal.
 * 0 h = sem reforço.
 */
export type ReminderPrefs = { injection: boolean; pen: boolean; followUpHours: number; backup: boolean };
/** Balança pelo Health Connect: importa as pesagens novas desde `lastSync` ('AAAA-MM-DD HH:MM'). */
export type HealthPrefs = { enabled: boolean; lastSync: string | null };

export type Settings = {
  profile: Profile;
  schedule: Schedule;
  plan: PlanStep[];
  sites: Site[];
  theme: ThemePref;
  bmi: BmiPref;
  reminders: ReminderPrefs;
  health: HealthPrefs;
  lastBackup: string | null; // 'AAAA-MM-DD HH:MM'
  onboarded: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  profile: { name: '', heightCm: null, goalG: null },
  schedule: { weekday: 0, time: '08:00' },
  plan: PLAN_TEMPLATES[0].steps,
  sites: DEFAULT_SITES,
  theme: 'auto',
  bmi: 'number',
  reminders: { injection: true, pen: true, followUpHours: 3, backup: true },
  health: { enabled: false, lastSync: null },
  lastBackup: null,
  onboarded: false,
};

export function parseSettings(rows: readonly { key: string; value: string }[]): Settings {
  const out: Settings = { ...DEFAULT_SETTINGS };
  const target = out as Record<string, unknown>;
  for (const { key, value } of rows) {
    if (!(key in DEFAULT_SETTINGS)) continue;
    try {
      target[key] = JSON.parse(value);
    } catch {
      // Valor ilegível: fica o padrão.
    }
  }
  out.profile = { ...DEFAULT_SETTINGS.profile, ...out.profile };
  out.schedule = { ...DEFAULT_SETTINGS.schedule, ...out.schedule };
  out.reminders = { ...DEFAULT_SETTINGS.reminders, ...out.reminders };
  out.health = { ...DEFAULT_SETTINGS.health, ...out.health };
  return out;
}

export function useSettingsState(): { settings: Settings; loaded: boolean } {
  const { rows, loaded } = useQueryState<{ key: string; value: string }>(
    'SELECT key, value FROM settings',
    [],
    ['settings'],
  );
  const settings = useMemo(() => parseSettings(rows), [rows]);
  return { settings, loaded };
}

export function useSettings(): Settings {
  return useSettingsState().settings;
}

export function saveSetting<K extends keyof Settings>(db: SQLiteDatabase, key: K, value: Settings[K]): Promise<void> {
  return setSetting(db, key, value);
}
