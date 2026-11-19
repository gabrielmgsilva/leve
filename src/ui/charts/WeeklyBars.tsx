import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import type { WeekChange } from '@/domain/weight';
import { signedKg } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

import { Text } from '../Text';

type Props = {
  weeks: readonly WeekChange[];
  selected: number | null; // índice em `weeks`
  onSelect: (index: number) => void;
  accessibilityLabel: string;
};

const PLOT = 130;
const PAD = 18; // espaço para o rótulo dos extremos
const R = 4; // ponta arredondada

/** Barra com a ponta de longe arredondada; `up` = cresce para cima a partir do zero. */
function barPath(x: number, w: number, zero: number, h: number, up: boolean): string {
  const r = Math.min(R, w / 2, h);
  const end = up ? zero - h : zero + h;
  const s = up ? r : -r;
  return [
    `M${x} ${zero}`,
    `H${x + w}`,
    `V${end + s}`,
    `Q${x + w} ${end} ${x + w - r} ${end}`,
    `H${x + r}`,
    `Q${x} ${end} ${x} ${end + s}`,
    'Z',
  ].join('');
}

/** Semana a semana: barras divergentes a partir do zero (queda para baixo, aumento para cima). */
export function WeeklyBars({ weeks, selected, onSelect, accessibilityLabel }: Props) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const n = weeks.length;
  const slot = n ? width / n : 0;

  const scale = useMemo(() => {
    const values = weeks.map((w) => w.changeG ?? 0);
    const up = Math.max(0, ...values);
    const down = Math.max(0, ...values.map((v) => -v));
    const k = (PLOT - 2 * PAD) / Math.max(up + down, 1);
    return { zero: PAD + up * k, k, up, down };
  }, [weeks]);

  const pick = (i: number) => {
    if (i < 0 || i >= n || i === selected) return;
    void Haptics.selectionAsync();
    onSelect(i);
  };
  const pickAt = (x: number) => pick(Math.floor(x / slot));

  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));
  if (!width || !n) return <View style={{ height: PLOT + 20 }} onLayout={onLayout} />;

  const barW = Math.max(3, Math.min(16, slot - 2));
  const every = Math.max(1, Math.ceil(16 / slot)); // rótulo de semana a cada N barras
  const values = weeks.map((w) => w.changeG);
  const minI = values.reduce<number>((best, v, i) => (v !== null && v < (values[best] ?? 0) ? i : best), -1);
  const maxI = values.reduce<number>((best, v, i) => (v !== null && v > (values[best] ?? 0) ? i : best), -1);

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={selected !== null ? { text: `Semana ${weeks[selected].week}` } : undefined}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const cur = selected ?? n - 1;
        pick(e.nativeEvent.actionName === 'increment' ? cur + 1 : cur - 1);
      }}
      onLayout={onLayout}
      style={{ height: PLOT + 20 }}
    >
      <Svg width={width} height={PLOT} style={{ position: 'absolute', left: 0, top: 0 }}>
        {selected !== null ? (
          <Rect x={selected * slot + 1} y={0} width={slot - 2} height={PLOT} rx={6} fill={t.c.surface2} />
        ) : null}
        <Line x1={0} x2={width} y1={scale.zero} y2={scale.zero} stroke={t.c.track} strokeWidth={1} />
        {weeks.map((w, i) => {
          const x = i * slot + (slot - barW) / 2;
          if (w.changeG === null) {
            return <Circle key={w.week} cx={x + barW / 2} cy={scale.zero} r={1.5} fill={t.c.text3} />;
          }
          const up = w.changeG > 0;
          const h = Math.max(3, Math.abs(w.changeG) * scale.k);
          return (
            <Path
              key={w.week}
              d={barPath(x, barW, scale.zero, h, up)}
              fill={up ? t.c.warn : t.c.body}
              fillOpacity={w.partial ? 0.4 : 1}
            />
          );
        })}
      </Svg>

      {minI >= 0 && (values[minI] ?? 0) < 0 ? (
        <Text
          variant="caption"
          style={{
            position: 'absolute',
            width: 48,
            textAlign: 'center',
            left: Math.max(0, Math.min(width - 48, minI * slot + slot / 2 - 24)),
            top: Math.min(PLOT - 14, scale.zero + Math.abs(values[minI] as number) * scale.k + 1),
            fontFamily: fonts.bold,
            fontSize: 11,
          }}
        >
          {signedKg(values[minI] as number, 2)}
        </Text>
      ) : null}
      {maxI >= 0 && (values[maxI] ?? 0) > 0 ? (
        <Text
          variant="caption"
          style={{
            position: 'absolute',
            width: 48,
            textAlign: 'center',
            left: Math.max(0, Math.min(width - 48, maxI * slot + slot / 2 - 24)),
            top: Math.max(-2, scale.zero - (values[maxI] as number) * scale.k - 16),
            fontFamily: fonts.bold,
            fontSize: 11,
          }}
        >
          {signedKg(values[maxI] as number, 2)}
        </Text>
      ) : null}

      {weeks.map((w, i) =>
        i % every === 0 || i === n - 1 ? (
          <Text
            key={`n${w.week}`}
            variant="caption"
            color={i === selected ? 'ink' : 'text3'}
            style={{
              position: 'absolute',
              top: PLOT + 3,
              width: 28,
              left: i * slot + slot / 2 - 14,
              textAlign: 'center',
              fontSize: 11,
              fontFamily: i === selected ? fonts.bold : fonts.medium,
            }}
          >
            {w.week}
          </Text>
        ) : null,
      )}

      <View
        onStartShouldSetResponder={() => true}
        onResponderGrant={(e) => pickAt(e.nativeEvent.locationX)}
        onResponderMove={(e) => pickAt(e.nativeEvent.locationX)}
        onResponderTerminationRequest={() => true}
        style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}
      />
    </View>
  );
}
