import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

import { IconButton } from './IconButton';
import { StatusBarShade } from './StatusBarShade';
import { Text } from './Text';

type Props = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children?: ReactNode;
  /** Rodapé fixo (botão de salvar), fora da rolagem. */
  footer?: ReactNode;
};

/** Tela empilhada (Ajustes, canetas, histórico): voltar, título e conteúdo rolável. */
export function SubScreen({ title, subtitle, right, children, footer }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + space.m,
          paddingHorizontal: space.xl,
          paddingBottom: (footer ? space.xl : insets.bottom + space.xxxl),
          gap: space.xl,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
          <IconButton icon="chevronLeft" label="Voltar" onPress={() => router.back()} />
          <View style={{ flex: 1, gap: 1 }}>
            <Text variant="title1" accessibilityRole="header" numberOfLines={2}>
              {title}
            </Text>
            {subtitle ? <Text color="text2">{subtitle}</Text> : null}
          </View>
          {right}
        </View>
        {children}
      </ScrollView>
      <StatusBarShade />
      {footer ? (
        <View
          style={{
            paddingHorizontal: space.xl,
            paddingTop: space.m,
            paddingBottom: insets.bottom + space.l,
            backgroundColor: c.bg,
            borderTopWidth: 1,
            borderTopColor: c.line,
          }}
        >
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
