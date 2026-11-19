import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius } from '@/theme/tokens';

import { Text } from './Text';

export type PenSegment = { used: boolean; label: string; next?: boolean };

/** Doses da caneta em segmentos: as usadas apagadas, as que restam em violeta, com a data de cada uma. */
export function PenGauge({ segments, accessibilityLabel }: { segments: readonly PenSegment[]; accessibilityLabel: string }) {
  const { c } = useTheme();
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel} style={{ flexDirection: 'row', gap: 6 }}>
      {segments.map((s, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
          <View style={{ alignSelf: 'stretch', height: 12, borderRadius: radius.pill, backgroundColor: s.used ? c.surface2 : c.med }} />
          <Text
            variant="caption"
            numberOfLines={1}
            style={{ color: s.next ? c.medStrong : c.text3, fontFamily: s.next ? fonts.bold : fonts.medium, fontVariant: ['tabular-nums'] }}
          >
            {s.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
