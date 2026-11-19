// Importa só os 5 pesos usados (o índice do pacote levaria as 16 variações para o APK).
import { PlusJakartaSans_300Light } from '@expo-google-fonts/plus-jakarta-sans/300Light';
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { useFonts } from 'expo-font';
import { useRouter, type Href } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect } from 'react';

import { useHealthSync } from '@/db/health';
import { cleanOrphanPhotos } from '@/db/photos';
import { getSetting } from '@/db/queries';
import { useReminderSync, useReminderTaps } from '@/db/reminders';
import { migrate } from '@/db/schema';
import { applyThemePref, ThemeProvider, useTheme, type ThemePref } from '@/theme/ThemeProvider';
import { useWidgetSync } from '@/widget/widget';
import { radius } from '@/theme/tokens';
import { ToastProvider } from '@/ui/Toast';

void SplashScreen.preventAutoHideAsync();

/** Abre o banco e aplica o tema escolhido antes da primeira tela (sem piscar). */
async function init(db: SQLiteDatabase): Promise<void> {
  await migrate(db);
  applyThemePref(await getSetting<ThemePref>(db, 'theme', 'auto'));
  cleanOrphanPhotos(db).catch(() => undefined); // fotos excluídas de vez (depois do "Desfazer")
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    PlusJakartaSans_300Light,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hide();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SQLiteProvider databaseName="leve.db" onInit={init} options={{ enableChangeListener: true }}>
      <ThemeProvider>
        <ToastProvider>
          <Navigator />
        </ToastProvider>
      </ThemeProvider>
    </SQLiteProvider>
  );
}

function Navigator() {
  const t = useTheme();
  const router = useRouter();
  useReminderSync();
  useReminderTaps(useCallback((url: string) => router.push(url as Href), [router]));
  useWidgetSync();
  useHealthSync();
  // Registros abrem como sheet nativo e voltam para onde ela estava.
  const sheet = (detent: number) => ({
    presentation: 'formSheet' as const,
    sheetAllowedDetents: [detent],
    sheetCornerRadius: radius.sheet,
    contentStyle: { backgroundColor: t.c.surface },
  });
  return (
    <>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.c.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="new" options={sheet(0.8)} />
        <Stack.Screen name="log/measures" options={sheet(1)} />
        <Stack.Screen name="log/symptoms" options={sheet(0.85)} />
        <Stack.Screen name="log/note" options={sheet(0.9)} />
        <Stack.Screen name="log/weight" options={sheet(1)} />
        <Stack.Screen name="log/injection" options={{ animation: 'slide_from_bottom', contentStyle: { backgroundColor: t.c.surface } }} />
        <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
      </Stack>
    </>
  );
}
