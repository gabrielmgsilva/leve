import * as Haptics from 'expo-haptics';
import { useMemo, useRef, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import type { TrendPoint } from '@/domain/weight';
import { dayNum, fromDayNum } from '@/lib/dates';
import { ddmm, kg, weekdayShort } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius } from '@/theme/tokens';

import { Text } from '../Text';

export type Band = { from: string; to: string | null; label: string; color: string };

type Props = {
  weighings: readonly { at: string; g: number }[]; // pesagens no período (pontos)
  points: readonly TrendPoint[]; // médias diárias e tendência no período
  bands: readonly Band[]; // fases de dose
  from: string;
  to: string;
  goalG: number | null;
  /** Texto da dose num dia, para o balão. */
  doseOn: (day: string) => string | null;
  accessibilityLabel: string;
};

const HEIGHT = 190; // área do SVG
const TOP = 26; // espaço para o rótulo das faixas
const BOTTOM = 182;
const LEFT = 4;
const AXIS_W = 40; // coluna dos valores à direita

/** Passo da grade (g) que dá de 2 a 4 linhas. */
function gridStep(lo: number, hi: number): number {
  for (const step of [500, 1000, 2000, 5000, 10000, 20000]) {
    const n = Math.floor(hi / step) - Math.ceil(lo / step) + 1;
    if (n <= 4) return step;
  }
  return 50000;
}

