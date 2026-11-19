import type { ReactNode } from 'react';
import { View } from 'react-native';

import { monthTitle } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';

import { IconButton } from './IconButton';
import { Text } from './Text';

export type DayMark = { applied?: boolean; skipped?: boolean; planned?: boolean; weighed?: boolean };

type Props = {
  year: number;
  month: number; // 0–11
  marks: ReadonlyMap<string, DayMark>; // chave 'AAAA-MM-DD'
  today: string;
  onPrev: () => void;
  onNext: () => void;
};

const INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const pad = (n: number) => String(n).padStart(2, '0');

/** Calendário do mês: aplicações feitas e previstas, pesagens e hoje. */
export function MonthCalendar({ year, month, marks, today, onPrev, onNext }: Props) {
  const t = useTheme();
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array<null>(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const rows = Array.from({ length: cells.length / 7 }, (_, r) => cells.slice(r * 7, r * 7 + 7));
  const anySkipped = [...marks.entries()].some(([k, m]) => m.skipped && k.startsWith(`${year}-${pad(month + 1)}`));

  return (
    <View style={{ gap: space.s }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton icon="chevronLeft" label="Mês anterior" variant="soft" onPress={onPrev} />
        <Text variant="headline" accessibilityRole="header" accessibilityLiveRegion="polite">
          {monthTitle(year, month)}
        </Text>
        <IconButton icon="chevronRight" label="Próximo mês" variant="soft" onPress={onNext} />
      </View>

      <View style={{ flexDirection: 'row' }} importantForAccessibility="no-hide-descendants">
        {INITIALS.map((d, i) => (
          <Text key={i} variant="caption" color="text3" style={{ flex: 1, textAlign: 'center', fontFamily: fonts.semibold }}>
            {d}
          </Text>
        ))}
      </View>

      <View style={{ gap: 4 }}>
        {rows.map((row, r) => (
          <View key={r} style={{ flexDirection: 'row' }}>
            {row.map((n, i) => {
              if (n === null) return <View key={i} style={{ flex: 1, height: 44 }} />;
              const key = `${year}-${pad(month + 1)}-${pad(n)}`;
              const m = marks.get(key) ?? {};
              const isToday = key === today;
              const parts = [
                m.applied && 'aplicação feita',
                m.skipped && 'semana pulada',
                m.planned && 'aplicação prevista',
                m.weighed && 'pesagem',
                isToday && 'hoje',
              ].filter(Boolean);
              const bg = m.applied ? t.c.med : m.skipped ? t.c.surface2 : 'transparent';
              const fg = m.applied ? t.c.onMed : m.skipped ? t.c.text3 : m.planned ? t.c.medStrong : t.c.ink;
              const border = m.planned ? { borderWidth: 2, borderColor: t.dose[1] } : isToday ? { borderWidth: 1.5, borderColor: t.c.ink } : null;
              const strong = m.applied || m.planned || isToday;
              // A key muda com o estado: no Android, a View que nasce transparente e ganha cor depois perde o arredondado.
              const state = `${m.applied ? 'a' : ''}${m.skipped ? 's' : ''}${m.planned ? 'p' : ''}${isToday ? 't' : ''}`;
              return (
                <View
                  key={i}
                  accessible
                  accessibilityLabel={`${n}${parts.length ? `: ${parts.join(', ')}` : ''}`}
                  style={{ flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', gap: 2 }}
                >
                  <View
                    key={state}
                    style={[
                      { width: 32, height: 32, borderRadius: 16, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' },
                      border,
                    ]}
                  >
                    <Text
                      variant="label"
                      style={{
                        fontSize: 14,
                        color: fg,
                        fontFamily: strong ? fonts.bold : fonts.medium,
                        fontVariant: ['tabular-nums'],
                        textDecorationLine: m.skipped ? 'line-through' : 'none',
                      }}
                    >
                      {n}
                    </Text>
                  </View>
                  {m.weighed ? (
                    <View key="dot" style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: t.c.body }} />
                  ) : (
                    <View key="none" style={{ width: 4, height: 4 }} />
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View
        importantForAccessibility="no-hide-descendants"
        style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6, paddingTop: 10, paddingHorizontal: 4, borderTopWidth: 1, borderTopColor: t.c.line }}
      >
        <Legend swatch={<View style={{ width: 12, height: 12, borderRadius: radius.pill, backgroundColor: t.c.med }} />} label="aplicada" />
        <Legend swatch={<View style={{ width: 12, height: 12, borderRadius: radius.pill, borderWidth: 2, borderColor: t.dose[1] }} />} label="prevista" />
        {anySkipped ? (
          <Legend swatch={<View style={{ width: 12, height: 12, borderRadius: radius.pill, backgroundColor: t.c.surface2 }} />} label="pulada" />
        ) : null}
        <Legend swatch={<View style={{ width: 6, height: 6, borderRadius: radius.pill, backgroundColor: t.c.body }} />} label="pesagem" />
        <Legend swatch={<View style={{ width: 12, height: 12, borderRadius: radius.pill, borderWidth: 1.5, borderColor: t.c.ink }} />} label="hoje" />
      </View>
    </View>
  );
}

function Legend({ swatch, label }: { swatch: ReactNode; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {swatch}
      <Text variant="caption" color="text2">
        {label}
      </Text>
    </View>
  );
}
