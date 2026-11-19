import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { useInjections, useJournal, usePens, useToday, useWeights } from '@/db/hooks';
import { deleteRow } from '@/db/queries';
import { symptomPatterns } from '@/domain/patterns';
import { penNumbers } from '@/domain/pens';
import { buildTimeline, type TimelineItem, type TimelineWeek } from '@/domain/timeline';
import { dailyMeans, trend, weeklyChanges } from '@/domain/weight';
import { daysBetween } from '@/lib/dates';
import { ddmm, kgUnit, mg, plural, signedKg, timeOf, weekdayAndDate, weekdayShort } from '@/lib/format';
import { LEVEL_LABEL, siteInline, SYMPTOM_LABEL } from '@/lib/labels';
import { patternText } from '@/lib/patternText';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Icon, type IconName } from '@/ui/Icon';
import { IconButton } from '@/ui/IconButton';
import { Screen } from '@/ui/Screen';
import { SymptomForm } from '@/ui/SymptomForm';
import { Text } from '@/ui/Text';
import { confirmDelete, useDeleteWithUndo } from '@/ui/useDeleteWithUndo';

const PAGE = 4;

/** "3 dias depois da aplicação" */
function afterInjection(days: number, doseUpMcg: number | null): string {
  if (days === 0) return doseUpMcg ? `no dia da subida para ${mg(doseUpMcg)}` : 'no dia da aplicação';
  const n = plural(days, 'dia', 'dias');
  return doseUpMcg ? `${n} depois da subida para ${mg(doseUpMcg)}` : `${n} depois da aplicação`;
}

export default function JournalScreen() {
  const t = useTheme();
  const router = useRouter();
  const today = useToday();
  const injections = useInjections();
  const weights = useWeights();
  const journal = useJournal();
  const pens = usePens();
  const [shown, setShown] = useState(PAGE);

  const weeks = useMemo(() => {
    const doses = injections.filter((i) => i.dose_mcg !== null);
    const changes = doses.length ? weeklyChanges(trend(dailyMeans(weights)), doses[0].at.slice(0, 10), today) : [];
    return buildTimeline({ injections, weights, journal, weekChanges: changes, today });
  }, [injections, weights, journal, today]);

  const lastDose = [...injections].reverse().find((i) => i.dose_mcg !== null && i.at.slice(0, 10) <= today);
  const sinceInjection = lastDose ? daysBetween(lastDose.at, today) : null;
  const numbers = useMemo(() => penNumbers(pens), [pens]);
  const patterns = useMemo(() => symptomPatterns(journal, injections).slice(0, 3), [journal, injections]);

  return (
    <Screen
      title="Diário"
      right={<IconButton icon="pencil" label="Nova nota" onPress={() => router.push('/log/note')} />}
    >
      <TodayCard subtitle={`${weekdayAndDate(today)}${sinceInjection !== null ? ` · ${afterInjection(sinceInjection, null)}` : ''}`} />

      {patterns.length ? (
        <Card style={{ gap: space.s }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s }}>
            <Icon name="activity" size={18} color={t.c.med} />
            <Text variant="headline" accessibilityRole="header">
              Padrões nos seus registros
            </Text>
          </View>
          {patterns.map((p) => (
            <Text key={`${p.type}-${p.kind}`} color="text2">
              {patternText(p)}
            </Text>
          ))}
          <Text variant="caption" color="text3" style={{ fontFamily: fonts.regular }}>
            Só uma leitura dos seus registros. Se um sintoma incomodar, converse com seu médico.
          </Text>
        </Card>
      ) : null}

      {weeks.length ? (
        <>
          {weeks.slice(0, shown).map((w) => (
            <WeekCard key={w.key} week={w} numbers={numbers} />
          ))}
          {weeks.length > shown ? (
            <Button label="Ver semanas anteriores" variant="soft" onPress={() => setShown((n) => n + PAGE)} />
          ) : null}
        </>
      ) : (
        <Card>
          <Text color="text2">Sua história aparece aqui: aplicações, pesagens, sintomas e notas, semana a semana.</Text>
        </Card>
      )}
    </Screen>
  );
}

