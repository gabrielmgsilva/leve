import { useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';

import { useInjections, useMeasures, usePhotos, useToday, useWeights } from '@/db/hooks';
import { photoFile } from '@/db/photos';
import type { MeasureRow, PhotoRow, WeightRow } from '@/db/queries';
import { measureStats, waistHipRatio } from '@/domain/measures';
import { useSettings } from '@/db/settings';
import { doseOn, dosePhases } from '@/domain/phases';
import { periodStart, periodSummary, type Period } from '@/domain/progress';
import { doseRank } from '@/domain/titration';
import {
  bmi,
  bmiBand,
  dailyMeans,
  goalProjection,
  isPlateau,
  milestones,
  nextMilestone,
  phaseStats,
  trend,
  weeklyChanges,
  type Milestone,
} from '@/domain/weight';
import { daysBetween } from '@/lib/dates';
import { ago, ddmm, dayShort, kg, kgUnit, mg, monthYear, num, plural, signedKg, signedPct, timeOf, weekdayShort } from '@/lib/format';
import { BMI_BAND_LABEL, MEASURE_LABEL } from '@/lib/labels';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';
import { InfoNote, LinkButton, StatTile, Tag } from '@/ui/Bits';
import { Card } from '@/ui/Card';
import { PhaseBars, type PhaseRow } from '@/ui/charts/PhaseBars';
import { WeeklyBars } from '@/ui/charts/WeeklyBars';
import { WeightChart, type Band } from '@/ui/charts/WeightChart';
import { Icon } from '@/ui/Icon';
import { EntryRow } from '@/ui/List';
import { Screen } from '@/ui/Screen';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { Text } from '@/ui/Text';
import { useAddPhoto } from '@/ui/useAddPhoto';

const PERIODS: { value: Period; label: string; accessibilityLabel: string }[] = [
  { value: '1M', label: '1M', accessibilityLabel: 'Último mês' },
  { value: '3M', label: '3M', accessibilityLabel: 'Últimos 3 meses' },
  { value: '6M', label: '6M', accessibilityLabel: 'Últimos 6 meses' },
  { value: 'all', label: 'Tudo', accessibilityLabel: 'Desde o início' },
];

const TREND_INFO =
  'A tendência é uma média que suaviza as oscilações do dia a dia (água, sal, intestino) e mostra para onde seu peso está indo de verdade. Quando você está perdendo peso, ela fica um pouco acima da balança.';

export default function ProgressScreen() {
  const t = useTheme();
  const router = useRouter();
  const today = useToday();
  const weights = useWeights();
  const injections = useInjections();
  const settings = useSettings();
  const measures = useMeasures();
  const photos = usePhotos();
  const addPhoto = useAddPhoto();

  const [period, setPeriod] = useState<Period>('all');
  const [showInfo, setShowInfo] = useState(false);
  const [showList, setShowList] = useState(false);
  const [listSize, setListSize] = useState(10);
  const [week, setWeek] = useState<number | null>(null);

  const doseColor = (mcg: number) => t.dose[Math.min(doseRank(mcg, settings.plan), t.dose.length - 1)];

  const data = useMemo(() => {
    if (!weights.length) return null;
    const points = trend(dailyMeans(weights));
    const first = weights[0];
    const latest = weights[weights.length - 1];
    const firstDay = first.at.slice(0, 10);
    const from = periodStart(period, today, firstDay);
    const summary = periodSummary(weights, points, from, today);
    const phases = dosePhases(injections);
    const firstInjection = phases[0]?.from ?? null;
    const weeks = firstInjection ? weeklyChanges(points, firstInjection, today).filter((w) => w.to >= from) : [];
    const ms = milestones(first.g, settings.profile.goalG, points);
    return {
      points,
      first,
      latest,
      firstDay,
      from,
      summary,
      phases,
      phaseStats: phaseStats(phases, points, { from, to: today }),
      weeks,
      milestones: ms,
      next: nextMilestone(ms, first.g, latest.g),
      plateau: isPlateau(points, today),
      projection: goalProjection(points, settings.profile.goalG, today),
    };
  }, [weights, injections, period, today, settings.profile.goalG]);

  if (!data) {
    return (
      <Screen title="Evolução">
        <Card>
          <CardTitle title="Seu peso aparece aqui" />
          <Text color="text2">Registre seu peso pelo botão + para ver a evolução, a tendência e os marcos.</Text>
        </Card>
        <MeasuresCard measures={measures} onAdd={() => router.push('/log/measures')} onEdit={(at) => router.push({ pathname: '/log/measures', params: { at } })} />
        <PhotosCard photos={photos} onAdd={addPhoto} onOpen={() => router.push('/photos')} />
      </Screen>
    );
  }

  const { first, latest, summary, from } = data;
  const totalG = latest.g - first.g;
  const height = settings.profile.heightCm;
  const bmiValue = height ? bmi(latest.g, height) : null;

  const bands: Band[] = data.phases.map((ph) => ({ from: ph.from, to: ph.to, label: mg(ph.mcg), color: doseColor(ph.mcg) }));
  const doseText = (day: string) => {
    const dose = doseOn(data.phases, day);
    return dose !== null ? mg(dose) : null;
  };

  const vis = summary.weighings;
  const chartLabel = vis.length
    ? `Peso de ${kg(vis[0].g)} kg em ${ddmm(vis[0].at)} para ${kg(vis[vis.length - 1].g)} kg em ${ddmm(vis[vis.length - 1].at)}` +
      (summary.changeG !== null ? `; tendência ${signedKg(summary.changeG)} kg no período` : '')
    : 'Nenhuma pesagem no período';

  const phaseRows: PhaseRow[] = data.phaseStats.map((p) => ({
    key: `${p.mcg}-${p.from}`,
    label: mg(p.mcg),
    sub: p.current ? `${p.count} sem · atual` : plural(p.count, 'semana', 'semanas'),
    color: doseColor(p.mcg),
    changeG: p.changeG,
    value: p.changeG !== null ? `${signedKg(p.changeG)} kg` : 'sem pesagens',
    rate: p.ratePerWeekG !== null ? `${signedKg(p.ratePerWeekG, 2)}/sem` : null,
  }));

  const editWeighing = (w: WeightRow) => router.push({ pathname: '/log/weight', params: { id: String(w.id) } });

  const records = [...vis].reverse();

  return (
    <Screen title="Evolução">
      {/* Peso atual */}
      <View accessible accessibilityLabel={`Última pesagem: ${kgUnit(latest.g)}, ${ago(daysBetween(latest.at, today))}`} style={{ gap: space.s }}>
        <Text variant="overline" color="text3">
          {`Última pesagem · ${ago(daysBetween(latest.at, today))}`}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
          <Text variant="display">{kg(latest.g)}</Text>
          <Text variant="headline" color="text2" style={{ fontFamily: fonts.medium, fontSize: 17 }}>
            kg
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s, marginBottom: space.xs }}>
        {weights.length > 1 ? (
          <Tag
            tone={totalG < 0 ? 'body' : totalG > 0 ? 'warn' : 'neutral'}
            icon={totalG < 0 ? 'arrowDown' : totalG > 0 ? 'arrowUp' : undefined}
            label={totalG === 0 ? `igual a ${ddmm(data.firstDay)}` : `${kg(Math.abs(totalG))} kg desde ${ddmm(data.firstDay)}`}
          />
        ) : null}
        {weights.length > 1 ? <Tag label={`${signedPct(totalG / first.g)} do peso inicial`} /> : null}
        {bmiValue !== null && settings.bmi !== 'off' ? (
          <Tag label={`IMC ${num(bmiValue)}${settings.bmi === 'band' ? ` · ${BMI_BAND_LABEL[bmiBand(bmiValue)]}` : ''}`} />
        ) : null}
      </View>

      <SegmentedControl
        options={PERIODS}
        value={period}
        onChange={(p) => {
          setPeriod(p);
          setWeek(null);
          setListSize(10);
        }}
        accessibilityLabel="Período dos gráficos"
      />

      {/* Gráfico de peso */}
      <Card style={{ paddingHorizontal: space.l, paddingTop: 18, paddingBottom: space.s, gap: space.m }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
          <Text variant="headline" accessibilityRole="header">
            Peso
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }} importantForAccessibility="no-hide-descendants">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 7, height: 7, borderRadius: radius.pill, backgroundColor: t.c.point }} />
              <Text variant="caption" color="text2">
                pesagens
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 14, height: 2, borderRadius: 1, backgroundColor: t.c.body }} />
              <Text variant="caption" color="text2">
                tendência
              </Text>
            </View>
          </View>
        </View>

        {summary.points.length ? (
          <WeightChart
            key={period}
            weighings={vis}
            points={summary.points}
            bands={bands}
            from={from}
            to={today}
            goalG={settings.profile.goalG}
            doseOn={doseText}
            accessibilityLabel={chartLabel}
          />
        ) : (
          <View style={{ height: 120, alignItems: 'center', justifyContent: 'center' }}>
            <Text color="text2">Nenhuma pesagem neste período.</Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
          <LinkButton icon="info" label="O que é a tendência?" onPress={() => setShowInfo((v) => !v)} />
          {vis.length ? (
            <LinkButton label={showList ? 'Ocultar registros' : 'Ver registros'} onPress={() => setShowList((v) => !v)} />
          ) : null}
        </View>
        {showInfo ? <InfoNote icon={null}>{TREND_INFO}</InfoNote> : null}
        {showList ? (
          <View style={{ borderTopWidth: 1, borderTopColor: t.c.line, paddingHorizontal: 4 }}>
            {records.slice(0, listSize).map((w, i, arr) => {
              const p = data.points.find((x) => x.day === w.at.slice(0, 10));
              return (
                <EntryRow
                  key={w.id}
                  title={`${weekdayShort(w.at)} ${ddmm(w.at)} · ${timeOf(w.at)} — ${kgUnit(w.g)}`}
                  sub={p ? `tendência ${kgUnit(p.t)}` : undefined}
                  onPress={() => editWeighing(w)}
                  accessibilityLabel={`${dayShort(w.at.slice(0, 10))}, ${timeOf(w.at)}: ${kgUnit(w.g)}. Toque para editar.`}
                  last={i === arr.length - 1 && records.length <= listSize}
                />
              );
            })}
            {records.length > listSize ? (
              <LinkButton align="center" label={`Mostrar mais (${records.length - listSize})`} onPress={() => setListSize((n) => n + 20)} />
            ) : null}
          </View>
        ) : null}
      </Card>

      {data.plateau ? (
        <InfoNote>Seu peso está estável nas últimas 3 semanas. Platôs são comuns no tratamento.</InfoNote>
      ) : null}

      {/* Resumo do período */}
      <View style={{ gap: space.m }}>
        <View style={{ flexDirection: 'row', gap: space.m }}>
          <StatTile
            label="Tendência no período"
            value={summary.changeG !== null ? `${signedKg(summary.changeG)} kg` : '—'}
            sub={`desde ${ddmm(from)}`}
            valueColor={summary.changeG !== null && summary.changeG > 0 ? 'warnStrong' : 'bodyStrong'}
          />
          <StatTile
            label="Ritmo médio"
            value={summary.rateG !== null ? signedKg(summary.rateG) : '—'}
            sub={summary.rateG !== null ? 'kg por semana' : 'dados insuficientes'}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: space.m }}>
          <StatTile
            label="Menor peso"
            value={summary.min ? kgUnit(summary.min.g) : '—'}
            sub={summary.min ? `${weekdayShort(summary.min.at)} ${ddmm(summary.min.at)}` : 'no período'}
          />
          <StatTile label="Pesagens" value={String(vis.length)} sub="no período" />
        </View>
      </View>

      {/* Por fase de dose */}
      {phaseRows.length ? (
        <Card>
          <CardTitle title="Por fase de dose" sub="Quanto a tendência variou em cada dose" />
          <PhaseBars rows={phaseRows} />
        </Card>
      ) : null}

      {/* Semana a semana */}
      {data.weeks.length ? (
        <WeeklyCard
          weeks={data.weeks}
          selected={week}
          onSelect={setWeek}
          doseText={doseText}
          periodChangeG={summary.changeG}
        />
      ) : null}

      {/* Marcos */}
      <MilestonesCard
        list={data.milestones}
        next={data.next}
        latestG={latest.g}
        projection={data.projection}
        hasGoal={settings.profile.goalG !== null}
        onSetGoal={() => router.push('/settings/profile')}
      />

      <MeasuresCard measures={measures} onAdd={() => router.push('/log/measures')} onEdit={(at) => router.push({ pathname: '/log/measures', params: { at } })} />
      <PhotosCard photos={photos} onAdd={addPhoto} onOpen={() => router.push('/photos')} />
    </Screen>
  );
}

