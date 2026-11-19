// Entrada do app: as tarefas que o Android chama sem a tela aberta precisam ser registradas antes do
// Expo Router (botões do lembrete e widget da tela inicial).

import { registerWidgetTaskHandler } from 'react-native-android-widget';

import './src/db/reminderTask';
import { widgetTaskHandler } from './src/widget/widget';
import 'expo-router/entry';

registerWidgetTaskHandler(widgetTaskHandler);
