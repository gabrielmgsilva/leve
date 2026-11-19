import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { useSettingsState } from '@/db/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { FloatingTabBar } from '@/ui/FloatingTabBar';

export default function TabsLayout() {
  const t = useTheme();
  const { settings, loaded } = useSettingsState();
  // Primeiro acesso: os primeiros passos antes das abas.
  if (loaded && !settings.onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.c.bg } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Hoje' }} />
      <Tabs.Screen name="progress" options={{ title: 'Evolução' }} />
      <Tabs.Screen name="treatment" options={{ title: 'Tratamento' }} />
      <Tabs.Screen name="journal" options={{ title: 'Diário' }} />
    </Tabs>
  );
}
