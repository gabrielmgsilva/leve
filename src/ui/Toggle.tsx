import * as Haptics from 'expo-haptics';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

type Props = { value: boolean; onValueChange: (value: boolean) => void; label: string };

/** Interruptor do desenho (52 × 32): tinta quando ligado. */
export function Toggle({ value, onValueChange, label }: Props) {
  const t = useTheme();
  const knob = value ? t.c.onInk : t.dark ? t.c.text2 : t.c.surface;
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      hitSlop={6}
      onPress={() => {
        void Haptics.selectionAsync();
        onValueChange(!value);
      }}
      style={{
        width: 52,
        height: 32,
        flexShrink: 0,
        borderRadius: radius.pill,
        padding: 3,
        backgroundColor: value ? t.c.ink : t.c.track,
        alignItems: value ? 'flex-end' : 'flex-start',
      }}
    >
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: radius.pill,
          backgroundColor: knob,
          boxShadow: t.shadow.knob,
        }}
      />
    </Pressable>
  );
}
