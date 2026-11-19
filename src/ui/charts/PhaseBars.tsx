import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius } from '@/theme/tokens';

import { Text } from '../Text';

export type PhaseRow = {
  key: string;
  label: string; // "0,25 mg"
  sub: string; // "4 semanas"
  color: string;
  changeG: number | null;
  value: string; // "−2,2 kg" ou "sem pesagens"
  rate: string | null; // "−0,55/sem"
};

/** Por fase de dose: barras horizontais na cor da etapa, com o valor no fim em tinta. */
export function PhaseBars({ rows }: { rows: readonly PhaseRow[] }) {
  const { c } = useTheme();
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.changeG ?? 0)));
  return (
    <View style={{ gap: 14 }}>
      {rows.map((r) => (
        <View
          key={r.key}
          accessible
          accessibilityLabel={`${r.label}, ${r.sub}: ${r.value}${r.rate ? `, ${r.rate.replace('/sem', ' por semana')}` : ''}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
        >
          <View style={{ width: 84 }}>
            <Text variant="label" style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.semibold }}>
              {r.label}
            </Text>
            <Text variant="caption" color="text3" style={{ fontFamily: fonts.regular }}>
              {r.sub}
            </Text>
          </View>
          <View style={{ flex: 1, height: 12, borderRadius: radius.pill, backgroundColor: c.bg }}>
            {r.changeG !== null ? (
              <View
                style={{
                  width: `${Math.max(4, (Math.abs(r.changeG) / max) * 100)}%`,
                  height: 12,
                  borderRadius: radius.pill,
                  backgroundColor: r.color,
                }}
              />
            ) : null}
          </View>
          <View style={{ width: 76, alignItems: 'flex-end' }}>
            <Text
              variant="label"
              color={r.changeG === null ? 'text3' : 'ink'}
              style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bold, fontVariant: ['tabular-nums'] }}
            >
              {r.value}
            </Text>
            {r.rate ? (
              <Text variant="caption" color="text3" style={{ fontFamily: fonts.regular, fontVariant: ['tabular-nums'] }}>
                {r.rate}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}
