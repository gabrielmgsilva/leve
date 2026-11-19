import type { SQLiteDatabase } from 'expo-sqlite';

/** Locais: Abdômen, Coxa, Braço × Esquerdo, Direito. */
export type Site = 'AE' | 'AD' | 'CE' | 'CD' | 'BE' | 'BD';

export type PenRow = {
  id: number;
  brand: string;
  total_mcg: number;
  dose_mcg: number | null; // NULL = dose ajustável
  days_open: number;
  opened_on: string | null; // NULL = fechada no estoque
  done: number; // 1 = finalizada ou descartada
  price_cents: number | null; // preço pago, em centavos (custos); NULL = não informado
};

export type InjectionRow = {
  id: number;
  at: string;
  dose_mcg: number | null; // NULL = semana pulada
  site: Site | null;
  pen_id: number | null;
  note: string | null;
};

export type WeightRow = { id: number; at: string; g: number };

/** Medida corporal em milímetros (cintura, quadril…). */
export type MeasureRow = { id: number; at: string; kind: string; mm: number };

/** Foto de progresso: o arquivo fica na pasta do app (`file` = nome dentro de photos/). */
export type PhotoRow = { id: number; at: string; file: string; note: string | null };

export type JournalRow = {
  id: number;
  at: string;
  kind: string; // 'nausea', 'fatigue', ..., 'note'
  level: number | null; // 1–3 nos sintomas
  text: string | null;
};

export type Table = 'settings' | 'pens' | 'injections' | 'weights' | 'journal' | 'measures' | 'photos';

export async function getSetting<T>(db: SQLiteDatabase, key: string, fallback: T): Promise<T> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row ? (JSON.parse(row.value) as T) : fallback;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: unknown): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, JSON.stringify(value)]);
}

export async function addWeight(db: SQLiteDatabase, at: string, g: number): Promise<number> {
  const r = await db.runAsync('INSERT INTO weights (at, g) VALUES (?, ?)', [at, g]);
  return r.lastInsertRowId;
}

export async function addInjection(db: SQLiteDatabase, row: Omit<InjectionRow, 'id'>): Promise<number> {
  const r = await db.runAsync(
    'INSERT INTO injections (at, dose_mcg, site, pen_id, note) VALUES (?, ?, ?, ?, ?)',
    [row.at, row.dose_mcg, row.site, row.pen_id, row.note],
  );
  return r.lastInsertRowId;
}

export type NewPen = Omit<PenRow, 'id' | 'price_cents'> & { price_cents?: number | null };

export async function addPen(db: SQLiteDatabase, row: NewPen): Promise<number> {
  const r = await db.runAsync(
    'INSERT INTO pens (brand, total_mcg, dose_mcg, days_open, opened_on, done, price_cents) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [row.brand, row.total_mcg, row.dose_mcg, row.days_open, row.opened_on, row.done, row.price_cents ?? null],
  );
  return r.lastInsertRowId;
}

export async function addMeasures(db: SQLiteDatabase, rows: readonly Omit<MeasureRow, 'id'>[]): Promise<number[]> {
  const ids: number[] = [];
  await db.withTransactionAsync(async () => {
    for (const row of rows) {
      const r = await db.runAsync('INSERT INTO measures (at, kind, mm) VALUES (?, ?, ?)', [row.at, row.kind, row.mm]);
      ids.push(r.lastInsertRowId);
    }
  });
  return ids;
}

export async function addPhoto(db: SQLiteDatabase, row: Omit<PhotoRow, 'id'>): Promise<number> {
  const r = await db.runAsync('INSERT INTO photos (at, file, note) VALUES (?, ?, ?)', [row.at, row.file, row.note]);
  return r.lastInsertRowId;
}

export async function addJournal(db: SQLiteDatabase, row: Omit<JournalRow, 'id'>): Promise<number> {
  const r = await db.runAsync('INSERT INTO journal (at, kind, level, text) VALUES (?, ?, ?, ?)', [
    row.at,
    row.kind,
    row.level,
    row.text,
  ]);
  return r.lastInsertRowId;
}

export type DataTable = Exclude<Table, 'settings'>;
type Row = Record<string, string | number | null>;

export async function deleteRow(db: SQLiteDatabase, table: DataTable, id: number): Promise<void> {
  await db.runAsync(`DELETE FROM ${table} WHERE id = ?`, [id]);
}

