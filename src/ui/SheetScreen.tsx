import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

import { IconButton } from './IconButton';
import { Text } from './Text';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

/** Conteúdo de um registro aberto como sheet: título, fechar, corpo rolável e botão no rodapé. */
export function SheetScreen({ title, subtitle, children, footer }: Props) {
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: c.surface }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: space.m,
          paddingHorizontal: space.xl,
          paddingTop: space.xl,
          paddingBottom: space.m,
        }}
      >
        <View style={{ gap: 2, flexShrink: 1 }}>
          <Text variant="title2" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? <Text color="text2">{subtitle}</Text> : null}
        </View>
        <IconButton icon="close" label="Fechar" variant="soft" onPress={() => router.back()} />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: space.xl, gap: space.l }}
      >
        {children}
      </ScrollView>
      {footer ? (
        <View style={{ paddingHorizontal: space.xl, paddingTop: space.s, paddingBottom: insets.bottom + space.l }}>
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