const cmText = (mm: number) => num(mm / 10, mm % 10 === 0 ? 0 : 1);

function MeasuresCard({
  measures,
  onAdd,
  onEdit,
}: {
  measures: readonly MeasureRow[];
  onAdd: () => void;
  onEdit: (at: string) => void;
}) {
  const t = useTheme();
  const [showList, setShowList] = useState(false);
  const stats = useMemo(() => measureStats(measures), [measures]);
  const whr = useMemo(() => waistHipRatio(measures), [measures]);
  const sessions = useMemo(() => {
    const by = new Map<string, MeasureRow[]>();
    for (const m of measures) by.set(m.at, [...(by.get(m.at) ?? []), m]);
    return [...by.entries()].sort(([a], [b]) => (a < b ? 1 : -1));
  }, [measures]);

  return (
    <Card style={{ gap: space.m }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.s }}>
        <CardTitle title="Medidas" sub={stats.length ? 'Da primeira medição para a última' : 'Cintura, quadril e outras, em centímetros'} />
        <LinkButton icon="plus" label="Medir" onPress={onAdd} />
      </View>
      {stats.length ? (
        <View style={{ gap: 2 }}>
          {stats.map((s) => (
            <View
              key={s.kind}
              accessible
              accessibilityLabel={`${MEASURE_LABEL[s.kind] ?? s.kind}: ${cmText(s.latest.mm)} centímetros${s.count > 1 ? `, ${s.changeMm < 0 ? 'menos' : 'mais'} ${cmText(Math.abs(s.changeMm))} desde ${ddmm(s.first.at)}` : ''}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: t.c.line }}
            >
              <Text style={{ flex: 1, fontFamily: fonts.semibold }}>{MEASURE_LABEL[s.kind] ?? s.kind}</Text>
              <Text style={{ fontFamily: fonts.semibold }}>{`${cmText(s.latest.mm)} cm`}</Text>
              {s.count > 1 && s.changeMm !== 0 ? (
                <Tag
                  tone={s.changeMm < 0 ? 'body' : 'warn'}
                  icon={s.changeMm < 0 ? 'arrowDown' : 'arrowUp'}
                  label={`${cmText(Math.abs(s.changeMm))} cm`}
                />
              ) : (
                <Text variant="caption" color="text3">
                  {s.count > 1 ? 'igual' : ddmm(s.latest.at)}
                </Text>
              )}
            </View>
          ))}
          {whr ? (
            <Text variant="caption" color="text3" style={{ marginTop: space.s, fontFamily: fonts.regular }}>
              {`Relação cintura/quadril em ${ddmm(whr.at)}: ${num(whr.ratio, 2)}`}
            </Text>
          ) : null}
        </View>
      ) : (
        <Text color="text2">Medir a cintura uma vez por mês mostra o que muda além do peso.</Text>
      )}
      {sessions.length ? (
        <LinkButton label={showList ? 'Ocultar medições' : `Ver medições (${sessions.length})`} onPress={() => setShowList((v) => !v)} />
      ) : null}
      {showList ? (
        <View style={{ borderTopWidth: 1, borderTopColor: t.c.line }}>
          {sessions.map(([at, rows], i) => (
            <EntryRow
              key={at}
              title={`${weekdayShort(at)} ${ddmm(at)} · ${timeOf(at)}`}
              sub={rows.map((r) => `${(MEASURE_LABEL[r.kind] ?? r.kind).toLowerCase()} ${cmText(r.mm)}`).join(' · ')}
              onPress={() => onEdit(at)}
              accessibilityLabel={`Medição de ${dayShort(at.slice(0, 10))}. Toque para editar.`}
              last={i === sessions.length - 1}
            />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

function PhotosCard({ photos, onAdd, onOpen }: { photos: readonly PhotoRow[]; onAdd: () => void; onOpen: () => void }) {
  const t = useTheme();
  const recent = [...photos].reverse().slice(0, 8);
  return (
    <Card style={{ gap: space.m }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.s }}>
        <CardTitle title="Fotos" sub={photos.length ? plural(photos.length, 'foto, só no Leve', 'fotos, só no Leve') : 'Ficam só no Leve, fora da galeria'} />
        {photos.length ? <LinkButton label="Ver todas" onPress={onOpen} /> : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.s }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Adicionar foto"
          onPress={onAdd}
          style={({ pressed }) => ({
            width: 84,
            aspectRatio: 3 / 4,
            borderRadius: radius.field,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: t.c.track,
            backgroundColor: pressed ? t.c.surface2 : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          })}
        >
          <Icon name="camera" size={22} color={t.c.text2} />
          <Text variant="caption" color="text2">
            Foto
          </Text>
        </Pressable>
        {recent.map((p) => (
          <Pressable
            key={p.id}
            accessibilityRole="imagebutton"
            accessibilityLabel={`Foto de ${ddmm(p.at)}. Toque para ver as fotos.`}
            onPress={onOpen}
            style={{ width: 84, gap: 4 }}
          >
            <View style={{ aspectRatio: 3 / 4, borderRadius: radius.field, overflow: 'hidden', backgroundColor: t.c.surface2 }}>
              <Image source={{ uri: photoFile(p.file).uri }} style={{ flex: 1 }} resizeMode="cover" />
            </View>
            <Text variant="caption" color="text3" style={{ textAlign: 'center' }}>
              {ddmm(p.at)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </Card>
  );
}

function CardTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text variant="headline" accessibilityRole="header">
        {title}
      </Text>
      {sub ? (
        <Text variant="label" color="text3" style={{ fontFamily: fonts.regular }}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

function WeeklyCard({
  weeks,
  selected,
  onSelect,
  doseText,
  periodChangeG,
}: {
  weeks: ReturnType<typeof weeklyChanges>;
  selected: number | null;
  onSelect: (i: number) => void;
  doseText: (day: string) => string | null;
  periodChangeG: number | null;
}) {
  const t = useTheme();
  const last = weeks[weeks.length - 1];
  const w = selected !== null ? weeks[selected] : null;
  let text = `Toque numa barra para ver a semana.${last.partial ? ` A semana ${last.week} ainda está em andamento.` : ''}`;
  if (w) {
    const dose = doseText(w.partial ? w.from : w.to);
    const head = `Semana ${w.week} (${ddmm(w.from)} a ${ddmm(w.to)}${dose ? `, ${dose}` : ''})`;
    if (w.changeG === null) text = `${head}: sem pesagem nessa semana.`;
    else {
      text = `${head}: ${signedKg(w.changeG, 2)} kg`;
      if (w.partial) text += ', em andamento.';
      else if (w.changeG > 0 && periodChangeG !== null && periodChangeG < 0)
        text += '. Uma semana de alta faz parte; a tendência geral segue em queda.';
      else text += '.';
    }
  }
  return (
    <Card style={{ paddingHorizontal: space.l, gap: space.m }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 4 }}>
        <CardTitle title="Semana a semana" sub="Variação da tendência em cada semana" />
        <View style={{ gap: 4 }} importantForAccessibility="no-hide-descendants">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: t.c.body }} />
            <Text variant="caption" color="text2">
              queda
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: t.c.warn }} />
            <Text variant="caption" color="text2">
              aumento
            </Text>
          </View>
        </View>
      </View>
      <WeeklyBars
        weeks={weeks}
        selected={selected}
        onSelect={onSelect}
        accessibilityLabel={`Variação da tendência semana a semana, ${weeks.length} semanas. Deslize para cima ou para baixo para trocar de semana.`}
      />
      <View accessibilityLiveRegion="polite">
        <InfoNote icon={null}>{text}</InfoNote>
      </View>
    </Card>
  );
}

function milestoneTitle(m: Milestone): string {
  const target = kg(m.targetG, m.targetG % 1000 === 0 ? 0 : 1);
  if (m.kind === 'pct') return `−${m.value}% · ${target} kg`;
  if (m.kind === 'kg') return `−${m.value / 1000} kg · ${target} kg`;
  return `Meta · ${target} kg`;
}

function MilestonesCard({
  list,
  next,
  latestG,
  projection,
  hasGoal,
  onSetGoal,
}: {
  list: readonly Milestone[];
  next: ReturnType<typeof nextMilestone>;
  latestG: number;
  projection: ReturnType<typeof goalProjection>;
  hasGoal: boolean;
  onSetGoal: () => void;
}) {
  const t = useTheme();
  const reached = list.filter((m) => m.reachedOn !== null).slice(-2);
  const goal = list.find((m) => m.kind === 'goal');
  const showGoalRow = goal && goal.reachedOn === null && next?.milestone !== goal;

  const circle = (content: ReactNode, style: object) => (
    <View style={[{ width: 32, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' }, style]}>
      {content}
    </View>
  );

  return (
    <Card style={{ gap: 14 }}>
      <CardTitle title="Marcos" />
      {reached.map((m) => (
        <View key={`${m.kind}${m.value}`} accessible style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
          {circle(<Icon name="check" size={16} color={t.c.surface} strokeWidth={2.5} />, { backgroundColor: t.c.body })}
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.semibold, lineHeight: 20 }}>{milestoneTitle(m)}</Text>
            <Text variant="caption" color="text3" style={{ fontFamily: fonts.regular }}>
              {`alcançado em ${ddmm(m.reachedOn as string)}`}
            </Text>
          </View>
        </View>
      ))}
      {next ? (
        <View accessible style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
          {circle(
            <Text variant="caption" color="bodyStrong" style={{ fontSize: 10, fontFamily: fonts.bold }}>
              {`${Math.round(next.progress * 100)}%`}
            </Text>,
            { borderWidth: 2, borderColor: t.c.body },
          )}
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.s }}>
              <Text style={{ fontFamily: fonts.semibold, lineHeight: 20, flexShrink: 1 }}>{milestoneTitle(next.milestone)}</Text>
              <Text variant="caption" color="bodyStrong" style={{ fontFamily: fonts.semibold, lineHeight: 20 }}>
                {next.remainingG > 0 ? `faltam ${kgUnit(next.remainingG)}` : 'quase lá'}
              </Text>
            </View>
            <View style={{ height: 6, borderRadius: radius.pill, backgroundColor: t.c.surface2 }}>
              <View
                style={{ width: `${Math.round(next.progress * 100)}%`, height: 6, borderRadius: radius.pill, backgroundColor: t.c.body }}
              />
            </View>
          </View>
        </View>
      ) : null}
      {showGoalRow && goal && next ? (
        <View accessible style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
          {circle(<Icon name="flag" size={16} color={t.c.text3} strokeWidth={2} />, { borderWidth: 2, borderColor: t.c.line })}
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', gap: space.s }}>
            <Text style={{ fontFamily: fonts.semibold, lineHeight: 20 }}>{milestoneTitle(goal)}</Text>
            <Text variant="caption" color="text2" style={{ fontFamily: fonts.semibold, lineHeight: 20 }}>
              {`faltam ${kgUnit(Math.max(0, latestG - goal.targetG))}`}
            </Text>
          </View>
        </View>
      ) : null}
      {projection ? (
        <InfoNote tone="body" icon="flag">
          {`Se o ritmo das últimas 4 semanas (${signedKg(projection.rateG, 2)} kg por semana) continuar, a meta chega por volta de ${monthYear(projection.day)}.`}
        </InfoNote>
      ) : null}
      {!hasGoal ? <LinkButton icon="flag" label="Definir uma meta de peso" onPress={onSetGoal} /> : null}
    </Card>
  );
}
