import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, type ReactNode } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { exportBackup } from '@/db/backupFile';
import { useInjections, usePens, useToday, useWeights } from '@/db/hooks';
import { addInjection, deleteRow, wipeAll } from '@/db/queries';
import { seedDemo } from '@/db/seed';
import { useSettings } from '@/db/settings';
import { injectionDefaults } from '@/domain/injection';
import { penNumbers, penOverview, usedMcgByPen } from '@/domain/pens';
import { nextDue } from '@/domain/schedule';
import { backupOverdue, goalProgress, recentTrend, todayAlert, weekStrip, weekTrendChange, type TodayAlert } from '@/domain/today';
import { dailyMeans, isPlateau, milestones, nextMilestone, trend, treatmentWeek, type Milestone, type TrendPoint } from '@/domain/weight';
import { daysBetween, dayToDate } from '@/lib/dates';
import { ago, ddmm, greeting, kg, kgUnit, longDate, mg, onWeekday, plural, signedKg, timeOf, weekOfPlan, WEEKDAYS } from '@/lib/format';
import { penLabel, SITE_IN, SITE_LABEL } from '@/lib/labels';
import { applyThemePref, useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';
import { Pill, Tag } from '@/ui/Bits';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Icon, type IconName } from '@/ui/Icon';
import { IconButton } from '@/ui/IconButton';
import { GoalRing, Sparkline, WeekStrip } from '@/ui/Phase1Bits';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';

// Ferramentas de teste: no desenvolvimento ou em APK gerado com EXPO_PUBLIC_DEMO=1.
const SHOW_TEST_TOOLS = __DEV__ || process.env.EXPO_PUBLIC_DEMO === '1';

const TIPS: { title: string; body: string; icon: IconName }[] = [
  { title: 'Pese no mesmo horário', body: 'De manhã, antes do café, fica mais fácil comparar uma pesagem com a outra.', icon: 'scale' },
  { title: 'Varie o ponto da aplicação', body: 'Mesmo dentro da região, mude um pouco o lugar a cada semana.', icon: 'pen' },
  { title: 'Guarde um backup', body: 'Nos Ajustes, o backup vira um arquivo que você guarda onde quiser.', icon: 'download' },
];

// Resumo conferido na bula (Wegovy e Ozempic) e na bula europeia da semaglutida; ver docs/01-produto.md § 9.
const BULA =
  'Resumo da bula da semaglutida (Wegovy, Ozempic): se esquecer uma dose, aplique assim que lembrar, desde que tenham passado até 5 dias do dia previsto. Depois de 5 dias, pule a dose esquecida e aplique a próxima no dia habitual. Nunca aplique duas doses para compensar.\n\nConfirme com seu médico.';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Primeiro dia com pesagem ou aplicação (as listas vêm em ordem de data). */
const firstRecordDay = (weights: readonly { at: string }[], injections: readonly { at: string }[]): string | null => {
  const days = [weights[0]?.at, injections[0]?.at].filter((d): d is string => !!d).map((d) => d.slice(0, 10));
  return days.length ? days.sort()[0] : null;
};

