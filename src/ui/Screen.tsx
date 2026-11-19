import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

import { StatusBarShade } from './StatusBarShade';
import { Text } from './Text';

type Props = {
  title: string;
  eyebrow?: string;
  /** Linha de apoio abaixo do título. */
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
};

/** Tela rolável com título; reserva espaço no fim para o menu flutuante. */
export function Screen({ title, eyebrow, subtitle, right, children }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + space.l,
          paddingHorizontal: space.xl,
          paddingBottom: insets.bottom + 120,
          gap: space.m,
        }}
      >
        <View style={{ gap: 2, marginBottom: space.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.m }}>
            <View style={{ gap: 2, flexShrink: 1 }}>
              {eyebrow ? (
                <Text variant="label" color="text3">
                  {eyebrow}
                </Text>
              ) : null}
              <Text variant="title1" accessibilityRole="header">
                {title}
              </Text>
            </View>
            {right}
          </View>
          {subtitle ? (
            <Text variant="label" color="text2" style={{ fontSize: 14, lineHeight: 20 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {children}
      </ScrollView>
      <StatusBarShade />
    </View>
  );
}
