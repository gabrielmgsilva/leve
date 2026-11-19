// Medidas corporais: registrar várias de uma vez (cintura, quadril…) e editar uma medição (?at=).

import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { useMeasures } from '@/db/hooks';
import { addMeasures, insertRows, type MeasureRow } from '@/db/queries';
import { useQueryState } from '@/db/useQuery';
import { MEASURE_KINDS, parseCm } from '@/domain/measures';
import { toStamp } from '@/lib/dates';
import { num } from '@/lib/format';
import { MEASURE_HINT, MEASURE_LABEL } from '@/lib/labels';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { InfoNote, TextField } from '@/ui/Bits';
import { Button } from '@/ui/Button';
import { DateTimeRow } from '@/ui/Phase1Bits';
import { SheetScreen } from '@/ui/SheetScreen';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';
import { confirmDelete } from '@/ui/useDeleteWithUndo';

export default function MeasuresSheet() {
  const { at } = useLocalSearchParams<{ at?: string }>();
  const { rows, loaded } = useQueryState<MeasureRow>('SELECT * FROM measures WHERE at = ? ORDER BY id', [at ?? ''], ['measures']);
  if (at && !loaded) return null;
  return <MeasuresForm key={at ?? 'new'} editing={at ? rows : null} />;
}

const cm = (mm: number) => num(mm / 10, mm % 10 === 0 ? 0 : 1);

function MeasuresForm({ editing }: { editing: MeasureRow[] | null }) {
  const t = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const toast = useToast();
  const all = useMeasures();
  const [stamp, setStamp] = useState(() => editing?.[0]?.at ?? toStamp(new Date()));
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries((editing ?? []).map((m) => [m.kind, cm(m.mm)])),
  );
  const [saving, setSaving] = useState(false);

  // A medida anterior de cada tipo, como referência no campo.
  const previous = (kind: string) => {
    const before = all.filter((m) => m.kind === kind && m.at < (editing?.[0]?.at ?? '9999'));
    return before[before.length - 1] ?? null;
  };

  const parsed = MEASURE_KINDS.map((kind) => ({ kind, text: values[kind]?.trim() ?? '', mm: parseCm(values[kind] ?? '') }));
  const invalid = parsed.filter((p) => p.text && p.mm === null);
  const filled = parsed.filter((p) => p.mm !== null) as { kind: string; text: string; mm: number }[];
  const canSave = filled.length > 0 && invalid.length === 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    const rows = filled.map((p) => ({ at: stamp, kind: p.kind, mm: p.mm }));
    if (editing) {
      const before = editing;
      await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM measures WHERE at = ?', [before[0].at]);
        await addMeasures(db, rows);
      });
      router.back();
      toast.show({
        message: 'Medição alterada.',
        actionLabel: 'Desfazer',
        onAction: () =>
          void db.withTransactionAsync(async () => {
            await db.runAsync('DELETE FROM measures WHERE at = ?', [stamp]);
            await insertRows(db, 'measures', before);
          }),
      });
      return;
    }
    const ids = await addMeasures(db, rows);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
    toast.show({
      message: filled.length === 1 ? 'Medida salva.' : `${filled.length} medidas salvas.`,
      actionLabel: 'Desfazer',
      onAction: () => void db.runAsync(`DELETE FROM measures WHERE id IN (${ids.map(() => '?').join(', ')})`, ids),
    });
  };

  const remove = () =>
    editing?.length &&
    confirmDelete('Excluir esta medição?', 'Todas as medidas deste dia e horário saem do app.', () => {
      const rows = editing;
      void db.runAsync('DELETE FROM measures WHERE at = ?', [rows[0].at]).then(() => {
        router.back();
        toast.show({ message: 'Medição excluída', actionLabel: 'Desfazer', onAction: () => void insertRows(db, 'measures', rows) });
      });
    });

  return (
    <SheetScreen title={editing ? 'Editar medidas' : 'Medidas'} subtitle="Preencha só as que você mediu, em centímetros">
      <DateTimeRow stamp={stamp} onChange={setStamp} maxDate={new Date()} />
      {MEASURE_KINDS.map((kind) => {
        const prev = previous(kind);
        const p = parsed.find((x) => x.kind === kind);
        return (
          <TextField
            key={kind}
            label={MEASURE_LABEL[kind]}
            value={values[kind] ?? ''}
            onChangeText={(v) => setValues((cur) => ({ ...cur, [kind]: v }))}
            keyboardType="decimal-pad"
            suffix="cm"
            maxLength={5}
            placeholder={prev ? cm(prev.mm) : undefined}
            hint={`${MEASURE_HINT[kind]}${prev ? ` · última: ${cm(prev.mm)} cm` : ''}`}
            error={p && p.text && p.mm === null ? 'Use centímetros, de 10 a 300, com até uma casa (ex.: 90,5).' : null}
          />
        );
      })}
      <InfoNote icon={null}>Meça de manhã, com a fita firme mas sem apertar, sempre no mesmo ponto.</InfoNote>
      <Button label={editing ? 'Salvar alterações' : 'Salvar medidas'} onPress={() => void save()} disabled={!canSave} />
      {editing?.length ? (
        <Pressable accessibilityRole="button" onPress={remove} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: fonts.semibold, color: t.c.danger }}>Excluir medição</Text>
        </Pressable>
      ) : null}
    </SheetScreen>
  );
}
