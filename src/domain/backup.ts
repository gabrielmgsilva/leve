// Backup em JSON: montar, validar e resumir (docs/03-arquitetura.md § 7). A leitura e a gravação do arquivo ficam em src/db.

import type { InjectionRow, JournalRow, MeasureRow, PenRow, PhotoRow, Site, WeightRow } from '@/db/queries';

/** v2: preço da caneta, medidas e fotos (com a imagem em base64). Um backup v1 continua valendo. */
export const BACKUP_VERSION = 2;

/** Foto no backup: a linha e a imagem JPEG em base64. */
export type BackupPhoto = PhotoRow & { data: string };

export type BackupTables = {
  pens: PenRow[];
  injections: InjectionRow[];
  weights: WeightRow[];
  journal: JournalRow[];
  measures: MeasureRow[];
  photos: BackupPhoto[];
};

export type Backup = BackupTables & {
  app: 'leve';
  version: number;
  exportedAt: string; // 'AAAA-MM-DD HH:MM'
  settings: Record<string, unknown>;
};

/** Monta o backup. Os valores dos ajustes vão como objetos, não como texto, para o arquivo ficar legível. */
export function makeBackup(
  settingsRows: readonly { key: string; value: string }[],
  tables: BackupTables,
  exportedAt: string,
): Backup {
  const settings: Record<string, unknown> = {};
  for (const { key, value } of settingsRows) {
    try {
      settings[key] = JSON.parse(value);
    } catch {
      settings[key] = value;
    }
  }
  return { app: 'leve', version: BACKUP_VERSION, exportedAt, settings, ...tables };
}

/** Linhas da tabela settings a partir do backup. */
export function settingsRows(backup: Backup): { key: string; value: string }[] {
  return Object.entries(backup.settings).map(([key, value]) => ({ key, value: JSON.stringify(value) }));
}

export type ParseResult = { ok: true; backup: Backup } | { ok: false; error: string };

const SITES: readonly Site[] = ['AE', 'AD', 'CE', 'CD', 'BE', 'BD'];
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const STAMP_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isId = (v: unknown) => Number.isInteger(v) && (v as number) > 0;
const isPosInt = (v: unknown) => Number.isInteger(v) && (v as number) > 0;
const isStamp = (v: unknown) => typeof v === 'string' && STAMP_RE.test(v);
const isDay = (v: unknown) => typeof v === 'string' && DAY_RE.test(v);
const isText = (v: unknown) => typeof v === 'string';
const orNull = (check: (v: unknown) => boolean) => (v: unknown) => v === null || check(v);

const PHOTO_FILE_RE = /^[\w-]+\.jpg$/;
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

type TableCheck = {
  label: string;
  fields: Record<string, (v: unknown) => boolean>;
  /** Campos que um backup antigo não tem, com o valor que entra no lugar. */
  defaults?: Record<string, unknown>;
};

const CHECKS: { [K in keyof BackupTables]: TableCheck } = {
  pens: {
    label: 'caneta',
    fields: {
      id: isId,
      brand: (v) => typeof v === 'string' && v.trim().length > 0,
      total_mcg: isPosInt,
      dose_mcg: orNull(isPosInt),
      days_open: isPosInt,
      opened_on: orNull(isDay),
      done: (v) => v === 0 || v === 1,
      price_cents: orNull((v) => Number.isInteger(v) && (v as number) >= 0),
    },
    defaults: { price_cents: null },
  },
  injections: {
    label: 'aplicação',
    fields: {
      id: isId,
      at: isStamp,
      dose_mcg: orNull(isPosInt),
      site: orNull((v) => SITES.includes(v as Site)),
      pen_id: orNull(isId),
      note: orNull(isText),
    },
  },
  weights: {
    label: 'pesagem',
    fields: { id: isId, at: isStamp, g: (v) => Number.isInteger(v) && (v as number) >= 30000 && (v as number) <= 300000 },
  },
  journal: {
    label: 'anotação',
    fields: {
      id: isId,
      at: isStamp,
      kind: (v) => typeof v === 'string' && v.length > 0,
      level: orNull((v) => v === 1 || v === 2 || v === 3),
      text: orNull(isText),
    },
  },
  measures: {
    label: 'medida',
    fields: {
      id: isId,
      at: isStamp,
      kind: (v) => typeof v === 'string' && v.length > 0,
      mm: (v) => Number.isInteger(v) && (v as number) > 0 && (v as number) <= 5000,
    },
  },
  photos: {
    label: 'foto',
    fields: {
      id: isId,
      at: isStamp,
      file: (v) => typeof v === 'string' && PHOTO_FILE_RE.test(v),
      note: orNull(isText),
      data: (v) => typeof v === 'string' && v.length > 0 && BASE64_RE.test(v),
    },
  },
};

