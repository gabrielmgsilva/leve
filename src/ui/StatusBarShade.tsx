import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

/** Faixa da cor do fundo atrás da barra de status: o conteúdo rola por baixo sem misturar com a hora. */
export function StatusBarShade() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: c.bg }}
    />
  );
}
