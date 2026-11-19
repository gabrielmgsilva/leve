import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useState, type ReactNode } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

const ICON_BY_ROUTE: Record<string, IconName> = {
  index: 'sun',
  progress: 'chart',
  treatment: 'pen',
  journal: 'book',
};

function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

/** Menu flutuante: pílula solta da borda, 4 abas e o + no centro (docs/02-design.md § 3). */
export function FloatingTabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const t = useTheme();
  const router = useRouter();
  const keyboardVisible = useKeyboardVisible();
  if (keyboardVisible) return null;

  const tabs: ReactNode[] = state.routes.map((route, index) => {
    const focused = index === state.index;
    const { options } = descriptors[route.key];
    const label = typeof options.title === 'string' ? options.title : route.name;
    const color = focused ? t.c.ink : t.c.text3;

    const onPress = () => {
      const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) {
        void Haptics.selectionAsync();
        navigateToTab(route.key);
      }
    };

    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [
          styles.item,
          focused && { backgroundColor: t.c.surface2 },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Icon name={ICON_BY_ROUTE[route.name] ?? 'sun'} size={22} color={color} strokeWidth={focused ? 2 : 1.75} />
        <Text
          numberOfLines={1}
          variant="caption"
          style={{ fontSize: 11, lineHeight: 13, color, fontFamily: focused ? fonts.bold : fonts.semibold }}
        >
          {label}
        </Text>
      </Pressable>
    );
  });

  const plus = (
    <Pressable
      key="new"
      accessibilityRole="button"
      accessibilityLabel="Novo registro"
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/new');
      }}
      style={({ pressed }) => [
        styles.plus,
        { backgroundColor: t.c.ink, boxShadow: t.shadow.plus },
        pressed && { transform: [{ scale: 0.94 }] },
      ]}
    >
      <Icon name="plus" size={24} color={t.c.onInk} strokeWidth={2} />
    </Pressable>
  );

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 8 }]}>
      <View
        style={[
          styles.bar,
          { backgroundColor: t.c.tabBar, borderColor: t.c.line, boxShadow: t.shadow.bar },
        ]}
      >
        {tabs.slice(0, 2)}
        {plus}
        {tabs.slice(2)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16 },
  bar: {
    height: 68,
    borderRadius: radius.pill,
    borderWidth: 1,
    padding: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  item: {
    flex: 1,
    height: 54,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  plus: {
    width: 54,
    height: 54,
    marginHorizontal: 4,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
