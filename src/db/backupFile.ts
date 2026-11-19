// Arquivo de backup: gravar e compartilhar, escolher e ler. As regras do formato ficam em src/domain/backup.ts.

import type { SQLiteDatabase } from 'expo-sqlite';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { backupFileName, makeBackup, parseBackup, settingsRows, type Backup, type BackupPhoto, type ParseResult } from '@/domain/backup';
import { toStamp } from '@/lib/dates';

import { cleanOrphanPhotos, photoBase64, writePhoto } from './photos';
import { readAll, replaceAll, setSetting } from './queries';

/** Gera o arquivo (com as fotos dentro) e abre o menu de compartilhar do Android (Drive, WhatsApp, Arquivos…). */
export async function exportBackup(db: SQLiteDatabase): Promise<'shared' | 'unavailable'> {
  const now = toStamp(new Date());
  const { settings, photos, ...tables } = await readAll(db);
  const withData: BackupPhoto[] = [];
  for (const p of photos) {
    const data = await photoBase64(p);
    if (data) withData.push({ ...p, data }); // arquivo sumido: a foto fica de fora do backup
  }
  const backup = makeBackup(settings, { ...tables, photos: withData }, now);

  const file = new File(Paths.cache, backupFileName(now.slice(0, 10)));
  file.create({ overwrite: true });
  await file.write(JSON.stringify(backup, null, 2));

  if (!(await Sharing.isAvailableAsync())) return 'unavailable';
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Guardar o backup do Leve' });
  await setSetting(db, 'lastBackup', now);
  return 'shared';
}

/** Abre o seletor de arquivos e valida o escolhido. null = ela desistiu. */
export async function pickBackup(): Promise<ParseResult | null> {
  // Aceita qualquer tipo: o WhatsApp e o Drive às vezes entregam o JSON sem o tipo certo.
  const picked = await File.pickFileAsync({ mimeTypes: '*/*' });
  if (picked.canceled) return null;
  try {
    return parseBackup(await picked.result.text());
  } catch {
    return { ok: false, error: 'Não foi possível ler o arquivo.' };
  }
}

/** Grava as fotos do backup e substitui todos os dados, numa transação. */
export async function restoreBackup(db: SQLiteDatabase, backup: Backup): Promise<void> {
  for (const p of backup.photos) await writePhoto(p.file, p.data);
  await replaceAll(db, {
    settings: settingsRows(backup),
    pens: backup.pens,
    injections: backup.injections,
    weights: backup.weights,
    journal: backup.journal,
    measures: backup.measures,
    photos: backup.photos.map(({ data: _data, ...row }) => row),
  });
  await cleanOrphanPhotos(db);
}
