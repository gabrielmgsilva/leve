// Balança inteligente pelo Health Connect: só leitura do peso. O que importar vem de src/domain/health.ts.

import type { SQLiteDatabase } from 'expo-sqlite';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import {
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

import { importableWeights, type HealthWeight } from '@/domain/health';
import { parseStamp, toStamp } from '@/lib/dates';

import { setSetting } from './queries';
import { parseSettings } from './settings';

export type HealthStatus = 'available' | 'update' | 'unavailable';

const WEIGHT_READ = { accessType: 'read', recordType: 'Weight' } as const;
const FIRST_IMPORT_DAYS = 30; // o Health Connect só entrega 30 dias antes da permissão
const OVERLAP_DAYS = 2; // a balança às vezes sincroniza com atraso
const MIN_INTERVAL_MS = 15 * 60 * 1000;

export async function healthStatus(): Promise<HealthStatus> {
  try {
    const s = await getSdkStatus();
    if (s === SdkAvailabilityStatus.SDK_AVAILABLE) return 'available';
    if (s === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'update';
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}

export async function healthGranted(): Promise<boolean> {
  if (!(await initialize())) return false;
  const granted = await getGrantedPermissions();
  return granted.some((p) => p.accessType === 'read' && 'recordType' in p && p.recordType === 'Weight');
}

/** Pede a leitura do peso. true = permitido. */
export async function connectHealth(): Promise<boolean> {
  if (!(await initialize())) return false;
  const granted = await requestPermission([WEIGHT_READ]);
  return granted.some((p) => p.accessType === 'read' && 'recordType' in p && p.recordType === 'Weight');
}

/** Lê as pesagens novas e grava as que ainda não estão no app. Devolve quantas entraram. */
export async function importFromHealth(db: SQLiteDatabase): Promise<number> {
  if (!(await healthGranted())) return 0;
  const settings = parseSettings(await db.getAllAsync('SELECT key, value FROM settings'));
  const since = settings.health.lastSync ? parseStamp(settings.health.lastSync) : new Date(Date.now() - FIRST_IMPORT_DAYS * 864e5);
  since.setDate(since.getDate() - (settings.health.lastSync ? OVERLAP_DAYS : 0));

  const records: HealthWeight[] = [];
  let pageToken: string | undefined;
  do {
    const page = await readRecords('Weight', {
      timeRangeFilter: { operator: 'after', startTime: since.toISOString() },
      pageSize: 500,
      ...(pageToken ? { pageToken } : {}),
    });
    for (const r of page.records) records.push({ time: r.time, kg: r.weight.inKilograms });
    pageToken = page.pageToken || undefined;
  } while (pageToken);

  const existing = await db.getAllAsync<{ at: string; g: number }>('SELECT at, g FROM weights');
  const rows = importableWeights(records, existing);
  await db.withTransactionAsync(async () => {
    for (const w of rows) await db.runAsync('INSERT INTO weights (at, g) VALUES (?, ?)', [w.at, w.g]);
    await setSetting(db, 'health', { ...settings.health, lastSync: toStamp(new Date()) });
  });
  return rows.length;
}

let lastRun = 0;
let running: Promise<void> | null = null;

/** Com a balança ligada, importa ao abrir o app e ao voltar para ele (no máximo a cada 15 min, uma de cada vez). */
export function useHealthSync(): void {
  const db = useSQLiteContext();
  useEffect(() => {
    const run = async () => {
      if (running || Date.now() - lastRun < MIN_INTERVAL_MS) return;
      lastRun = Date.now();
      const settings = parseSettings(await db.getAllAsync('SELECT key, value FROM settings'));
      if (!settings.health.enabled || (await healthStatus()) !== 'available') return;
      await importFromHealth(db);
    };
    const go = () => {
      running ??= run()
        .catch((error: unknown) => {
          if (__DEV__) console.warn('importFromHealth', error);
        })
        .finally(() => {
          running = null;
        });
    };
    go();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') go();
    });
    return () => sub.remove();
  }, [db]);
}