export default function TodayScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const toast = useToast();
  const today = useToday();
  const weights = useWeights();
  const injections = useInjections();
  const pens = usePens();
  const settings = useSettings();

  const data = useMemo(() => {
    const last = injections[injections.length - 1];
    const next = nextDue(last ? last.at.slice(0, 10) : null, settings.schedule.weekday, today);
    const defaults = injectionDefaults({ plan: settings.plan, injections, pens, sites: settings.sites });
    // A caneta do Hoje é a da dose que vem a seguir.
    const penInfo = penOverview(pens, usedMcgByPen(injections), defaults.doseMcg, next.day, today);
    const doses = injections.filter((i) => i.dose_mcg !== null);
    const points = trend(dailyMeans(weights));
    const first = weights[0];
    const latest = weights[weights.length - 1];
    const ms = first ? milestones(first.g, settings.profile.goalG, points) : [];
    const nextMs = first && latest ? nextMilestone(ms, first.g, latest.g) : null;
    return {
      last,
      next,
      overview: penInfo,
      defaults,
      firstDay: doses[0]?.at.slice(0, 10) ?? null,
      points,
      first,
      latest,
      strip: weekStrip(
        today,
        new Set(weights.map((w) => w.at.slice(0, 10))),
        new Set(doses.map((i) => i.at.slice(0, 10))),
        next.state === 'taken' ? null : next.day,
      ),
      weekChange: weekTrendChange(points, today),
      lowest: latest && weights.length > 1 ? weights.every((w) => w.id === latest.id || latest.g < w.g) : false,
      alert: todayAlert({
        buy: penInfo.buy,
        backup: backupOverdue(settings.lastBackup, firstRecordDay(weights, injections), today),
        milestones: ms,
        next: nextMs,
        plateau: isPlateau(points, today),
        today,
        tipCount: TIPS.length,
      }),
      numbers: penNumbers(pens),
    };
  }, [injections, pens, weights, settings, today]);

  const name = settings.profile.name.trim();
  const now = new Date();

  return (
    <Screen
      eyebrow={longDate(now)}
      title={name ? `${greeting(now)}, ${name}` : greeting(now)}
      right={<IconButton icon="settings" label="Ajustes" onPress={() => router.push('/settings')} />}
    >
      <WeekStrip days={data.strip} />

      <InjectionCard
        data={data}
        time={settings.schedule.time}
        onRegister={(day) => router.push(day ? { pathname: '/log/injection', params: { day } } : '/log/injection')}
        onSkip={() =>
          void addInjection(db, { at: `${data.next.day} ${settings.schedule.time}`, dose_mcg: null, site: null, pen_id: null, note: null }).then((id) =>
            toast.show({ message: 'Semana pulada registrada.', actionLabel: 'Desfazer', onAction: () => void deleteRow(db, 'injections', id) }),
          )
        }
      />

      <WeightCard data={data} today={today} onRegister={() => router.push('/log/weight')} />

      <View style={{ flexDirection: 'row', gap: space.m }}>
        <GoalTile
          startG={data.first?.g ?? null}
          latestG={data.latest?.g ?? null}
          goalG={settings.profile.goalG}
          onSetGoal={() => router.push('/settings/profile')}
        />
        <PenTile overview={data.overview} onAdd={() => router.push('/pens/new')} onOpen={() => router.push('/treatment')} />
      </View>

      <AlertCard
        alert={data.alert}
        overview={data.overview}
        onBackup={() =>
          void exportBackup(db)
            .then((r) => {
              if (r === 'unavailable') toast.show({ message: 'Não há como compartilhar neste aparelho.' });
            })
            .catch(() => toast.show({ message: 'Não deu para gerar o backup. Tente nos Ajustes.' }))
        }
      />

      {SHOW_TEST_TOOLS ? <DevTools empty={!weights.length && !injections.length} /> : null}
    </Screen>
  );
}

type Data = {
  last: { at: string } | undefined;
  next: ReturnType<typeof nextDue>;
  overview: ReturnType<typeof penOverview>;
  defaults: ReturnType<typeof injectionDefaults>;
  firstDay: string | null;
  numbers: ReadonlyMap<number, number>;
};

function CardTop({ icon, title, tone, right }: { icon: IconName; title: string; tone: 'med' | 'body' | 'warn' | 'onMed'; right?: ReactNode }) {
  const t = useTheme();
  const c = t.c;
  const style = {
    med: { bg: c.medSoft, fg: c.med, text: c.text3 },
    body: { bg: c.bodySoft, fg: c.bodyStrong, text: c.text3 },
    warn: { bg: c.surface, fg: c.warnStrong, text: c.warnStrong },
    onMed: { bg: c.medStrong, fg: c.onMed, text: c.onMed },
  }[tone];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: 36, height: 36, borderRadius: radius.pill, backgroundColor: style.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={20} color={style.fg} />
      </View>
      <Text variant="overline" style={{ flex: 1, color: style.text }}>
        {title}
      </Text>
      {right}
    </View>
  );
}

