import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import type { Site } from '@/db/queries';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

import { Text } from './Text';

// Convenção de espelho: o lado esquerdo dela aparece à esquerda da tela (R5).
const SITE_SHAPE: Record<Site, { cx: number; cy: number; rx: number; ry: number }> = {
  AE: { cx: 86, cy: 136, rx: 10, ry: 12 },
  AD: { cx: 114, cy: 136, rx: 10, ry: 12 },
  CE: { cx: 82, cy: 208, rx: 11, ry: 22 },
  CD: { cx: 118, cy: 208, rx: 11, ry: 22 },
  BE: { cx: 51, cy: 106, rx: 8, ry: 17 },
  BD: { cx: 149, cy: 106, rx: 8, ry: 17 },
};

type Props = {
  /** Cor de cada local ativo. Os ausentes aparecem tracejados (fora do rodízio). */
  fills: Partial<Record<Site, string>>;
  width?: number;
};

/** Mapa do corpo (frente). É só visual: os controles e a lista de locais têm os rótulos para o leitor de tela. */
export function BodyMap({ fills, width = 104 }: Props) {
  const { c } = useTheme();
  const height = (width * 320) / 200;
  const k = width / 200;
  return (
    <View
      style={{ width, height }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={width} height={height} viewBox="0 0 200 320">
        <G fill={c.figure}>
          <Circle cx={100} cy={24} r={17} />
          <Rect x={92} y={36} width={16} height={16} rx={5} />
          <Path d="M70 54 C84 49 116 49 130 54 C140 57 142 66 140 76 L134 124 C133 134 133 142 136 152 C139 162 139 170 137 178 L63 178 C61 170 61 162 64 152 C67 142 67 134 66 124 L60 76 C58 66 60 57 70 54 Z" />
          <Path d="M62 60 C52 62 47 70 46 82 L41 140 C40 152 39 162 41 170 C42 176 50 176 51 170 L55 132 C56 122 58 110 61 98 Z" />
          <Path d="M138 60 C148 62 153 70 154 82 L159 140 C160 152 161 162 159 170 C158 176 150 176 149 170 L145 132 C144 122 142 110 139 98 Z" />
          <Path d="M64 172 L98 172 L97 258 C96 276 95 290 94 300 C93 306 81 306 80 300 C78 288 76 274 74 258 C70 232 64 204 64 172 Z" />
          <Path d="M136 172 L102 172 L103 258 C104 276 105 290 106 300 C107 306 119 306 120 300 C122 288 124 274 126 258 C130 232 136 204 136 172 Z" />
        </G>
        <Circle cx={100} cy={134} r={2.5} fill={c.figureMark} />
        {(Object.keys(SITE_SHAPE) as Site[]).map((site) => {
          const s = SITE_SHAPE[site];
          const fill = fills[site];
          return fill ? (
            <Ellipse key={site} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill={fill} />
          ) : (
            <Ellipse
              key={site}
              cx={s.cx}
              cy={s.cy}
              rx={s.rx}
              ry={s.ry}
              fill="none"
              stroke={c.figureMark}
              strokeWidth={2}
              strokeDasharray="4 4"
            />
          );
        })}
      </Svg>
      <Text style={{ position: 'absolute', left: 20 * k, top: 22 * k, fontSize: 20 * k * 0.9, lineHeight: 24 * k, fontFamily: fonts.bold, color: c.text3 }}>
        E
      </Text>
      <Text style={{ position: 'absolute', right: 20 * k, top: 22 * k, fontSize: 20 * k * 0.9, lineHeight: 24 * k, fontFamily: fonts.bold, color: c.text3 }}>
        D
      </Text>
    </View>
  );
}
