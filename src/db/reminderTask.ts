// Botões do lembrete com o app em segundo plano ou fechado: o Android acorda o JS só para esta
// tarefa (expo-task-manager). Precisa ser definida no carregamento do app (ver index.ts na raiz).

import * as Notifications from 'expo-notifications';
import { openDatabaseAsync } from 'expo-sqlite';
import * as TaskManager from 'expo-task-manager';

import { handleReminderAction } from './reminders';
import { migrate } from './schema';

export const REMINDER_TASK = 'leve-lembrete-acoes';

TaskManager.defineTask<Notifications.NotificationTaskPayload>(REMINDER_TASK, async ({ data, error }) => {
  if (error || !data || !('actionIdentifier' in data)) return;
  // Conexão própria: com o app aberto, a padrão seria a mesma da tela, e fechá-la derrubaria o app.
  const db = await openDatabaseAsync('leve.db', { useNewConnection: true });
  try {
    await migrate(db);
    await handleReminderAction(db, data);
  } finally {
    await db.closeAsync();
  }
});

Notifications.registerTaskAsync(REMINDER_TASK).catch(() => undefined);
