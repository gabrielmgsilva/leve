import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Props = {
  icon: IconName;
  tone: 'med' | 'body' | 'neutral';
  title: string;
  right?: ReactNode;
};

/** Ícone em círculo + sobretítulo, no topo dos cartões. Violeta = medicação, verde-azulado = corpo. */
export function CardHeader({ icon, tone, title, right }: Props) {
  const { c } = useTheme();
  const bg = { med: c.medSoft, body: c.bodySoft, neutral: c.surface2 }[tone];
  const fg = { med: c.med, body: c.bodyStrong, neutral: c.text2 }[tone];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.pill,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={20} color={fg} />
      </View>
      <Text variant="overline" color="text3" style={{ flex: 1 }}>
        {title}
      </Text>
      {right}
    </View>
  );
}
