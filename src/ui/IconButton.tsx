import { Pressable } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';

type Props = {
  icon: IconName;
  label: string;
  onPress: () => void;
  /** outline: superfície com borda (topo das telas); soft: fundo cinza (fechar sheet). */
  variant?: 'outline' | 'soft';
  size?: number;
};

/** Botão redondo de 44 pt só com ícone; o rótulo vai para o leitor de tela. */
export function IconButton({ icon, label, onPress, variant = 'outline', size = 44 }: Props) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: radius.pill,
        backgroundColor: variant === 'outline' ? c.surface : c.surface2,
        borderWidth: variant === 'outline' ? 1 : 0,
        borderColor: c.line,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon name={icon} size={size > 40 ? 20 : 18} color={c.ink} strokeWidth={2} />
    </Pressable>
  );
}
