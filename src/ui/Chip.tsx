import * as Haptics from 'expo-haptics';
import { Pressable } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

import { Text } from './Text';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** checkbox para escolhas múltiplas, radio para escolha única. */
  role?: 'checkbox' | 'radio';
  accessibilityLabel?: string;
  /** Destaque discreto (sem seleção), como a sugestão de um local. */
  hint?: boolean;
};

/** Chip selecionável: contorno quando livre, tinta cheia quando escolhido. */
export function Chip({ label, selected, onPress, role = 'checkbox', accessibilityLabel, hint = false }: Props) {
  const { c } = useTheme();
  const border = selected ? c.ink : hint ? c.med : c.line;
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={role === 'radio' ? { selected } : { checked: selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => ({
        minHeight: 40,
        paddingHorizontal: 14,
        borderRadius: radius.pill,
        borderWidth: hint && !selected ? 1.5 : 1,
        borderColor: border,
        backgroundColor: selected ? c.ink : c.surface,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text variant="label" style={{ fontSize: 14, color: selected ? c.onInk : c.ink }}>
        {label}
      </Text>
    </Pressable>
  );
}