/** Lê as linhas antes de excluir, para o Desfazer devolver exatamente o que havia. */
export async function takeRows(db: SQLiteDatabase, table: DataTable, ids: readonly number[]): Promise<Row[]> {
  if (!ids.length) return [];
  const marks = ids.map(() => '?').join(', ');
  let rows: Row[] = [];
  await db.withTransactionAsync(async () => {
    rows = await db.getAllAsync<Row>(`SELECT * FROM ${table} WHERE id IN (${marks})`, [...ids]);
    await db.runAsync(`DELETE FROM ${table} WHERE id IN (${marks})`, [...ids]);
  });
  return rows;
}

/** Insere linhas com os ids originais (Desfazer e restauração do backup). */
export async function insertRows(db: SQLiteDatabase, table: Table, rows: readonly Row[]): Promise<void> {
  for (const row of rows) {
    const cols = Object.keys(row);
    await db.runAsync(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      cols.map((c) => row[c]),
    );
  }
}

export async function addPens(db: SQLiteDatabase, rows: readonly NewPen[]): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const row of rows) await addPen(db, row);
  });
}

export async function updatePen(
  db: SQLiteDatabase,
  id: number,
  patch: Partial<Pick<PenRow, 'opened_on' | 'done' | 'price_cents'>>,
): Promise<void> {
  const cols = Object.keys(patch) as (keyof typeof patch)[];
  if (!cols.length) return;
  await db.runAsync(`UPDATE pens SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, [
    ...cols.map((c) => patch[c] ?? null),
    id,
  ]);
}

/** Caneta citada por alguma aplicação não pode ser excluída (chave estrangeira). */
export async function penInUse(db: SQLiteDatabase, id: number): Promise<boolean> {
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM injections WHERE pen_id = ?', [id]);
  return (row?.n ?? 0) > 0;
}

export async function addJournalEntries(db: SQLiteDatabase, rows: readonly Omit<JournalRow, 'id'>[]): Promise<number[]> {
  const ids: number[] = [];
  await db.withTransactionAsync(async () => {
    for (const row of rows) ids.push(await addJournal(db, row));
  });
  return ids;
}

const WIPE_SQL =
  'DELETE FROM journal WHERE 1; DELETE FROM injections WHERE 1; DELETE FROM weights WHERE 1; DELETE FROM measures WHERE 1; ' +
  'DELETE FROM photos WHERE 1; DELETE FROM pens WHERE 1; DELETE FROM settings WHERE 1;';

export async function wipeAll(db: SQLiteDatabase): Promise<void> {
  // "WHERE 1" evita a otimização de truncate do SQLite, que não avisa o listener de mudanças.
  await db.withTransactionAsync(async () => {
    await db.execAsync(WIPE_SQL);
  });
}

export type AllData = {
  settings: { key: string; value: string }[];
  pens: PenRow[];
  injections: InjectionRow[];
  weights: WeightRow[];
  journal: JournalRow[];
  measures: MeasureRow[];
  photos: PhotoRow[];
};

export async function readAll(db: SQLiteDatabase): Promise<AllData> {
  return {
    settings: await db.getAllAsync('SELECT key, value FROM settings ORDER BY key'),
    pens: await db.getAllAsync('SELECT * FROM pens ORDER BY id'),
    injections: await db.getAllAsync('SELECT * FROM injections ORDER BY id'),
    weights: await db.getAllAsync('SELECT * FROM weights ORDER BY id'),
    journal: await db.getAllAsync('SELECT * FROM journal ORDER BY id'),
    measures: await db.getAllAsync('SELECT * FROM measures ORDER BY id'),
    photos: await db.getAllAsync('SELECT * FROM photos ORDER BY id'),
  };
}

/** Troca todos os dados de uma vez (restauração do backup). Se algo falhar, nada muda. */
export async function replaceAll(db: SQLiteDatabase, data: AllData): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.execAsync(WIPE_SQL);
    await insertRows(db, 'settings', data.settings);
    await insertRows(db, 'pens', data.pens);
    await insertRows(db, 'injections', data.injections);
    await insertRows(db, 'weights', data.weights);
    await insertRows(db, 'journal', data.journal);
    await insertRows(db, 'measures', data.measures);
    await insertRows(db, 'photos', data.photos);
  });
}