function InjectionCard({ data, time, onRegister, onSkip }: { data: Data; time: string; onRegister: (day?: string) => void; onSkip: () => void }) {
  const t = useTheme();
  const { next, defaults, overview, firstDay, numbers } = data;
  const week = firstDay ? Math.max(1, treatmentWeek(firstDay, next.day)) : 1;
  const dueDate = dayToDate(next.day);
  const dueName = `${capitalize(WEEKDAYS[dueDate.getDay()])}, ${ddmm(next.day)}`;
  const st = overview.inUseState;
  const penText = overview.inUse && st ? (st.lastDose ? 'Última dose' : plural(st.dosesLeft, 'dose', 'doses')) : '—';
  const penSub = overview.stock.length ? `+${overview.stock.length} na geladeira` : overview.inUse ? 'sem estoque' : 'sem caneta';
  const doseSub =
    defaults.suggestMcg !== null
      ? `plano sugere ${mg(defaults.suggestMcg)}`
      : defaults.plannedWeeks !== null
        ? weekOfPlan(defaults.weekAtDose, defaults.plannedWeeks)
        : 'manutenção';

  if (next.state === 'today') {
    return (
      <View style={{ backgroundColor: t.c.med, borderRadius: radius.card, padding: space.xl, gap: space.l, boxShadow: t.shadow.plus }}>
        <CardTop icon="pen" title="Hoje é dia de aplicação" tone="onMed" />
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 24, lineHeight: 30, fontFamily: fonts.semibold, color: t.c.onMed }}>
            {`${mg(defaults.doseMcg)}${defaults.site ? ` ${SITE_IN[defaults.site]}` : ''}`}
          </Text>
          <Text style={{ color: t.c.onMed }}>
            {`Semana ${week}${st?.lastDose && overview.inUse ? ` · última dose da caneta ${numbers.get(overview.inUse.id)}` : ''} · lembrete às ${time}`}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => onRegister()}
          style={({ pressed }) => ({ height: 52, borderRadius: radius.pill, backgroundColor: t.c.surface, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}
        >
          <Text variant="headline" style={{ color: t.c.medStrong, fontFamily: fonts.bold }}>
            Registrar agora
          </Text>
        </Pressable>
      </View>
    );
  }

  if (next.state === 'overdue') {
    const late = -next.daysUntil;
    return (
      <Card tone="warn" style={{ gap: 14 }}>
        <CardTop icon="alert" title="Aplicação não registrada" tone="warn" />
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 22, lineHeight: 28, fontFamily: fonts.semibold }}>{`Você aplicou ${onWeekday(dueDate.getDay())}, ${ddmm(next.day)}?`}</Text>
          <Text variant="label" color="text2" style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.regular }}>
            {`Faz ${plural(late, 'dia', 'dias')}. Se aplicou, registre. Se não, marque como pulada e siga no dia habitual.`}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button label="Sim, registrar" onPress={() => onRegister(next.day)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Não, pulei" variant="soft" onPress={onSkip} />
          </View>
        </View>
        <Pressable accessibilityRole="button" onPress={() => Alert.alert('Dose esquecida', BULA)} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text variant="label" style={{ fontFamily: fonts.semibold, color: t.c.warnStrong }}>
            O que diz a bula sobre dose esquecida
          </Text>
        </Pressable>
      </Card>
    );
  }

  if (next.state === 'taken' && data.last) {
    return (
      <Card style={{ gap: space.l }}>
        <CardTop icon="check" title="Aplicação da semana" tone="med" right={<Pill label="Feita" tone="med" />} />
        <Text style={{ fontSize: 24, lineHeight: 30, fontFamily: fonts.semibold }}>{`Aplicada hoje às ${timeOf(data.last.at)}`}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: space.m, paddingHorizontal: 14, borderRadius: 16, backgroundColor: t.c.bg }}>
          <Icon name="calendar" size={18} color={t.c.text2} />
          <Text variant="label" color="text2" style={{ fontSize: 14, fontFamily: fonts.regular, flex: 1 }}>
            {`Próxima: ${WEEKDAYS[dueDate.getDay()]}, ${ddmm(next.day)} · ${time}`}
          </Text>
        </View>
      </Card>
    );
  }

  const when = next.daysUntil === 1 ? 'amanhã' : `em ${next.daysUntil} dias`;
  return (
    <Card style={{ gap: space.l }}>
      <CardTop icon="pen" title="Próxima aplicação" tone="med" right={<Pill label={`Semana ${week}`} />} />
      <View style={{ gap: 2 }}>
        <Text style={{ fontSize: 24, lineHeight: 30, fontFamily: fonts.semibold, letterSpacing: -0.3 }}>{dueName}</Text>
        <Text color="text2">{`${when} · lembrete às ${time}`}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: space.s, paddingVertical: space.m, borderTopWidth: 1, borderBottomWidth: 1, borderColor: t.c.line }}>
        <Mini label="Dose" value={mg(defaults.doseMcg)} sub={doseSub} />
        <Mini label="Local" value={defaults.site ? SITE_LABEL[defaults.site] : '—'} sub="sugerido" />
        <Mini label="Caneta" value={penText} sub={penSub} warn={!!st?.lastDose} />
      </View>
      <Button label="Registrar aplicação" icon="pen" variant="med" onPress={() => onRegister()} />
    </Card>
  );
}