function TodayCard({ subtitle }: { subtitle: string }) {
  const t = useTheme();
  const db = useSQLiteContext();
  const [saved, setSaved] = useState<{ ids: number[]; summary: string } | null>(null);
  return (
    <Card style={{ gap: 14 }}>
      <View style={{ gap: 2 }}>
        <Text variant="title2" style={{ fontSize: 18, lineHeight: 24 }} accessibilityRole="header">
          Como você está hoje?
        </Text>
        <Text variant="label" color="text3" style={{ fontFamily: fonts.regular }}>
          {subtitle}
        </Text>
      </View>
      {saved ? (
        <View
          accessibilityLiveRegion="polite"
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.m, paddingLeft: 14, borderRadius: 16, backgroundColor: t.c.bg }}
        >
          <View style={{ width: 32, height: 32, borderRadius: radius.pill, backgroundColor: t.c.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={16} color={t.c.onInk} strokeWidth={2.5} />
          </View>
          <Text variant="label" style={{ flex: 1, fontSize: 14, lineHeight: 20, fontFamily: fonts.semibold }}>
            {`Registrado: ${saved.summary}`}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void Promise.all(saved.ids.map((id) => deleteRow(db, 'journal', id))).then(() => setSaved(null));
            }}
            style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}
          >
            <Text variant="label" style={{ fontFamily: fonts.bold, color: t.c.medStrong }}>
              Desfazer
            </Text>
          </Pressable>
        </View>
      ) : (
        <SymptomForm onSaved={(ids, summary) => setSaved({ ids, summary })} />
      )}
      {saved ? (
        <Pressable accessibilityRole="button" onPress={() => setSaved(null)} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
          <Text variant="label" style={{ fontFamily: fonts.semibold, color: t.c.medStrong }}>
            Registrar mais
          </Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

function weekTitle(w: TimelineWeek): string {
  if (w.week !== null) return `Semana ${w.week}${w.mcg ? ` · ${mg(w.mcg)}` : ''}`;
  return w.key === 'before' ? 'Antes do tratamento' : `${ddmm(w.from)} a ${ddmm(w.to)}`;
}

function WeekCard({ week, numbers }: { week: TimelineWeek; numbers: ReadonlyMap<number, number> }) {
  const range = `${ddmm(week.from)} a ${ddmm(week.to)}`;
  const right = week.week !== null || week.key === 'before' ? `${range}${week.changeG !== null ? ` · ${signedKg(week.changeG)} kg` : ''}` : '';
  return (
    <Card style={{ gap: 0, paddingTop: space.l, paddingBottom: 6, paddingHorizontal: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.s, paddingBottom: 4 }}>
        <Text variant="overline" color="medStrong" accessibilityRole="header">
          {weekTitle(week)}
        </Text>
        {right ? (
          <Text variant="caption" color="text3" style={{ fontFamily: fonts.regular }}>
            {right}
          </Text>
        ) : null}
      </View>
      {week.items.map((item, i) => (
        <ItemRow key={`${item.kind}${item.at}${i}`} item={item} numbers={numbers} last={i === week.items.length - 1} />
      ))}
    </Card>
  );
}

function ItemRow({ item, numbers, last }: { item: TimelineItem; numbers: ReadonlyMap<number, number>; last: boolean }) {
  const t = useTheme();
  const router = useRouter();
  const remove = useDeleteWithUndo();

  let icon: IconName = 'heart';
  let tone: 'med' | 'body' | 'neutral' = 'neutral';
  let title = '';
  let sub: string | null = null;
  let subStrong = false;
  let onPress: () => void = () => {};

  if (item.kind === 'weight') {
    icon = 'scale';
    tone = 'body';
    title = `Peso · ${kgUnit(item.weight.g)}`;
    const parts = [item.lowest ? 'o menor até agora' : null, item.othersInWeek ? `mais ${plural(item.othersInWeek, 'pesagem', 'pesagens')} na semana` : null];
    sub = parts.filter(Boolean).join(' · ') || null;
    subStrong = item.lowest;
    onPress = () => router.push({ pathname: '/log/weight', params: { id: String(item.weight.id) } });
  } else if (item.kind === 'injection') {
    const inj = item.injection;
    icon = 'pen';
    tone = 'med';
    if (inj.dose_mcg === null) {
      title = 'Semana pulada';
      sub = inj.note;
    } else {
      title = `Aplicação · ${mg(inj.dose_mcg)}`;
      sub = [
        item.firstEver ? 'primeira aplicação' : item.firstOfDose ? `primeira dose de ${mg(inj.dose_mcg)}` : null,
        inj.site ? siteInline(inj.site) : null,
        inj.pen_id !== null ? `caneta ${numbers.get(inj.pen_id) ?? '?'}${item.opensPen ? ' aberta' : ''}` : null,
      ]
        .filter(Boolean)
        .join(' · ');
    }
    onPress = () => router.push({ pathname: '/log/injection', params: { id: String(inj.id) } });
  } else {
    const isNote = item.entries[0].kind === 'note';
    icon = isNote ? 'pencil' : 'heart';
    title = isNote
      ? 'Nota'
      : item.entries
          .map((e) => (e.kind === 'well' ? 'Tudo bem' : `${e.kind === 'other' && e.text ? e.text : SYMPTOM_LABEL[e.kind] ?? e.kind}${e.level ? ` · ${LEVEL_LABEL[e.level]}` : ''}`))
          .join(' · ');
    const text = item.entries.find((e) => e.text && e.kind !== 'other')?.text ?? null;
    sub = isNote ? text : text ? `“${text}”` : item.daysAfter !== null ? afterInjection(item.daysAfter, item.afterDoseUpMcg) : null;
    onPress = isNote
      ? () => router.push({ pathname: '/log/note', params: { id: String(item.entries[0].id) } })
      : () =>
          confirmDelete('Excluir este registro?', title, () => {
            void remove('journal', item.entries.map((e) => e.id), 'Registro excluído');
          });
  }

  const bg = { med: t.c.medSoft, body: t.c.bodySoft, neutral: t.c.surface2 }[tone];
  const fg = { med: t.c.med, body: t.c.bodyStrong, neutral: t.c.text2 }[tone];
  const when = `${weekdayShort(item.at)} ${timeOf(item.at)}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}${sub ? `, ${sub}` : ''}, ${when}`}
      accessibilityHint={item.kind === 'journal' && item.entries[0].kind !== 'note' ? 'Toque para excluir' : 'Toque para editar'}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: space.m,
        paddingVertical: space.m,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: t.c.line,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View style={{ width: 36, height: 36, borderRadius: radius.pill, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18} color={fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.semibold, lineHeight: 20 }}>{title}</Text>
        {sub ? (
          <Text
            variant="label"
            numberOfLines={4}
            style={{ fontFamily: subStrong ? fonts.semibold : fonts.regular, color: subStrong ? t.c.bodyStrong : t.c.text2 }}
          >
            {sub}
          </Text>
        ) : null}
      </View>
      <Text variant="caption" color="text3" style={{ lineHeight: 20, fontFamily: fonts.regular }}>
        {when}
      </Text>
    </Pressable>
  );
}
