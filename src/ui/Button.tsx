import * as Haptics from 'expo-haptics';
import { Pressable } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Variant = 'primary' | 'med' | 'soft' | 'ghost';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  disabled?: boolean;
};

export function Button({ label, onPress, variant = 'primary', icon, disabled = false }: Props) {
  const { c } = useTheme();
  // Desabilitado: cinza do desenho, sem transparência sobre a cor do botão.
  const bg = disabled && variant !== 'ghost' ? c.surface2 : { primary: c.ink, med: c.med, soft: c.surface2, ghost: 'transparent' }[variant];
  const fg = disabled ? c.text3 : { primary: c.onInk, med: c.onMed, soft: c.ink, ghost: c.medStrong }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => ({
        minHeight: 52,
        borderRadius: radius.pill,
        backgroundColor: bg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.s,
        paddingHorizontal: space.xl,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {icon ? <Icon name={icon} size={20} color={fg} strokeWidth={2} /> : null}
      <Text variant="headline" style={{ color: fg }}>
        {label}
      </Text>
    </Pressable>
  );
}
