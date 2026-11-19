import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { addJournal, deleteRow, insertRows, type JournalRow } from '@/db/queries';
import { useQueryState } from '@/db/useQuery';
import { toStamp } from '@/lib/dates';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { TextField } from '@/ui/Bits';
import { Button } from '@/ui/Button';
import { SheetScreen } from '@/ui/SheetScreen';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';
import { confirmDelete } from '@/ui/useDeleteWithUndo';

export default function NoteSheet() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { rows, loaded } = useQueryState<JournalRow>('SELECT * FROM journal WHERE id = ?', [Number(id ?? 0)], ['journal']);
  if (id && !loaded) return null;
  return <NoteForm key={rows[0]?.id ?? 'new'} editing={id ? (rows[0] ?? null) : null} />;
}

function NoteForm({ editing }: { editing: JournalRow | null }) {
  const t = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const toast = useToast();
  const [text, setText] = useState(editing?.text ?? '');
  const [saving, setSaving] = useState(false);
  const value = text.trim();

  const save = async () => {
    if (!value || saving) return;
    setSaving(true);
    if (editing) {
      await db.runAsync('UPDATE journal SET text = ? WHERE id = ?', [value, editing.id]);
      router.back();
      toast.show({ message: 'Nota alterada.', actionLabel: 'Desfazer', onAction: () => void db.runAsync('UPDATE journal SET text = ? WHERE id = ?', [editing.text, editing.id]) });
      return;
    }
    const id = await addJournal(db, { at: toStamp(new Date()), kind: 'note', level: null, text: value });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
    toast.show({ message: 'Nota salva no Diário', actionLabel: 'Desfazer', onAction: () => void deleteRow(db, 'journal', id) });
  };

  const remove = () =>
    editing &&
    confirmDelete('Excluir esta nota?', undefined, () => {
      void deleteRow(db, 'journal', editing.id).then(() => {
        router.back();
        toast.show({ message: 'Nota excluída', actionLabel: 'Desfazer', onAction: () => void insertRows(db, 'journal', [editing]) });
      });
    });

  return (
    <SheetScreen title={editing ? 'Editar nota' : 'Nota'} subtitle="Um pensamento, uma conquista, algo para contar na consulta">
      <TextField label="Sua nota" value={text} onChangeText={setText} multiline maxLength={1000} autoFocus={!editing} placeholder="Escreva aqui" />
      {/* O botão fica logo abaixo do campo: num sheet, o teclado cobriria um rodapé. */}
      <Button label={editing ? 'Salvar alterações' : 'Salvar nota'} onPress={() => void save()} disabled={!value || saving} />
      {editing ? (
        <Pressable accessibilityRole="button" onPress={remove} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: fonts.semibold, color: t.c.danger }}>Excluir nota</Text>
        </Pressable>
      ) : null}
    </SheetScreen>
  );
}