function Mini({ label, value, sub, warn = false }: { label: string; value: string; sub: string; warn?: boolean }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text variant="caption" color="text3">
        {label}
      </Text>
      <Text variant="headline" color={warn ? 'warnStrong' : 'ink'} numberOfLines={1}>
        {value}
      </Text>
      <Text variant="caption" color="text3" style={{ fontFamily: fonts.regular }} numberOfLines={2}>
        {sub}
      </Text>
    </View>
  );
}

function WeightCard({
  data,
  today,
  onRegister,
}: {
  data: { latest: { at: string; g: number } | undefined; first: { at: string; g: number } | undefined; points: TrendPoint[]; weekChange: number | null; lowest: boolean };
  today: string;
  onRegister: () => void;
}) {
  const t = useTheme();
  const { latest, first, weekChange } = data;
  const register = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Registrar peso"
      onPress={onRegister}
      style={({ pressed }) => ({
        height: 36,
        paddingLeft: 10,
        paddingRight: 14,
        borderRadius: radius.pill,
        backgroundColor: pressed ? t.c.line : t.c.surface2,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      })}
    >
      <Icon name="plus" size={16} color={t.c.ink} strokeWidth={2} />
      <Text variant="label" style={{ fontFamily: fonts.semibold }}>
        Registrar
      </Text>
    </Pressable>
  );
  if (!latest) {
    return (
      <Card style={{ gap: 14 }}>
        <CardTop icon="scale" title="Peso" tone="body" right={register} />
        <Text color="text2">Registre seu peso quando quiser. A tendência e a evolução aparecem a partir da primeira pesagem.</Text>
      </Card>
    );
  }
  const total = first && first.at !== latest.at ? latest.g - first.g : null;
  return (
    <Card style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 36, height: 36, borderRadius: radius.pill, backgroundColor: t.c.bodySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="scale" size={20} color={t.c.bodyStrong} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="overline" color="text3">
            Peso
          </Text>
          <Text variant="caption" color="text3" style={{ fontFamily: fonts.regular }}>
            {`${ago(daysBetween(latest.at, today))}, ${timeOf(latest.at)}`}
          </Text>
        </View>
        {register}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.m }}>
        <View accessible accessibilityLabel={`Última pesagem: ${kgUnit(latest.g)}`} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
          <Text variant="display">{kg(latest.g)}</Text>
          <Text color="text2" style={{ fontSize: 17, fontFamily: fonts.medium }}>
            kg
          </Text>
        </View>
        <Sparkline points={recentTrend(data.points, today)} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
        {weekChange !== null ? (
          <Tag
            tone={weekChange < -50 ? 'body' : weekChange > 50 ? 'warn' : 'neutral'}
            icon={weekChange < -50 ? 'arrowDown' : weekChange > 50 ? 'arrowUp' : undefined}
            label={Math.abs(weekChange) <= 50 ? 'estável na semana' : `${kg(Math.abs(weekChange))} kg na semana`}
          />
        ) : null}
        {total !== null && first ? <Tag label={`${signedKg(total)} kg desde ${ddmm(first.at)}`} /> : null}
      </View>
      {data.lowest ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s }}>
          <Icon name="check" size={16} color={t.c.bodyStrong} strokeWidth={2.25} />
          <Text variant="label" color="bodyStrong" style={{ fontFamily: fonts.semibold }}>
            Menor peso desde o início do tratamento
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

