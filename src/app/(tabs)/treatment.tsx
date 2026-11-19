import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { useInjections, usePens, useToday, useWeights } from '@/db/hooks';
import { updatePen, type InjectionRow, type Site } from '@/db/queries';
import { useSettings } from '@/db/settings';
import { costSummary } from '@/domain/costs';
import { penNumbers, penOverview, usedMcgByPen, type PenLike } from '@/domain/pens';
import { nextDue, plannedDays } from '@/domain/schedule';
import { rotation } from '@/domain/sites';
import { doseRank, titrationState, type TitrationState } from '@/domain/titration';
import { treatmentWeek } from '@/domain/weight';
import { daysBetween, shiftDay } from '@/lib/dates';
import { ago, ddmm, joinPt, mg, mgPlain, money, plural, weekdayPlural } from '@/lib/format';
import { injectionDetail, injectionTitle, penLabel, SITE_LABEL, SITE_NAME } from '@/lib/labels';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';
import { InfoNote, LinkButton, Pill } from '@/ui/Bits';
import { BodyMap } from '@/ui/BodyMap';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { DoseSteps, type DoseStepRow } from '@/ui/DoseSteps';
import { Icon } from '@/ui/Icon';
import { IconButton } from '@/ui/IconButton';
import { EntryRow } from '@/ui/List';
import { MonthCalendar, type DayMark } from '@/ui/MonthCalendar';
import { PenGauge, type PenSegment } from '@/ui/PenGauge';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';

