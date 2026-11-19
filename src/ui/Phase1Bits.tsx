// Peças da fase 1: teclado numérico, faixa da semana, minigráfico, anel da meta e data e hora.

import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import type { TrendPoint } from '@/domain/weight';
import type { StripDay } from '@/domain/today';
import { dayNum, dayToDate, toDay } from '@/lib/dates';
import { ddmm, kg, weekdayShort } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';

import { Icon } from './Icon';
import { Text } from './Text';

// ---------- Teclado numérico (peso) ----------

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'del'] as const;
export type Key = (typeof KEYS)[number];

/** Teclado próprio com vírgula: o valor fica grande na tela, sem o teclado do sistema. */
export function NumericKeypad({ onKey }: { onKey: (k: Key) => void }) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="keyboardkey" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {KEYS.map((k) => (
        <Pressable
          key={k}
          accessibilityRole="button"
          accessibilityLabel={k === 'del' ? 'Apagar' : k === ',' ? 'Vírgula' : k}
          onPress={() => {
            void Haptics.selectionAsync();
            onKey(k);
          }}
          style={({ pressed }) => ({
            flexBasis: '30%',
            flexGrow: 1,
            height: 60,
            borderRadius: radius.key,
            backgroundColor: pressed ? c.surface2 : c.bg,
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          {k === 'del' ? (
            <Icon name="chevronLeft" size={24} color={c.ink} strokeWidth={2} />
          ) : (
            <Text style={{ fontSize: 26, lineHeight: 32, fontFamily: fonts.medium }}>{k}</Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}

/** Aplica uma tecla ao texto do valor ("79,7"): até 3 dígitos, vírgula e 2 casas. */
export function applyKey(value: string, key: Key, fresh: boolean): string {
  const v = fresh ? '' : value;
  if (key === 'del') return fresh ? '' : value.slice(0, -1);
  if (key === ',') return v.includes(',') ? v : `${v === '' ? '0' : v},`;
  const [int, dec] = v.split(',');
  if (dec === undefined && int.length >= 3) return v;
  if (dec !== undefined && dec.length >= 2) return v;
  return v + key;
}

// ---------- Faixa da semana (Hoje) ----------

export function WeekStrip({ days }: { days: readonly StripDay[] }) {
  const { c } = useTheme();
  const parts = days
    .flatMap((d) => [d.weighed ? `pesagem ${weekdayShort(d.day)}` : null, d.applied ? `aplicação ${weekdayShort(d.day)}` : null, d.planned ? `aplicação prevista ${weekdayShort(d.day)}` : null])
    .filter(Boolean);
  return (
    <View
      accessible
      accessibilityLabel={`Esta semana${parts.length ? `: ${parts.join(', ')}` : ''}`}
      style={{ flexDirection: 'row', gap: 6, paddingTop: 2, paddingBottom: 4 }}
    >
      {days.map((d) => {
        const bg = d.isToday ? c.ink : d.planned || d.applied ? c.medSoft : 'transparent';
        const fg = d.isToday ? c.onInk : d.planned || d.applied ? c.medStrong : c.text2;
        const label = weekdayShort(d.day).replace('.', '');
        return (
          <View key={d.day} style={{ flex: 1, alignItems: 'center', gap: 3, paddingVertical: space.s, borderRadius: 16, backgroundColor: bg }}>
            <Text variant="caption" style={{ fontSize: 11, lineHeight: 14, fontFamily: fonts.semibold, color: d.isToday ? c.onInk : d.planned || d.applied ? c.medStrong : c.text3 }}>
              {label}
            </Text>
            <Text style={{ fontSize: 16, lineHeight: 22, fontFamily: d.isToday || d.planned || d.applied ? fonts.bold : fonts.semibold, color: fg }}>
              {String(dayToDate(d.day).getDate())}
            </Text>
            {d.applied ? (
              <View key="a" style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.med }} />
            ) : d.planned ? (
              <View key="p" style={{ width: 6, height: 6, borderRadius: 3, borderWidth: 1.5, borderColor: c.med }} />
            ) : d.weighed ? (
              <View key="w" style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: d.isToday ? c.onInk : c.body }} />
            ) : (
              <View key="n" style={{ width: 6, height: 6 }} />
            )}
          </View>
        );
      })}
    </View>
  );
}

// ---------- Minigráfico (Hoje) ----------

/** Só a tendência dos últimos 30 dias e o ponto final. */
export function Sparkline({ points, width = 136, height = 52 }: { points: readonly TrendPoint[]; width?: number; height?: number }) {
  const t = useTheme();
  if (points.length < 2) return null;
  const pad = 6;
  const d0 = dayNum(points[0].day);
  const d1 = Math.max(dayNum(points[points.length - 1].day), d0 + 1);
  const vals = points.map((p) => p.t);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = Math.max(hi - lo, 300);
  const x = (day: string) => pad + ((dayNum(day) - d0) / (d1 - d0)) * (width - 2 * pad);
  const y = (g: number) => pad + (1 - (g - lo) / span) * (height - 2 * pad);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.day).toFixed(1)} ${y(p.t).toFixed(1)}`).join('');
  const last = points[points.length - 1];
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Tendência dos últimos 30 dias: de ${kg(points[0].t)} para ${kg(last.t)} kg`}
    >
      <Svg width={width} height={height}>
        <Path d={path} fill="none" stroke={t.c.body} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={x(last.day)} cy={y(last.t)} r={4.5} fill={t.c.body} stroke={t.c.surface} strokeWidth={2} />
      </Svg>
    </View>
  );
}

