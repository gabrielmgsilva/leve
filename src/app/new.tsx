import { useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { useInjections, useMeasures, usePens, useToday, useWeights } from '@/db/hooks';
import { useSettings } from '@/db/settings';
import { injectionDefaults } from '@/domain/injection';
import { daysBetween } from '@/lib/dates';
import { ago, kgUnit, mg, num } from '@/lib/format';
import { SITE_LABEL } from '@/lib/labels';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Icon, type IconName } from '@/ui/Icon';
import { IconButton } from '@/ui/IconButton';
import { Text } from '@/ui/Text';
import { useAddPhoto } from '@/ui/useAddPhoto';

type Tile = { icon: IconName; title: string; hint: string; tone: 'med' | 'body' | 'neutral'; href: Href | null; action?: () => void };

// Folha do botão +.
export default function NewEntrySheet() {
  const { c } = useTheme();
  const router = useRouter();
  const today = useToday();
  const injections = useInjections();
  const pens = usePens();
  const weights = useWeights();
  const settings = useSettings();
  const measures = useMeasures();
  const addPhoto = useAddPhoto();
  const lastWaist = [...measures].reverse().find((m) => m.kind === 'waist') ?? null;

  const tiles = useMemo<Tile[]>(() => {
    const d = injectionDefaults({ plan: settings.plan, injections, pens, sites: settings.sites });
    const last = weights[weights.length - 1];
    return [
      { icon: 'pen', title: 'Aplicação', hint: `${mg(d.doseMcg)}${d.site ? ` · ${SITE_LABEL[d.site]} sugerido` : ''}`, tone: 'med', href: '/log/injection' },
      { icon: 'scale', title: 'Peso', hint: last ? `último: ${kgUnit(last.g)}, ${ago(daysBetween(last.at, today))}` : 'quando quiser', tone: 'body', href: '/log/weight' },
      { icon: 'heart', title: 'Sintomas', hint: 'como você está hoje', tone: 'neutral', href: '/log/symptoms' },
      { icon: 'pencil', title: 'Nota', hint: 'um pensamento ou uma conquista', tone: 'neutral', href: '/log/note' },
      {
        icon: 'ruler',
        title: 'Medidas',
        hint: lastWaist ? `cintura: ${num(lastWaist.mm / 10, 1)} cm, ${ago(daysBetween(lastWaist.at, today))}` : 'cintura, quadril e outras',
        tone: 'body',
        href: '/log/measures',
      },
      { icon: 'camera', title: 'Foto', hint: 'de progresso, só no Leve', tone: 'neutral', href: null, action: addPhoto },
    ];
  }, [settings, injections, pens, weights, today, lastWaist, addPhoto]);
  const tone = {
    med: { bg: c.medSoft, fg: c.med },
    body: { bg: c.bodySoft, fg: c.bodyStrong },
    neutral: { bg: c.surface2, fg: c.text2 },
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.surface, padding: space.xl, gap: space.l }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.m }}>
        <View style={{ gap: 2, flexShrink: 1 }}>
          <Text variant="title2" accessibilityRole="header">
            Novo registro
          </Text>
          <Text color="text2">O que você quer anotar?</Text>
        </View>
        <IconButton icon="close" label="Fechar" variant="soft" onPress={() => router.back()} />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.m }}>
        {tiles.map((tile) => {
          const enabled = tile.href !== null || !!tile.action;
          return (
            <Pressable
              key={tile.title}
              accessibilityRole="button"
              accessibilityLabel={`${tile.title}, ${tile.hint}`}
              accessibilityState={{ disabled: !enabled }}
              disabled={!enabled}
              onPress={() => {
                if (tile.href) router.replace(tile.href);
                else if (tile.action) {
                  router.back();
                  tile.action();
                }
              }}
              style={({ pressed }) => ({
                flexBasis: '46%',
                flexGrow: 1,
                minHeight: 128,
                padding: space.l,
                borderRadius: radius.tile,
                backgroundColor: tone[tile.tone].bg,
                justifyContent: 'space-between',
                gap: space.m,
                opacity: enabled ? (pressed ? 0.8 : 1) : 0.55,
              })}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.pill,
                  backgroundColor: c.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={tile.icon} size={22} color={tone[tile.tone].fg} />
              </View>
              <View style={{ gap: 2 }}>
                <Text variant="headline">{tile.title}</Text>
                <Text variant="caption" color="text2">
                  {tile.hint}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
