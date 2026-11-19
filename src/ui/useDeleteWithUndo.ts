import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { insertRows, takeRows, type DataTable } from '@/db/queries';

import { useToast } from './Toast';

/** Exclui na hora e oferece Desfazer por 5 s; desfazer devolve as linhas com os mesmos ids (R7). */
export function useDeleteWithUndo() {
  const db = useSQLiteContext();
  const toast = useToast();
  return useCallback(
    async (table: DataTable, ids: readonly number[], message: string) => {
      const rows = await takeRows(db, table, ids);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      toast.show({
        message,
        actionLabel: 'Desfazer',
        onAction: () => {
          void insertRows(db, table, rows);
        },
      });
    },
    [db, toast],
  );
}

/** Pergunta antes de excluir (o toque numa linha abre esta escolha). */
export function confirmDelete(title: string, message: string | undefined, onConfirm: () => void): void {
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Excluir', style: 'destructive', onPress: onConfirm },
  ]);
}
