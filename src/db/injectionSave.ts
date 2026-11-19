// Gravar uma aplicação nova: o mesmo caminho para o formulário e para o "Já apliquei" do lembrete.

import type { SQLiteDatabase } from 'expo-sqlite';

import { injectionDefaults, nearbyRecord, openingDay, penOutcome } from '@/domain/injection';
import { usedMcgByPen } from '@/domain/pens';

import { addInjection, addJournal, deleteRow, updatePen, type InjectionRow, type PenRow, type Site } from './queries';
import { parseSettings } from './settings';

export type Undo = () => Promise<unknown>;

export type SaveInput = {
  stamp: string;
  doseMcg: number;
  site: Site | null;
  pen: PenRow | null;
  /** mg já aplicados com a caneta, antes desta aplicação. */
  usedBeforeMcg: number;
  feel?: readonly string[];
  note?: string | null;
};

export type SaveResult = {
  row: InjectionRow;
  /** Na ordem em que foram feitas; o Desfazer roda de trás para a frente. */
  undo: Undo[];
  finished: PenRow | null;
  dosesLeft: number | null;
};

/** Abre a caneta (R3), grava a aplicação e os sintomas e finaliza a caneta que acabou, numa transação. */
export async function saveInjection(db: SQLiteDatabase, input: SaveInput): Promise<SaveResult> {
  const { stamp, doseMcg, site, pen } = input;
  const undo: Undo[] = [];
  let finished: PenRow | null = null;
  let dosesLeft: number | null = null;
  let row: InjectionRow | null = null;
  await db.withTransactionAsync(async () => {
    const opening = pen ? openingDay(pen, stamp.slice(0, 10)) : null;
    if (pen && opening) {
      await updatePen(db, pen.id, { opened_on: opening });
      undo.push(() => updatePen(db, pen.id, { opened_on: pen.opened_on }));
    }
    const data = { at: stamp, dose_mcg: doseMcg, site, pen_id: pen?.id ?? null, note: input.note?.trim() || null };
    const id = await addInjection(db, data);
    row = { id, ...data };
    undo.push(() => deleteRow(db, 'injections', id));
    for (const kind of input.feel ?? []) {
      const jid = await addJournal(db, { at: stamp, kind, level: kind === 'well' ? null : 1, text: null });
      undo.push(() => deleteRow(db, 'journal', jid));
    }
    if (pen) {
      const out = penOutcome(pen, input.usedBeforeMcg, doseMcg, doseMcg);
      dosesLeft = out.dosesLeftAfter;
      if (out.finishes) {
        await updatePen(db, pen.id, { done: 1 });
        undo.push(() => updatePen(db, pen.id, { done: 0 }));
        finished = pen;
      }
    }
  });
  return { row: row as unknown as InjectionRow, undo, finished, dosesLeft };
}

/** Desfaz uma gravação: de trás para a frente, numa transação. */
export async function undoSave(db: SQLiteDatabase, undo: readonly Undo[]): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const u of [...undo].reverse()) await u();
  });
}

export type QuickResult = { saved: SaveResult; pen: PenRow | null } | { skipped: 'recent'; recent: InjectionRow } | { skipped: 'notReady' };

/**
 * "Já apliquei" no lembrete: grava agora a aplicação com os valores do formulário (dose atual do
 * plano, local sugerido, caneta que entrega a dose). Não grava se já houver registro a menos de 3 dias.
 */
export async function saveFromDefaults(db: SQLiteDatabase, stamp: string): Promise<QuickResult> {
  const settings = parseSettings(await db.getAllAsync('SELECT key, value FROM settings'));
  if (!settings.onboarded) return { skipped: 'notReady' };
  const injections = await db.getAllAsync<InjectionRow>('SELECT * FROM injections ORDER BY at, id');
  const recent = nearbyRecord(injections, stamp);
  if (recent) return { skipped: 'recent', recent };
  const pens = await db.getAllAsync<PenRow>('SELECT * FROM pens ORDER BY id');
  const d = injectionDefaults({ plan: settings.plan, injections, pens, sites: settings.sites });
  const pen = pens.find((p) => p.id === d.penId) ?? null;
  const used = usedMcgByPen(injections);
  const saved = await saveInjection(db, {
    stamp,
    doseMcg: d.doseMcg,
    site: d.site,
    pen,
    usedBeforeMcg: pen ? (used.get(pen.id) ?? 0) : 0,
  });
  return { saved, pen };
}