function GoalTile({ startG, latestG, goalG, onSetGoal }: { startG: number | null; latestG: number | null; goalG: number | null; onSetGoal: () => void }) {
  const progress = startG !== null && latestG !== null ? goalProgress(startG, latestG, goalG) : null;
  return (
    <Card style={{ flex: 1, padding: space.l, gap: space.m }}>
      <Text variant="overline" color="text3">
        Meta
      </Text>
      {progress !== null && goalG !== null && latestG !== null ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
            <GoalRing progress={progress} />
            <View style={{ flexShrink: 1, gap: 2 }}>
              <Text style={{ fontSize: 22, lineHeight: 26, fontFamily: fonts.semibold }}>{`${Math.round(progress * 100)}%`}</Text>
              <Text variant="caption" color="text3" style={{ fontFamily: fonts.regular }}>
                {`até ${kg(goalG, goalG % 1000 ? 1 : 0)} kg`}
              </Text>
            </View>
          </View>
          <Text variant="label" color="text2" style={{ fontFamily: fonts.semibold }}>
            {latestG > goalG ? `faltam ${kgUnit(latestG - goalG)}` : 'meta alcançada'}
          </Text>
        </>
      ) : (
        <>
          <Text variant="label" color="text2" style={{ fontFamily: fonts.regular, lineHeight: 19 }}>
            {goalG === null ? 'Sem meta definida. Os marcos de −5% e −10% aparecem na Evolução.' : 'Registre o peso para ver o progresso.'}
          </Text>
          {goalG === null ? (
            <Pressable accessibilityRole="button" onPress={onSetGoal} style={{ minHeight: 36, justifyContent: 'center' }}>
              <Text variant="label" color="medStrong" style={{ fontFamily: fonts.semibold }}>
                Definir meta
              </Text>
            </Pressable>
          ) : null}
        </>
      )}
    </Card>
  );
}

function PenTile({ overview, onAdd, onOpen }: { overview: ReturnType<typeof penOverview>; onAdd: () => void; onOpen: () => void }) {
  const t = useTheme();
  const { inUse, inUseState: st, stock } = overview;
  if (!inUse || !st) {
    return (
      <Card style={{ flex: 1, padding: space.l, gap: space.m }}>
        <Text variant="overline" color="text3">
          Caneta
        </Text>
        <Text variant="label" color="text2" style={{ fontFamily: fonts.regular, lineHeight: 19 }}>
          {stock.length ? `${plural(stock.length, 'caneta', 'canetas')} no estoque. Ela abre na próxima aplicação.` : 'Cadastre suas canetas para ver as doses restantes.'}
        </Text>
        <Pressable accessibilityRole="button" onPress={stock.length ? onOpen : onAdd} style={{ minHeight: 36, justifyContent: 'center' }}>
          <Text variant="label" color="medStrong" style={{ fontFamily: fonts.semibold }}>
            {stock.length ? 'Ver canetas' : 'Adicionar caneta'}
          </Text>
        </Pressable>
      </Card>
    );
  }
  const doseMcg = overview.nextDoseMcg ?? inUse.dose_mcg ?? 0;
  const usedDoses = doseMcg > 0 ? Math.round(st.usedMcg / doseMcg) : 0;
  const total = Math.min(8, Math.max(1, st.dosesLeft + usedDoses));
  const left = Math.min(total, st.dosesLeft);
  return (
    <Pressable accessibilityRole="button" accessibilityHint="Abre o Tratamento" onPress={onOpen} style={{ flex: 1 }}>
      <Card style={{ flex: 1, padding: space.l, gap: space.m }}>
        <Text variant="overline" color="text3">
          Caneta
        </Text>
        <View style={{ flexDirection: 'row', gap: 4, paddingTop: 10, paddingBottom: space.s }}>
          {Array.from({ length: total }, (_, i) => (
            <View key={i} style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: i >= total - left ? t.c.med : t.c.surface2 }} />
          ))}
        </View>
        <View style={{ gap: 2 }}>
          <Text variant="headline" color={st.lastDose ? 'warnStrong' : 'ink'}>
            {st.dosesLeft > 0 ? plural(st.dosesLeft, 'dose restante', 'doses restantes') : 'sem doses'}
          </Text>
          <Text variant="caption" color="text3" style={{ fontFamily: fonts.regular }} numberOfLines={2}>
            {`${penLabel(inUse)}${stock.length ? ` · +${stock.length} em estoque` : ''}`}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}

