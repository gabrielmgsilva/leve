import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';

import { Pill } from './Bits';
import { Text } from './Text';

export type DoseStepRow = {
  key: string;
  title: string; // "1 mg"
  sub: string; // "semana 3 de 4 · desde 01/11"
  color: string;
  status: 'done' | 'current' | 'next';
  badge: string; // "concluída", "atual", "a confirmar"
  /** Semanas feitas e previstas na etapa atual (segmentos). */
  progress?: { done: number; total: number };
};

/** Linha do tempo do plano de doses, com o status de cada etapa. */
export function DoseSteps({ rows }: { rows: readonly DoseStepRow[] }) {
  const t = useTheme();
  return (
    <View>
      {rows.map((r, i) => {
        const last = i === rows.length - 1;
        return (
          <View
            key={r.key}
            accessible
            accessibilityLabel={`${r.title}, ${r.badge}. ${r.sub}`}
            style={{ flexDirection: 'row', gap: space.m, paddingBottom: last ? 0 : 14 }}
          >
            {!last ? (
              <View style={{ position: 'absolute', left: 9, top: 18, bottom: -2, width: 2, backgroundColor: t.c.line }} />
            ) : null}
            <View
              style={[
                { width: 20, height: 20, borderRadius: radius.pill },
                r.status === 'next'
                  ? { borderWidth: 2, borderStyle: 'dashed', borderColor: r.color, backgroundColor: t.c.surface }
                  : { backgroundColor: r.color },
                r.status === 'current' ? { boxShadow: `0px 0px 0px 4px ${t.c.medSoft}` } : null,
              ]}
            />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ gap: 1 }}>
                <Text
                  style={{ fontSize: 15, lineHeight: 20, fontFamily: fonts.semibold }}
                  color={r.status === 'next' ? 'text2' : 'ink'}
                >
                  {r.title}
                </Text>
                <Text variant="caption" color="text3" style={{ fontFamily: fonts.regular }}>
                  {r.sub}
                </Text>
              </View>
              {r.progress ? (
                <View style={{ flexDirection: 'row', gap: 4, maxWidth: 160 }}>
                  {Array.from({ length: r.progress.total }, (_, k) => (
                    <View
                      key={k}
                      style={{
                        flex: 1,
                        height: 6,
                        borderRadius: radius.pill,
                        backgroundColor: k < (r.progress?.done ?? 0) ? r.color : t.c.line,
                      }}
                    />
                  ))}
                </View>
              ) : null}
            </View>
            <Pill label={r.badge} tone={r.status === 'current' ? 'med' : r.status === 'next' ? 'outline' : 'neutral'} />
          </View>
        );
      })}
    </View>
  );
}