/** Peso: pesagens em pontos, tendência em linha, faixas de dose ao fundo e toque para ver o dia. */
export function WeightChart({ weighings, points, bands, from, to, goalG, doseOn, accessibilityLabel }: Props) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const selRef = useRef<number | null>(null);

  const geo = useMemo(() => {
    const right = Math.max(LEFT + 10, width - AXIS_W);
    const d0 = dayNum(from);
    const d1 = Math.max(dayNum(to), d0 + 1);
    const x = (day: string) => LEFT + ((dayNum(day) - d0) / (d1 - d0)) * (right - LEFT);
    const values = [...weighings.map((w) => w.g), ...points.map((p) => p.t)];
    let lo = Math.min(...values);
    let hi = Math.max(...values);
    const pad = Math.max(300, (hi - lo) * 0.08);
    lo -= pad;
    hi += pad;
    const y = (g: number) => BOTTOM - ((g - lo) / (hi - lo)) * (BOTTOM - TOP);
    const step = gridStep(lo, hi);
    const ticks: number[] = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);
    return { right, x, y, lo, hi, ticks, d0, d1 };
  }, [width, from, to, weighings, points]);

  const pickAt = (locationX: number) => {
    if (!points.length) return;
    let best = 0;
    let bestDist = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(geo.x(p.day) - locationX);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    if (selRef.current !== best) {
      selRef.current = best;
      setSel(best);
      void Haptics.selectionAsync();
    }
  };
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));

  if (!width) return <View style={{ height: HEIGHT + 24 }} onLayout={onLayout} />;

  const { x, y, right, ticks, lo, hi } = geo;
  const trendD = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.day).toFixed(1)} ${y(p.t).toFixed(1)}`).join('');
  const last = weighings[weighings.length - 1];
  const showGoal = goalG !== null && goalG > lo && goalG < hi;

  const visibleBands = bands
    .map((b) => {
      const a = Math.max(LEFT, x(b.from));
      const z = b.to ? Math.min(right, x(b.to)) : right;
      return { ...b, a, z };
    })
    .filter((b) => b.z - b.a > 1);

  const span = geo.d1 - geo.d0;
  const labelFractions = span >= 6 ? [0, 1 / 3, 2 / 3, 1] : [0, 1];
  const xLabels = labelFractions.map((f, i) => {
    const day = fromDayNum(geo.d0 + Math.round(f * span));
    return { day, x: LEFT + f * (right - LEFT), align: i === 0 ? 'left' : i === labelFractions.length - 1 ? 'right' : 'center' };
  });

  const s = sel !== null && sel < points.length ? points[sel] : null;
  const sx = s ? x(s.day) : 0;
  const tipW = 168;
  const dose = s ? doseOn(s.day) : null;
  const sameDay = s ? weighings.filter((w) => w.at.startsWith(s.day)).length : 0;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      onLayout={onLayout}
      style={{ height: HEIGHT + 24 }}
    >
      <Svg width={width} height={HEIGHT} style={{ position: 'absolute', left: 0, top: 0 }}>
        {visibleBands.map((b, i) => (
          <Rect
            key={`band${i}`}
            x={b.a + (i > 0 ? 1 : 0)}
            y={0}
            width={Math.max(0, b.z - b.a - (i > 0 ? 1 : 0) - (i < visibleBands.length - 1 ? 1 : 0))}
            height={BOTTOM}
            fill={b.color}
            fillOpacity={0.16}
          />
        ))}
        {ticks.map((v) => (
          <Line key={v} x1={LEFT} x2={right} y1={y(v)} y2={y(v)} stroke={t.c.line} strokeWidth={1} />
        ))}
        {showGoal ? (
          <Line
            x1={LEFT}
            x2={right}
            y1={y(goalG)}
            y2={y(goalG)}
            stroke={t.c.text3}
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />
        ) : null}
        {s ? <Line x1={sx} x2={sx} y1={0} y2={BOTTOM} stroke={t.c.ink} strokeOpacity={0.4} strokeWidth={1} /> : null}
        {weighings.map((w, i) => (
          <Circle
            key={i}
            cx={x(w.at.slice(0, 10))}
            cy={y(w.g)}
            r={3.5}
            fill={t.c.point}
            stroke={t.c.surface}
            strokeWidth={1.5}
          />
        ))}
        <Path d={trendD} fill="none" stroke={t.c.body} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {last ? (
          <Circle cx={x(last.at.slice(0, 10))} cy={y(last.g)} r={5} fill={t.c.ink} stroke={t.c.surface} strokeWidth={2} />
        ) : null}
        {s ? <Circle cx={sx} cy={y(s.g)} r={6.5} fill="none" stroke={t.c.ink} strokeWidth={2} /> : null}
      </Svg>

      {visibleBands
        .filter((b) => b.z - b.a > 46)
        .map((b, i) => (
          <Text
            key={`bl${i}`}
            variant="overline"
            style={{ position: 'absolute', top: 7, left: b.a + 6, color: t.c.medStrong, textTransform: 'none', letterSpacing: 0 }}
          >
            {b.label}
          </Text>
        ))}
      {showGoal ? (
        <Text
          variant="caption"
          color="text3"
          style={{ position: 'absolute', left: LEFT + 4, top: y(goalG) - 17, fontFamily: fonts.semibold }}
        >
          meta
        </Text>
      ) : null}
      {ticks.map((v) => (
        <Text
          key={`y${v}`}
          variant="caption"
          color="text3"
          style={{ position: 'absolute', left: right + 6, top: y(v) - 8, fontVariant: ['tabular-nums'] }}
        >
          {kg(v, v % 1000 === 0 ? 0 : 1)}
        </Text>
      ))}
      {xLabels.map((l) => (
        <Text
          key={`x${l.day}${l.align}`}
          variant="caption"
          color="text3"
          style={{
            position: 'absolute',
            top: HEIGHT + 4,
            width: 48,
            left: l.align === 'left' ? l.x : l.align === 'right' ? l.x - 48 : l.x - 24,
            textAlign: l.align === 'left' ? 'left' : l.align === 'right' ? 'right' : 'center',
            fontVariant: ['tabular-nums'],
          }}
        >
          {ddmm(l.day)}
        </Text>
      ))}

      <View
        onStartShouldSetResponder={() => true}
        onResponderGrant={(e) => pickAt(e.nativeEvent.locationX)}
        onResponderMove={(e) => pickAt(e.nativeEvent.locationX)}
        onResponderTerminationRequest={() => true}
        style={{ position: 'absolute', left: 0, top: 0, width: right + 8, height: HEIGHT }}
      />

      {s ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -6,
            left: Math.max(0, Math.min(width - tipW, sx - tipW / 2)),
            width: tipW,
            paddingVertical: 8,
            paddingHorizontal: 10,
            borderRadius: radius.field - 2,
            backgroundColor: t.c.tipBg,
            gap: 1,
          }}
        >
          <Text variant="caption" style={{ color: t.c.tipText2, fontFamily: fonts.semibold }}>
            {`${weekdayShort(s.day)} ${ddmm(s.day)}${dose ? ` · ${dose}` : ''}`}
          </Text>
          <Text style={{ color: t.c.tipText, fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 }}>
            {`${kg(s.g)} kg${sameDay > 1 ? ` (média de ${sameDay})` : ''}`}
          </Text>
          <Text variant="caption" style={{ color: t.c.tipText, fontFamily: fonts.regular }}>
            {`tendência ${kg(s.t)} kg`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
