import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type Tone = 'surface' | 'med' | 'body' | 'warn';

type Props = {
  children: ReactNode;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, tone = 'surface', style }: Props) {
  const t = useTheme();
  const bg = { surface: t.c.surface, med: t.c.medSoft, body: t.c.bodySoft, warn: t.c.warnSoft }[tone];
  return (
    <View
      style={[
        {
          backgroundColor: bg,
          borderRadius: radius.card,
          padding: space.xl,
          gap: space.l,
          boxShadow: tone === 'surface' ? t.shadow.card : undefined,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