/** Tabelas que um backup v1 não tem. */
const NEW_IN_V2: readonly (keyof BackupTables)[] = ['measures', 'photos'];

/** Lê e valida o texto de um backup. Os erros vêm prontos para mostrar. */
export function parseBackup(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'O arquivo não é um backup do Leve.' };
  }
  if (!isObj(data) || data.app !== 'leve') return { ok: false, error: 'O arquivo não é um backup do Leve.' };
  if (!Number.isInteger(data.version) || (data.version as number) < 1) {
    return { ok: false, error: 'O backup está incompleto ou corrompido.' };
  }
  if ((data.version as number) > BACKUP_VERSION) {
    return { ok: false, error: 'Este backup veio de uma versão mais nova do Leve. Atualize o app e tente de novo.' };
  }
  if (!isStamp(data.exportedAt) || !isObj(data.settings)) {
    return { ok: false, error: 'O backup está incompleto ou corrompido.' };
  }

  for (const table of Object.keys(CHECKS) as (keyof BackupTables)[]) {
    if (data[table] === undefined && NEW_IN_V2.includes(table)) data[table] = [];
    const rows = data[table];
    const { label, fields, defaults } = CHECKS[table];
    if (!Array.isArray(rows)) return { ok: false, error: 'O backup está incompleto ou corrompido.' };
    const ids = new Set<number>();
    for (let i = 0; i < rows.length; i++) {
      const row: unknown = defaults && isObj(rows[i]) ? { ...defaults, ...(rows[i] as Obj) } : rows[i];
      rows[i] = row;
      const valid =
        isObj(row) && Object.entries(fields).every(([name, check]) => name in row && check(row[name]));
      if (!valid || ids.has(row.id as number)) {
        return { ok: false, error: `O backup está corrompido (${label} ${i + 1}).` };
      }
      ids.add(row.id as number);
    }
  }

  const penIds = new Set((data.pens as Obj[]).map((p) => p.id as number));
  const orphan = (data.injections as Obj[]).findIndex((i) => i.pen_id !== null && !penIds.has(i.pen_id as number));
  if (orphan >= 0) return { ok: false, error: `O backup está corrompido (aplicação ${orphan + 1}).` };

  // Só os campos conhecidos seguem para o banco.
  const pick = <T,>(rows: unknown, fields: Record<string, unknown>): T[] =>
    (rows as Obj[]).map((r) => Object.fromEntries(Object.keys(fields).map((k) => [k, r[k]])) as T);

  return {
    ok: true,
    backup: {
      app: 'leve',
      version: data.version as number,
      exportedAt: data.exportedAt as string,
      settings: data.settings,
      pens: pick<PenRow>(data.pens, CHECKS.pens.fields),
      injections: pick<InjectionRow>(data.injections, CHECKS.injections.fields),
      weights: pick<WeightRow>(data.weights, CHECKS.weights.fields),
      journal: pick<JournalRow>(data.journal, CHECKS.journal.fields),
      measures: pick<MeasureRow>(data.measures, CHECKS.measures.fields),
      photos: pick<BackupPhoto>(data.photos, CHECKS.photos.fields),
    },
  };
}

export type BackupCounts = { weights: number; injections: number; pens: number; journal: number; measures: number; photos: number };

export function backupCounts(b: BackupTables): BackupCounts {
  return {
    weights: b.weights.length,
    injections: b.injections.filter((i) => i.dose_mcg !== null).length,
    pens: b.pens.length,
    journal: b.journal.length,
    measures: new Set(b.measures.map((m) => m.at)).size, // medições (várias medidas no mesmo instante contam uma vez)
    photos: b.photos.length,
  };
}

export function backupFileName(day: string): string {
  return `leve-backup-${day}.json`;
}