function AlertCard({
  alert,
  overview,
  onBackup,
}: {
  alert: TodayAlert;
  overview: ReturnType<typeof penOverview>;
  onBackup: () => void;
}) {
  const t = useTheme();
  let icon: IconName = 'check';
  let tone: 'body' | 'warn' | 'med' = 'body';
  let title = '';
  let body = '';
  const label = (m: Milestone) => (m.kind === 'pct' ? `−${m.value}%` : m.kind === 'kg' ? `−${m.value / 1000} kg` : 'sua meta');
  switch (alert.kind) {
    case 'buy':
      icon = 'alert';
      tone = 'warn';
      title = 'Hora de comprar a próxima caneta';
      body = `O estoque não tem caneta para ${overview.nextDoseMcg !== null ? mg(overview.nextDoseMcg) : 'a dose atual'} e a caneta em uso está no fim.`;
      break;
    case 'backup':
      icon = 'download';
      tone = 'med';
      title = alert.daysSince === null ? 'Faça o primeiro backup' : `Último backup há ${alert.daysSince} dias`;
      body = 'O backup é um arquivo com todos os seus registros. Guarde no Drive ou no WhatsApp para não perder nada se trocar de celular.';
      break;
    case 'milestoneReached':
      title = alert.milestone.kind === 'goal' ? 'Você chegou à sua meta.' : `Você chegou a ${label(alert.milestone)}.`;
      body = 'Cada passo conta.';
      break;
    case 'milestoneNear':
      title = `Faltam ${kgUnit(alert.next.remainingG)} para ${label(alert.next.milestone)}`;
      body = alert.lastReached?.reachedOn
        ? `Você passou de ${label(alert.lastReached)} em ${ddmm(alert.lastReached.reachedOn)}. Cada passo conta.`
        : 'Cada passo conta.';
      break;
    case 'plateau':
      icon = 'info';
      tone = 'med';
      title = 'Seu peso está estável nas últimas semanas.';
      body = 'Platôs são comuns no tratamento.';
      break;
    case 'tip': {
      const tip = TIPS[alert.index % TIPS.length];
      icon = tip.icon;
      tone = 'med';
      title = tip.title;
      body = tip.body;
      break;
    }
  }
  const bg = { body: t.c.bodySoft, warn: t.c.warnSoft, med: t.c.medSoft }[tone];
  const fg = { body: t.c.bodyStrong, warn: t.c.warnStrong, med: t.c.med }[tone];
  return (
    <View
      accessible
      accessibilityLabel={`${title} ${body}`}
      style={{ borderRadius: radius.card, paddingVertical: space.l, paddingHorizontal: 18, flexDirection: 'row', gap: 14, alignItems: 'flex-start', borderWidth: 1, borderColor: t.c.line, backgroundColor: t.c.surface }}
    >
      <View style={{ width: 36, height: 36, borderRadius: radius.pill, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18} color={fg} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: fonts.semibold }}>{title}</Text>
        <Text variant="label" color="text2" style={{ fontFamily: fonts.regular }}>
          {body}
        </Text>
        {alert.kind === 'backup' ? (
          <View style={{ marginTop: space.s, alignSelf: 'flex-start' }}>
            <Button label="Fazer backup agora" variant="soft" icon="download" onPress={onBackup} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function DevTools({ empty }: { empty: boolean }) {
  const db = useSQLiteContext();
  return (
    <Card tone="warn">
      <Text variant="overline" color="warnStrong">
        Versão de teste
      </Text>
      <Text variant="label" color="text2">
        Este cartão só aparece no desenvolvimento e nos APKs de teste.
      </Text>
      {empty ? (
        <Button label="Carregar dados de exemplo" onPress={() => void seedDemo(db)} />
      ) : (
        <Button label="Apagar todos os dados" variant="soft" onPress={() => void wipeAll(db).then(() => applyThemePref('auto'))} />
      )}
    </Card>
  );
}
