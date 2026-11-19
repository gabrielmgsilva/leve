import type { SQLiteDatabase } from 'expo-sqlite';

// Banco enxuto: 7 tabelas (docs/03-arquitetura.md § 4).
// Gramas e microgramas inteiros; datas em texto local 'AAAA-MM-DD HH:MM'.
// Cada item da lista é uma versão; nunca altere uma versão já publicada, acrescente outra.
const MIGRATIONS: string[] = [
  `
  CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE pens (
    id        INTEGER PRIMARY KEY,
    brand     TEXT    NOT NULL,
    total_mcg INTEGER NOT NULL,
    dose_mcg  INTEGER,
    days_open INTEGER NOT NULL DEFAULT 42,
    opened_on TEXT,
    done      INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE injections (
    id       INTEGER PRIMARY KEY,
    at       TEXT    NOT NULL,
    dose_mcg INTEGER,
    site     TEXT,
    pen_id   INTEGER REFERENCES pens(id),
    note     TEXT
  );
  CREATE TABLE weights (
    id INTEGER PRIMARY KEY,
    at TEXT    NOT NULL,
    g  INTEGER NOT NULL
  );
  CREATE TABLE journal (
    id    INTEGER PRIMARY KEY,
    at    TEXT    NOT NULL,
    kind  TEXT    NOT NULL,
    level INTEGER,
    text  TEXT
  );
  CREATE INDEX injections_at ON injections(at);
  CREATE INDEX weights_at ON weights(at);
  CREATE INDEX journal_at ON journal(at);
  `,
  // v2: preço da caneta (custos), medidas corporais e fotos de progresso.
  `
  ALTER TABLE pens ADD COLUMN price_cents INTEGER;
  CREATE TABLE measures (
    id   INTEGER PRIMARY KEY,
    at   TEXT    NOT NULL,
    kind TEXT    NOT NULL,
    mm   INTEGER NOT NULL
  );
  CREATE TABLE photos (
    id   INTEGER PRIMARY KEY,
    at   TEXT    NOT NULL,
    file TEXT    NOT NULL,
    note TEXT
  );
  CREATE INDEX measures_at ON measures(at);
  CREATE INDEX photos_at ON photos(at);
  `,
];

export async function migrate(db: SQLiteDatabase): Promise<void> {
  // busy_timeout: a tarefa do lembrete e a do widget usam outra conexão; quem chega depois espera em vez de falhar.
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 4000;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  for (let v = row?.user_version ?? 0; v < MIGRATIONS.length; v++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[v]);
      await db.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
}