export default function TreatmentScreen() {
  const t = useTheme();
  const router = useRouter();
  const today = useToday();
  const injections = useInjections();
  const pens = usePens();
  const weights = useWeights();
  const settings = useSettings();

  const data = useMemo(() => {
    const titration = titrationState(settings.plan, injections);
    const last = injections[injections.length - 1];
    const next = nextDue(last ? last.at.slice(0, 10) : null, settings.schedule.weekday, today);
    const used = usedMcgByPen(injections);
    const overview = penOverview(pens, used, titration.currentMcg, next.day, today);
    const doses = injections.filter((i) => i.dose_mcg !== null);
    return {
      titration,
      next,
      used,
      overview,
      numbers: penNumbers(pens),
      rotation: rotation(injections, settings.sites),
      firstDay: doses[0]?.at.slice(0, 10) ?? null,
      doseCount: doses.length,
      costs: costSummary(pens, today),
    };
  }, [injections, pens, settings.plan, settings.schedule.weekday, settings.sites, today]);

  const doseColor = (mcg: number) => t.dose[Math.min(doseRank(mcg, settings.plan), t.dose.length - 1)];
  const brands = [...new Set(pens.map((p) => p.brand))];
  const subtitle = [
    brands.length ? joinPt(brands) : null,
    `${weekdayPlural(settings.schedule.weekday)} às ${settings.schedule.time}`,
    data.firstDay ? `semana ${treatmentWeek(data.firstDay, today)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Screen
      title="Tratamento"
      subtitle={subtitle}
      right={<IconButton icon="pencil" label="Ajustar o tratamento" onPress={() => router.push('/settings')} />}
    >
      <PlanCard titration={data.titration} doseColor={doseColor} onEdit={() => router.push('/settings/plan')} />
      <PenCard
        overview={data.overview}
        numbers={data.numbers}
        injections={injections}
        nextDay={data.next.day}
        today={today}
      />
      <CostsCard costs={data.costs} hasPens={pens.length > 0} onEdit={() => router.push('/pens/prices')} />
      <CalendarCard injections={injections} weights={weights} next={data.next} today={today} />
      <RotationCard rotation={data.rotation} enabled={settings.sites} today={today} onEdit={() => router.push('/settings/sites')} />
      <HistoryCard
        injections={injections}
        numbers={data.numbers}
        doseColor={doseColor}
        total={data.doseCount}
        firstDay={data.firstDay}
        onSeeAll={() => router.push('/injections')}
      />
    </Screen>
  );
}

function CardHead({ title, action }: { title: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s }}>
      <Text variant="headline" accessibilityRole="header">
        {title}
      </Text>
      {action ? <LinkButton label={action.label} onPress={action.onPress} /> : null}
    </View>
  );
}

// ---------- Custos ----------

function CostsCard({ costs, hasPens, onEdit }: { costs: ReturnType<typeof costSummary>; hasPens: boolean; onEdit: () => void }) {
  if (!hasPens) return null;
  if (!costs) {
    return (
      <Card style={{ gap: space.s }}>
        <CardHead title="Custos" action={{ label: 'Informar preços', onPress: onEdit }} />
        <Text color="text2">Informe quanto pagou em cada caneta para ver o total e a média por mês.</Text>
      </Card>
    );
  }
  const tiles: [string, string, string][] = [
    ['Total em canetas', money(costs.totalCents), plural(costs.pricedPens, 'caneta', 'canetas')],
    costs.perMonthCents !== null
      ? ['Por mês', money(costs.perMonthCents), 'canetas já abertas']
      : ['Média por caneta', money(costs.averageCents ?? 0), 'com preço informado'],
  ];
  return (
    <Card style={{ gap: space.m }}>
      <CardHead title="Custos" action={{ label: 'Preços', onPress: onEdit }} />
      <View style={{ flexDirection: 'row', gap: space.m }}>
        {tiles.map(([label, value, sub]) => (
          <View key={label} accessible accessibilityLabel={`${label}: ${value}, ${sub}`} style={{ flex: 1, gap: 2 }}>
            <Text variant="caption" color="text3">
              {label}
            </Text>
            <Text style={{ fontSize: 20, lineHeight: 26, fontFamily: fonts.semibold }}>{value}</Text>
            <Text variant="caption" color="text2" style={{ fontFamily: fonts.regular }}>
              {sub}
            </Text>
          </View>
        ))}
      </View>
      {costs.unpricedPens ? (
        <Text variant="caption" color="text3" style={{ fontFamily: fonts.regular }}>
          {`${plural(costs.unpricedPens, 'caneta está', 'canetas estão')} sem preço e ${costs.unpricedPens === 1 ? 'fica' : 'ficam'} de fora da conta.`}
        </Text>
      ) : null}
    </Card>
  );
}

// ---------- Plano de doses ----------

function PlanCard({
  titration,
  doseColor,
  onEdit,
}: {
  titration: TitrationState;
  doseColor: (mcg: number) => string;
  onEdit: () => void;
}) {
  const { steps, currentMcg, weeksAtDose, runStart, plannedWeeks, suggestMcg } = titration;
  const rows: DoseStepRow[] = [];
  const upcoming = steps.filter((s) => s.status === 'next');

  for (const s of steps) {
    if (s.status === 'done') {
      const planned = s.plannedWeeks !== null && s.count !== s.plannedWeeks ? ` (plano: ${s.plannedWeeks})` : '';
      rows.push({
        key: `d${s.mcg}`,
        title: mg(s.mcg),
        sub: s.count && s.first && s.last ? `${plural(s.count, 'semana', 'semanas')}${planned} · ${ddmm(s.first)} a ${ddmm(s.last)}` : 'não usada',
        color: doseColor(s.mcg),
        status: 'done',
        badge: 'concluída',
      });
    } else if (s.status === 'current') {
      const since = runStart ? ` · desde ${ddmm(runStart)}` : '';
      rows.push({
        key: `c${s.mcg}`,
        title: mg(s.mcg),
        sub: !s.inPlan
          ? `fora do plano · semana ${weeksAtDose}${since}`
          : plannedWeeks !== null
            ? `semana ${weeksAtDose} de ${plannedWeeks}${since}`
            : `manutenção · semana ${weeksAtDose}${since}`,
        color: doseColor(s.mcg),
        status: 'current',
        badge: 'atual',
        progress: plannedWeeks !== null && s.inPlan ? { done: weeksAtDose, total: Math.max(plannedWeeks, weeksAtDose) } : undefined,
      });
    }
  }
  if (currentMcg === null) {
    // Sem aplicações: o plano inteiro, etapa por etapa.
    for (const s of upcoming) {
      rows.push({
        key: `n${s.mcg}`,
        title: mg(s.mcg),
        sub: s.plannedWeeks !== null ? plural(s.plannedWeeks, 'semana', 'semanas') : 'manutenção',
        color: doseColor(s.mcg),
        status: 'next',
        badge: 'planejada',
      });
    }
  } else if (upcoming.length) {
    rows.push({
      key: 'next',
      title: `${joinPt(upcoming.map((s) => mgPlain(s.mcg)))} mg`,
      sub: upcoming.length > 1 ? 'próximas etapas, a confirmar com o médico' : 'próxima etapa, a confirmar com o médico',
      color: doseColor(upcoming[0].mcg),
      status: 'next',
      badge: 'a confirmar',
    });
  }

  let note = 'O plano segue a sua prescrição. O Leve registra e lembra; quem decide a dose é o seu médico.';
  if (suggestMcg !== null) note = `Pelo seu plano, a próxima seria ${mg(suggestMcg)}. Confirme com seu médico.`;
  else if (currentMcg !== null && plannedWeeks !== null)
    note = `Depois da ${plannedWeeks}ª semana em ${mg(currentMcg)}, o Leve pergunta se a dose vai mudar. Quem decide é o seu médico.`;
  else if (currentMcg !== null) note = 'Mudanças de dose seguem a orientação do seu médico.';

  return (
    <Card style={{ gap: 14 }}>
      <CardHead title="Plano de doses" action={{ label: 'Editar plano', onPress: onEdit }} />
      <DoseSteps rows={rows} />
      <InfoNote tone={suggestMcg !== null ? 'med' : 'neutral'}>{note}</InfoNote>
    </Card>
  );
}

// ---------- Caneta em uso e estoque ----------

function PenCard({
  overview,
  numbers,
  injections,
  nextDay,
  today,
}: {
  overview: ReturnType<typeof penOverview>;
  numbers: ReadonlyMap<number, number>;
  injections: readonly InjectionRow[];
  nextDay: string;
  today: string;
}) {
  const t = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const toast = useToast();
  const { inUse, inUseState: st, stock, nextDoseMcg, coverage, buy } = overview;
  const name = (p: PenLike) => `Caneta ${numbers.get(p.id) ?? '?'}`;

  const stockRow = (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Abre a lista de canetas"
      onPress={() => router.push('/pens')}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.m,
        paddingVertical: space.m,
        paddingHorizontal: 14,
        borderRadius: 16,
        backgroundColor: t.c.bg,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: t.c.surface, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="box" size={18} color={t.c.text2} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text variant="label" style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.semibold }}>
          {stock.length ? `Estoque: ${plural(stock.length, 'caneta', 'canetas')} na geladeira` : 'Estoque vazio'}
        </Text>
        <Text variant="caption" color="text2" style={{ fontFamily: fonts.regular }}>
          {stock.length
            ? `${name(stock[0])} · ${penLabel(stock[0])}${coverage ? ` · as doses cobrem até ${ddmm(coverage)}` : ''}`
            : coverage
              ? `a caneta em uso cobre até ${ddmm(coverage)}`
              : 'adicione a próxima caneta quando comprar'}
        </Text>
      </View>
      <Icon name="chevronRight" size={18} color={t.c.text3} strokeWidth={2} />
    </Pressable>
  );

  const addButton = <Button label="Adicionar caneta ao estoque" icon="plus" variant="soft" onPress={() => router.push('/pens/new')} />;

  if (!inUse || !st || nextDoseMcg === null) {
    const first = stock[0];
    return (
      <Card>
        <CardHead title="Canetas" />
        {first ? (
          <>
            <Text color="text2">Nenhuma caneta em uso. Quando abrir a próxima, marque aqui para acompanhar as doses e a validade.</Text>
            <Button
              label={`Começar a usar a ${name(first)}`}
              variant="med"
              onPress={() => {
                void updatePen(db, first.id, { opened_on: today }).then(() =>
                  toast.show({ message: `${name(first)} em uso a partir de hoje.` }),
                );
              }}
            />
            {stockRow}
          </>
        ) : (
          <>
            <Text color="text2">Cadastre suas canetas para acompanhar as doses restantes, a validade depois de aberta e a hora de comprar.</Text>
            {addButton}
          </>
        )}
      </Card>
    );
  }

  const usedDays = injections.filter((i) => i.pen_id === inUse.id && i.dose_mcg !== null).map((i) => i.at.slice(0, 10));
  const segments: PenSegment[] = [
    ...usedDays.map((d) => ({ used: true, label: ddmm(d) })),
    ...Array.from({ length: st.dosesLeft }, (_, k) => ({ used: false, label: ddmm(shiftDay(nextDay, 7 * k)), next: k === 0 })),
  ];
  const weeksOpen = inUse.days_open % 7 === 0 ? plural(inUse.days_open / 7, 'semana', 'semanas') : plural(inUse.days_open, 'dia', 'dias');

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
        <View style={{ width: 40, height: 40, borderRadius: radius.pill, backgroundColor: t.c.medSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="pen" size={22} color={t.c.med} />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text variant="headline">{penLabel(inUse)}</Text>
          <Text variant="label" color="text2" style={{ fontFamily: fonts.regular }}>
            {`${name(inUse)} · aberta em ${ddmm(inUse.opened_on as string)}`}
          </Text>
        </View>
        <Pill label="em uso" tone="med" />
      </View>

      {segments.length > 0 && segments.length <= 8 ? (
        <PenGauge
          segments={segments}
          accessibilityLabel={`Doses: ${usedDays.length ? `${joinPt(usedDays.map(ddmm))} aplicadas` : 'nenhuma aplicada'}; ${plural(st.dosesLeft, 'dose restante', 'doses restantes')}`}
        />
      ) : null}

      <View style={{ flexDirection: 'row', gap: space.m, paddingTop: 14, borderTopWidth: 1, borderTopColor: t.c.line }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="caption" color="text3" style={{ fontFamily: fonts.semibold }}>
            Restante
          </Text>
          <Text variant="headline">
            {st.dosesLeft > 0 ? `${plural(st.dosesLeft, 'dose', 'doses')} de ${mg(nextDoseMcg)}` : `${mg(st.leftMcg)}, menos de 1 dose`}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="caption" color="text3" style={{ fontFamily: fonts.semibold }}>
            Usar até
          </Text>
          <Text variant="headline" color={st.expiringSoon || st.expired ? 'warnStrong' : 'ink'}>
            {ddmm(st.useBy as string)}
          </Text>
          <Text variant="caption" color={st.expiringSoon || st.expired ? 'warnStrong' : 'text3'} style={{ fontFamily: fonts.regular }}>
            {st.expired
              ? 'passou do prazo'
              : st.expiringSoon
                ? `vence ${st.daysToExpiry === 0 ? 'hoje' : `em ${plural(st.daysToExpiry as number, 'dia', 'dias')}`}`
                : `${weeksOpen} após aberta`}
          </Text>
        </View>
      </View>

      {st.lastDose ? <InfoNote tone="warn">A próxima aplicação usa a última dose desta caneta.</InfoNote> : null}
      {st.dosesLeft === 0 ? (
        <InfoNote tone="warn">Esta caneta não tem mais uma dose inteira. Finalize-a na lista de canetas e comece a próxima.</InfoNote>
      ) : null}
      {buy ? <InfoNote tone="warn">{`Hora de comprar: o estoque não tem caneta para ${mg(nextDoseMcg)}.`}</InfoNote> : null}
      {st.expired ? (
        <InfoNote tone="warn">{`Passou do prazo de uso depois de aberta (${ddmm(st.useBy as string)}). Confirme com seu médico antes de usar.`}</InfoNote>
      ) : null}

      {stockRow}
      {addButton}
    </Card>
  );
}

// ---------- Calendário ----------

function CalendarCard({
  injections,
  weights,
  next,
  today,
}: {
  injections: readonly InjectionRow[];
  weights: readonly { at: string }[];
  next: ReturnType<typeof nextDue>;
  today: string;
}) {
  const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }));
  const marks = useMemo(() => {
    const map = new Map<string, DayMark>();
    const mark = (day: string, patch: DayMark) => map.set(day, { ...map.get(day), ...patch });
    for (const i of injections) mark(i.at.slice(0, 10), i.dose_mcg !== null ? { applied: true } : { skipped: true });
    for (const w of weights) mark(w.at.slice(0, 10), { weighed: true });
    const end = `${ym.y}-${String(ym.m + 1).padStart(2, '0')}-31`;
    for (const d of plannedDays(next, end)) if (!map.get(d)?.applied) mark(d, { planned: true });
    return map;
  }, [injections, weights, next, ym]);

  const shift = (delta: number) =>
    setYm(({ y, m }) => {
      const n = m + delta;
      return { y: y + Math.floor(n / 12), m: ((n % 12) + 12) % 12 };
    });

  return (
    <Card style={{ paddingHorizontal: space.l, paddingTop: space.l, paddingBottom: 18, gap: space.s }}>
      <MonthCalendar year={ym.y} month={ym.m} marks={marks} today={today} onPrev={() => shift(-1)} onNext={() => shift(1)} />
    </Card>
  );
}

// ---------- Rodízio de locais ----------

const REGIONS: { sites: [Site, Site]; plural: string }[] = [
  { sites: ['AE', 'AD'], plural: 'Abdômen' },
  { sites: ['CE', 'CD'], plural: 'Coxas' },
  { sites: ['BE', 'BD'], plural: 'Braços' },
];

function RotationCard({
  rotation: rot,
  enabled,
  today,
  onEdit,
}: {
  rotation: ReturnType<typeof rotation>;
  enabled: readonly Site[];
  today: string;
  onEdit: () => void;
}) {
  const t = useTheme();
  const suggested = rot[0]?.site ?? null;
  const fills: Partial<Record<Site, string>> = {};
  rot.forEach((u, i) => {
    fills[u.site] = i === 0 ? t.c.med : t.sites[Math.min(i - 1, t.sites.length - 1)];
  });
  const off: string[] = [];
  for (const r of REGIONS) {
    const missing = r.sites.filter((s) => !enabled.includes(s));
    if (missing.length === 2) off.push(r.plural);
    else off.push(...missing.map((s) => SITE_LABEL[s]));
  }
  const usedCount = rot.filter((u) => u.lastAt).length;

  return (
    <Card style={{ gap: 14 }}>
      <View style={{ gap: 2 }}>
        <Text variant="headline" accessibilityRole="header">
          Rodízio de locais
        </Text>
        {suggested ? (
          <Text variant="label" color="text2" style={{ fontFamily: fonts.regular }}>
            Próximo sugerido:{' '}
            <Text variant="label" style={{ fontFamily: fonts.bold, color: t.c.medStrong }}>
              {SITE_NAME[suggested]}
            </Text>
          </Text>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <BodyMap fills={fills} />
        <View style={{ flex: 1, gap: 10 }}>
          {rot.map((u, i) => {
            const days = u.lastAt ? daysBetween(u.lastAt, today) : null;
            const isLast = i === rot.length - 1 && usedCount > 1 && u.lastAt !== null;
            const when = u.lastAt ? `${ddmm(u.lastAt)}, ${isLast ? 'a última' : ago(days as number)}` : 'ainda não usado';
            return (
              <View key={u.site} accessible>
                {i === 0 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: radius.pill, backgroundColor: t.c.med }} />
                    <Text variant="label" style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bold, color: t.c.medStrong }}>
                      {`${SITE_LABEL[u.site]} · sugerido`}
                    </Text>
                  </View>
                ) : (
                  <Text variant="label" style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.semibold }}>
                    {SITE_LABEL[u.site]}
                  </Text>
                )}
                <Text variant="caption" color="text3" style={{ fontFamily: fonts.regular }}>
                  {i === 0 && u.lastAt ? `último uso ${when}` : when}
                </Text>
              </View>
            );
          })}
          {off.length ? (
            <View accessible>
              <Text variant="label" color="text2" style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.semibold }}>
                {joinPt(off)}
              </Text>
              <Text variant="caption" color="text3" style={{ fontFamily: fonts.regular }}>
                fora do rodízio (Ajustes)
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <LinkButton label="Escolher os locais" onPress={onEdit} />
    </Card>
  );
}

// ---------- Aplicações ----------

function HistoryCard({
  injections,
  numbers,
  doseColor,
  total,
  firstDay,
  onSeeAll,
}: {
  injections: readonly InjectionRow[];
  numbers: ReadonlyMap<number, number>;
  doseColor: (mcg: number) => string;
  total: number;
  firstDay: string | null;
  onSeeAll: () => void;
}) {
  const t = useTheme();
  const router = useRouter();
  const recent = [...injections].reverse().slice(0, 4);
  return (
    <Card style={{ gap: 0, paddingBottom: space.m }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.s, paddingBottom: 6 }}>
        <Text variant="headline" accessibilityRole="header">
          Aplicações
        </Text>
        {firstDay ? (
          <Text variant="caption" color="text3" style={{ fontFamily: fonts.regular }}>
            {`${total} desde ${ddmm(firstDay)}`}
          </Text>
        ) : null}
      </View>
      {recent.length ? (
        recent.map((i, k) => (
          <EntryRow
            key={i.id}
            marker={i.dose_mcg !== null ? doseColor(i.dose_mcg) : t.c.track}
            title={injectionTitle(i)}
            sub={injectionDetail(i, numbers)}
            last={k === recent.length - 1}
            accessibilityLabel={`${injectionTitle(i)}: ${injectionDetail(i, numbers)}. Toque para editar.`}
            onPress={() => router.push({ pathname: '/log/injection', params: { id: String(i.id) } })}
          />
        ))
      ) : (
        <Text color="text2" style={{ paddingVertical: space.m }}>
          Nenhuma aplicação registrada ainda.
        </Text>
      )}
      {injections.length > 4 ? (
        <LinkButton align="center" label={`Ver todas as ${injections.length} aplicações`} onPress={onSeeAll} />
      ) : null}
    </Card>
  );
}

