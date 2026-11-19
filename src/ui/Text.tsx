import { Text as RNText, type TextProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { typeScale, type ColorTokens } from '@/theme/tokens';

export type TextVariant = keyof typeof typeScale;

type Props = TextProps & {
  variant?: TextVariant;
  color?: keyof ColorTokens;
};

export function Text({ variant = 'body', color = 'ink', style, ...rest }: Props) {
  const { c } = useTheme();
  const big = variant === 'display' || variant === 'number';
  return (
    <RNText
      maxFontSizeMultiplier={big ? 1.2 : 1.4}
      {...rest}
      style={[typeScale[variant], { color: c[color] }, style]}
    />
  );
}
