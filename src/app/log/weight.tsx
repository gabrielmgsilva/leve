import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToday } from '@/db/hooks';
import { addWeight, deleteRow, insertRows, type WeightRow } from '@/db/queries';
import { useQueryState } from '@/db/useQuery';
import { weekTrendChange } from '@/domain/today';
import { dailyMeans, parseWeight, trend, weighingChange } from '@/domain/weight';
import { toStamp } from '@/lib/dates';
import { ddmm, kg, kgUnit, signedKg } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';
import { Tag } from '@/ui/Bits';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { applyKey, DateTimeRow, NumericKeypad, type Key } from '@/ui/Phase1Bits';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';
import { confirmDelete } from '@/ui/useDeleteWithUndo';

/** "79,70" → "79,7"; "80,00" → "80" */
const shortKg = (g: number) => kg(g, 2).replace(/0$/, '').replace(/,0$/, '');

export default function WeightSheet() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { rows, loaded } = useQueryState<WeightRow>('SELECT id, at, g FROM weights ORDER BY at, id', [], ['weights']);
  if (!loaded) return null;
  const editing = id ? (rows.find((w) => w.id === Number(id)) ?? null) : null;
  return <WeightForm key={editing?.id ?? 'new'} editing={editing} all={rows} />;
}

function WeightForm({ editing, all }: { editing: WeightRow | null; all: WeightRow[] }) {
  const t = useTheme();
  const db = useSQLiteContext();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const today = useToday();

  const others = all.filter((w) => w.id !== editing?.id);
  const latest = others[others.length - 1] ?? null;
  const [stamp, setStamp] = useState(() => editing?.at ?? toStamp(new Date()));
  const [value, setValue] = useState(() => shortKg(editing?.g ?? latest?.g ?? 70000));
  const [fresh, setFresh] = useState(true); // a primeira tecla substitui o valor sugerido
  const [saved, setSaved] = useState<WeightRow | null>(null);

  const g = parseWeight(value);
  const previous = [...others].reverse().find((w) => w.at <= stamp) ?? null;
  const change = g !== null ? weighingChange(g, previous?.g ?? null) : null;
  const trendDown = useMemo(() => {
    const pts = trend(dailyMeans(others));
    const wk = weekTrendChange(pts, today);
    return wk !== null && wk < 0;
  }, [others, today]);
  const lowest = g !== null && others.length > 0 && others.every((w) => g < w.g);

  const onKey = (k: Key) => {
    setValue((v) => applyKey(v, k, fresh));
    setFresh(false);
  };
  const step = (delta: number) => {
    const base = g ?? latest?.g ?? 70000;
    setValue(shortKg(Math.round((base + delta) / 100) * 100));
    setFresh(false);
  };

  const save = async () => {
    if (g === null) return;
    if (editing) {
      await db.runAsync('UPDATE weights SET at = ?, g = ? WHERE id = ?', [stamp, g, editing.id]);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show({
        message: 'Pesagem alterada.',
        actionLabel: 'Desfazer',
        onAction: () => void db.runAsync('UPDATE weights SET at = ?, g = ? WHERE id = ?', [editing.at, editing.g, editing.id]),
      });
      router.back();
      return;
    }
    const newId = await addWeight(db, stamp, g);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaved({ id: newId, at: stamp, g });
  };

  const remove = () =>
    editing &&
    confirmDelete(`Excluir a pesagem de ${kgUnit(editing.g)}?`, undefined, () => {
      void deleteRow(db, 'weights', editing.id).then(() => {
        toast.show({ message: 'Pesagem excluída', actionLabel: 'Desfazer', onAction: () => void insertRows(db, 'weights', [editing]) });
        router.back();
      });
    });

  if (saved) return <Saved row={saved} all={all} onUndo={() => void deleteRow(db, 'weights', saved.id).then(() => setSaved(null))} />;

  let delta: { text: string; tone: 'body' | 'warn' | 'neutral'; icon?: 'arrowDown' | 'arrowUp' } = { text: 'Primeira pesagem', tone: 'neutral' };
  let helper = '';
  if (g === null) delta = { text: 'Confira o valor (30 a 300 kg)', tone: 'warn' };
  else if (change === 'down') {
    delta = { text: `${kg(Math.abs(g - (previous?.g ?? g)))} kg desde a última pesagem`, tone: 'body', icon: 'arrowDown' };
    helper = lowest ? 'Novo menor peso do tratamento.' : '';
  } else if (change === 'up') {
    delta = { text: `${kg(g - (previous?.g ?? g))} kg desde a última pesagem`, tone: 'warn', icon: 'arrowUp' };
    helper = `Oscilações entre pesagens são normais.${trendDown ? ' Sua tendência segue em queda.' : ''}`;
  } else if (change === 'same') delta = { text: 'Igual à última pesagem', tone: 'neutral' };

  const round = (icon: 'minus' | 'plus', d: number, label: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => step(d)}
      style={({ pressed }) => ({
        width: 48,
        height: 48,
        borderRadius: radius.pill,
        backgroundColor: pressed ? t.c.line : t.c.surface2,
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      <Icon name={icon} size={20} color={t.c.ink} strokeWidth={2} />
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.c.surface }}>
      <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: insets.bottom + space.l, gap: 14, flexGrow: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center', minWidth: 72 }}>
            <Text style={{ fontFamily: fonts.semibold, color: t.c.medStrong }}>Cancelar</Text>
          </Pressable>
          <Text variant="headline" accessibilityRole="header" style={{ fontSize: 17 }}>
            {editing ? 'Editar pesagem' : 'Peso'}
          </Text>
          <View style={{ minWidth: 72 }} />
        </View>

        <DateTimeRow stamp={stamp} onChange={setStamp} maxDate={new Date()} />

        <View style={{ alignItems: 'center', gap: space.m, paddingTop: space.s }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            {round('minus', -100, 'Diminuir 0,1 kg')}
            <View accessibilityLiveRegion="polite" style={{ minWidth: 170, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
              <Text style={{ fontSize: 64, lineHeight: 70, letterSpacing: -2, fontFamily: fonts.light, color: fresh ? t.c.text2 : t.c.ink }} maxFontSizeMultiplier={1.2}>
                {value === '' ? '0' : value}
              </Text>
              <Text style={{ fontSize: 20, lineHeight: 24, fontFamily: fonts.medium }} color="text2">
                kg
              </Text>
            </View>
            {round('plus', 100, 'Aumentar 0,1 kg')}
          </View>
          <Tag label={delta.text} tone={delta.tone} icon={delta.icon} />
          <Text variant="label" color="text2" style={{ minHeight: 38, maxWidth: 300, textAlign: 'center', fontFamily: fonts.regular, lineHeight: 19 }}>
            {helper}
          </Text>
        </View>

        <View style={{ flex: 1, justifyContent: 'flex-end', gap: 14 }}>
          <NumericKeypad onKey={onKey} />
          <Button label={editing ? 'Salvar alterações' : 'Salvar peso'} onPress={() => void save()} disabled={g === null} />
          {editing ? (
            <Pressable accessibilityRole="button" onPress={remove} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: fonts.semibold, color: t.c.danger }}>Excluir pesagem</Text>
            </Pressable>
          ) : (
            <Text variant="caption" color="text3" style={{ textAlign: 'center' }}>
              Pese quando quiser. A mesma hora do dia ajuda a comparar.
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Saved({ row, all, onUndo }: { row: WeightRow; all: WeightRow[]; onUndo: () => void }) {
  const t = useTheme();
  const router = useRouter();
  const today = useToday();
  const insets = useSafeAreaInsets();
  const withNew = useMemo(() => [...all.filter((w) => w.id !== row.id), row].sort((a, b) => (a.at < b.at ? -1 : 1)), [all, row]);
  const pts = useMemo(() => trend(dailyMeans(withNew)), [withNew]);
  const week = weekTrendChange(pts, today);
  const first = withNew[0];
  const prev = [...withNew].reverse().find((w) => w.at < row.at && w.id !== row.id) ?? null;
  const line = prev ? `${kgUnit(row.g)} · ${signedKg(row.g - prev.g)} kg desde a última pesagem` : `${kgUnit(row.g)} · primeira pesagem`;
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{ flex: 1, backgroundColor: t.c.surface, padding: 28, paddingBottom: insets.bottom + 28, alignItems: 'center', justifyContent: 'center', gap: space.l }}
    >
      <View style={{ width: 88, height: 88, borderRadius: radius.pill, backgroundColor: t.c.body, alignItems: 'center', justifyContent: 'center', boxShadow: `0px 0px 0px 12px ${t.c.bodySoft}` }}>
        <Icon name="check" size={40} color={t.c.surface} strokeWidth={2.5} />
      </View>
      <Text variant="title2" style={{ marginTop: space.m, fontSize: 24, lineHeight: 30 }} accessibilityRole="header">
        Peso registrado
      </Text>
      <Text color="text2" style={{ textAlign: 'center' }}>
        {line}
      </Text>
      <View style={{ alignSelf: 'stretch', padding: space.l, borderRadius: 20, backgroundColor: t.c.bg, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.s }}>
          <Text variant="label" color="text2" style={{ fontSize: 14, fontFamily: fonts.regular }}>
            Tendência na semana
          </Text>
          <Text variant="label" style={{ fontSize: 14, fontFamily: fonts.semibold }} color={week !== null && week > 0 ? 'warnStrong' : 'bodyStrong'}>
            {week !== null ? `${signedKg(week)} kg` : '—'}
          </Text>
        </View>
        {first && first.id !== row.id ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.s }}>
            <Text variant="label" color="text2" style={{ fontSize: 14, fontFamily: fonts.regular }}>
              {`Desde ${ddmm(first.at)}`}
            </Text>
            <Text variant="label" style={{ fontSize: 14, fontFamily: fonts.semibold }}>
              {`${signedKg(row.g - first.g)} kg`}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={{ alignSelf: 'stretch', gap: space.s, marginTop: space.s }}>
        <Button label="Concluir" onPress={() => router.back()} />
        <Pressable accessibilityRole="button" onPress={onUndo} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: fonts.semibold, color: t.c.medStrong }}>Desfazer</Text>
        </Pressable>
      </View>
    </View>
  );
}
