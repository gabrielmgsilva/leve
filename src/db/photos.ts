// Fotos de progresso: arquivos JPEG na pasta privada do app (não aparecem na galeria) e uma linha
// na tabela photos. A foto é reduzida para no máximo 1280 px antes de gravar.

import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { SQLiteDatabase } from 'expo-sqlite';

import { addPhoto, type PhotoRow } from './queries';

const MAX_SIDE = 1280;

function photoDir(): Directory {
  const dir = new Directory(Paths.document, 'photos');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/** Arquivo de uma foto pelo nome gravado no banco. */
export function photoFile(name: string): File {
  return new File(photoDir(), name);
}

/** 'AAAA-MM-DD HH:MM' → 'p-20261119-0812-k3f9.jpg' */
function newName(at: string): string {
  const stamp = at.replace(/[-: ]/g, '').replace(/^(\d{8})(\d{4})$/, '$1-$2');
  return `p-${stamp}-${Math.random().toString(36).slice(2, 6)}.jpg`;
}

/** Reduz, grava na pasta do app e cria a linha. */
export async function savePhoto(
  db: SQLiteDatabase,
  source: { uri: string; width: number; height: number },
  at: string,
  note: string | null = null,
): Promise<number> {
  const ctx = ImageManipulator.manipulate(source.uri);
  if (Math.max(source.width, source.height) > MAX_SIDE) {
    ctx.resize(source.width >= source.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const image = await ctx.renderAsync();
  const saved = await image.saveAsync({ compress: 0.72, format: SaveFormat.JPEG });
  const name = newName(at);
  await new File(saved.uri).copy(photoFile(name));
  return addPhoto(db, { at, file: name, note });
}

/** Imagem em base64, para o backup. */
export async function photoBase64(row: Pick<PhotoRow, 'file'>): Promise<string | null> {
  const file = photoFile(row.file);
  return file.exists ? file.base64() : null;
}

/** Grava a imagem vinda de um backup. */
export async function writePhoto(name: string, base64: string): Promise<void> {
  const file = photoFile(name);
  if (file.exists) file.delete();
  file.create();
  await file.write(base64, { encoding: 'base64' });
}

/**
 * Apaga os arquivos que nenhuma linha usa mais (fotos excluídas depois do "Desfazer", restauração de
 * backup). Roda ao abrir o app.
 */
export async function cleanOrphanPhotos(db: SQLiteDatabase): Promise<void> {
  const rows = await db.getAllAsync<{ file: string }>('SELECT file FROM photos');
  const used = new Set(rows.map((r) => r.file));
  for (const item of photoDir().list()) {
    if (item instanceof File && !used.has(item.name)) item.delete();
  }
}