// ---------- Anel da meta ----------

export function GoalRing({ progress, size = 60 }: { progress: number; size?: number }) {
  const t = useTheme();
  const r = size / 2 - 5;
  const len = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={t.c.surface2} strokeWidth={7} />
      {progress > 0 ? (
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={t.c.body}
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={`${(len * Math.min(1, progress)).toFixed(1)} ${len.toFixed(1)}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      ) : null}
    </Svg>
  );
}

// ---------- Data e hora ----------

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Dois botões (data e hora) que abrem o calendário e o relógio do Android. `stamp` = 'AAAA-MM-DD HH:MM'. */
export function DateTimeRow({ stamp, onChange, maxDate }: { stamp: string; onChange: (s: string) => void; maxDate?: Date }) {
  const { c } = useTheme();
  const day = stamp.slice(0, 10);
  const time = stamp.slice(11, 16);
  const today = toDay(new Date());
  const label = `${day === today ? 'Hoje, ' : ''}${weekdayShort(day)} ${ddmm(day)}`;
  const value = () => {
    const [y, m, d] = day.split('-').map(Number);
    const [h, min] = time.split(':').map(Number);
    return new Date(y, m - 1, d, h, min);
  };
  const pickDate = () =>
    DateTimePickerAndroid.open({
      value: value(),
      mode: 'date',
      maximumDate: maxDate,
      onValueChange: (_e, date) => onChange(`${toDay(date)} ${time}`),
    });
  const pickTime = () =>
    DateTimePickerAndroid.open({
      value: value(),
      mode: 'time',
      is24Hour: true,
      onValueChange: (_e, date) => onChange(`${day} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`),
    });
  const btn = (text: string, icon: 'calendar' | 'clock', onPress: () => void, a11y: string, flex: number | undefined) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      style={({ pressed }) => ({
        flex,
        width: flex ? undefined : 104,
        height: 44,
        borderRadius: radius.field,
        backgroundColor: pressed ? c.line : c.surface2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.s,
      })}
    >
      <Icon name={icon} size={18} color={c.ink} />
      <Text variant="label" style={{ fontSize: 14, fontFamily: fonts.semibold }}>
        {text}
      </Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', gap: space.s }}>
      {btn(label, 'calendar', pickDate, `Data: ${label}. Toque para mudar`, 1)}
      {btn(time, 'clock', pickTime, `Hora: ${time}. Toque para mudar`, undefined)}
    </View>
  );
}
