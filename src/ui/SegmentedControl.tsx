import * as Haptics from 'expo-haptics';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius } from '@/theme/tokens';

import { Text } from './Text';

type Option<T extends string> = { value: T; label: string; accessibilityLabel?: string };

type Props<T extends string> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  height?: number;
};

/** Escolha única em pílula: a opção ativa ganha a superfície branca. */
export function SegmentedControl<T extends string>({ options, value, onChange, accessibilityLabel, height = 36 }: Props<T>) {
  const t = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: radius.pill, backgroundColor: t.c.surface2 }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.accessibilityLabel ?? o.label}
            onPress={() => {
              if (on) return;
              void Haptics.selectionAsync();
              onChange(o.value);
            }}
            style={{
              flex: 1,
              height,
              borderRadius: radius.pill,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? t.c.segment : 'transparent',
              boxShadow: on ? t.shadow.chip : undefined,
            }}
          >
            <Text
              variant="label"
              numberOfLines={1}
              style={{ fontSize: 14, fontFamily: fonts.semibold, color: on ? t.c.ink : t.c.text2 }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
