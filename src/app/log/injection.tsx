import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState, type ReactNode } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { saveInjection, undoSave, type Undo } from '@/db/injectionSave';
import { addInjection, deleteRow, insertRows, updatePen, type InjectionRow, type PenRow, type Site } from '@/db/queries';
import { useSettingsState, type Settings } from '@/db/settings';
import { useQueryState } from '@/db/useQuery';
import { doseChoices, injectionDefaults, nearbyRecord, openingDay, penForDose, penOutcome, penToClose } from '@/domain/injection';
import { canDeliver, dosesFrom, penNumbers, penStatus, usedMcgByPen } from '@/domain/pens';
import { nextDue } from '@/domain/schedule';
import { rotation, SITE_ORDER } from '@/domain/sites';
import { titrationState } from '@/domain/titration';
import { daysBetween, toDay, toStamp } from '@/lib/dates';
import { ago, ddmm, mg, plural, timeOf, weekdayShort, weekOfPlan, WEEKDAYS } from '@/lib/format';
import { penLabel, SITE_LABEL, SITE_NAME } from '@/lib/labels';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';
import { InfoNote, LinkButton, Pill, TextField } from '@/ui/Bits';
import { BodyMap } from '@/ui/BodyMap';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { Icon } from '@/ui/Icon';
import { DateTimeRow } from '@/ui/Phase1Bits';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';
import { confirmDelete } from '@/ui/useDeleteWithUndo';

const FEELINGS = ['well', 'nausea', 'low_appetite', 'fatigue', 'other'] as const;
const FEELING_LABEL: Record<(typeof FEELINGS)[number], string> = {
  well: 'Bem',
  nausea: 'Náusea',
  low_appetite: 'Pouca fome',
  fatigue: 'Cansaço',
  other: 'Outro',
};

export default function InjectionScreen() {
  const { id, day } = useLocalSearchParams<{ id?: string; day?: string }>();
  const inj = useQueryState<InjectionRow>('SELECT * FROM injections ORDER BY at, id', [], ['injections']);
  const pens = useQueryState<PenRow>('SELECT * FROM pens ORDER BY id', [], ['pens']);
  const { settings, loaded } = useSettingsState();
  if (!inj.loaded || !pens.loaded || !loaded) return null;
  const editing = id ? (inj.rows.find((i) => i.id === Number(id)) ?? null) : null;
  return (
    <InjectionForm
      key={editing?.id ?? 'new'}
      editing={editing}
      injections={inj.rows}
      pens={pens.rows}
      settings={settings}
      initialDay={typeof day === 'string' ? day : null}
    />
  );
}

type Done = {
  row: InjectionRow;
  undo: Undo[];
  finished: PenRow | null;
  nextPen: PenRow | null;
  dosesLeft: number | null;
  /** Semanas seguidas nesta dose, contando esta (calculado antes de gravar). */
  completedWeeks: number;
};

function InjectionForm({
  editing,
  injections,
  pens,
  settings,
  initialDay,
}: {
  editing: InjectionRow | null;
  injections: InjectionRow[];
  pens: PenRow[];
  settings: Settings;
  initialDay: string | null;
}) {
  const t = useTheme();
  const db = useSQLiteContext();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const history = useMemo(() => injections.filter((i) => i.id !== editing?.id), [injections, editing]);
  const defaults = useMemo(
    () => injectionDefaults({ plan: settings.plan, injections: history, pens, sites: settings.sites }),
    [settings.plan, settings.sites, history, pens],
  );
  const titration = useMemo(() => titrationState(settings.plan, history), [settings.plan, history]);

  const [stamp, setStamp] = useState(() => editing?.at ?? (initialDay ? `${initialDay} ${settings.schedule.time}` : toStamp(new Date())));
  const [dose, setDose] = useState(editing?.dose_mcg ?? defaults.doseMcg);
  const [custom, setCustom] = useState('');
  const [otherDose, setOtherDose] = useState(false);
  const [site, setSite] = useState<Site | null>(editing ? editing.site : defaults.site);
  const [chosenPen, setPenId] = useState<number | null>(editing ? editing.pen_id : defaults.penId);
  const [penTouched, setPenTouched] = useState(false); // ela escolheu (ou tirou) a caneta à mão
  const [feel, setFeel] = useState<string[]>([]);
  const [note, setNote] = useState(editing?.note ?? '');
  const [done, setDone] = useState<Done | null>(null);
  const [busy, setBusy] = useState(false);

  const numbers = useMemo(() => penNumbers(pens), [pens]);
  const used = useMemo(() => usedMcgByPen(history), [history]);
  const choices = doseChoices(settings.plan, [dose, ...(titration.currentMcg ? [titration.currentMcg] : [])]);
  const customMcg = Math.round(Number(custom.replace(',', '.')) * 1000);
  const doseMcg = otherDose ? customMcg : dose;
  const doseValid = doseMcg > 0 && doseMcg <= 20000;

  // Caneta cadastrada com o formulário aberto: sem escolha dela, vale a que entrega a dose.
  const autoPen = !editing && !penTouched && chosenPen === null && doseValid ? (penForDose(pens, doseMcg)?.id ?? null) : null;
  const penId = chosenPen ?? autoPen;

  // Canetas que entregam a dose: a em uso primeiro, depois o estoque.
  const penOptions = pens
    .filter((p) => (penStatus(p) !== 'done' || p.id === penId) && (p.id === penId || (doseValid && canDeliver(p, doseMcg))))
    .sort((a, b) => (penStatus(a) === penStatus(b) ? a.id - b.id : penStatus(a) === 'open' ? -1 : 1));
  const pen = pens.find((p) => p.id === penId) ?? null;
  const penNote = (() => {
    if (!pen || !doseValid) return null;
    if (editing) return null;
    const out = penOutcome(pen, used.get(pen.id) ?? 0, doseMcg, doseMcg);
    const next = pens.find((p) => p.id !== pen.id && penStatus(p) === 'stock' && canDeliver(p, doseMcg));
    if (out.finishes) return { text: `esta é a última dose${next ? `; depois abrimos a caneta ${numbers.get(next.id)} (${penLabel(next)})` : ''}`, last: true };
    if (out.opens) return { text: `abre hoje · ${plural(out.dosesLeftAfter, 'dose restante', 'doses restantes')} depois desta`, last: false };
    return { text: `${plural(out.dosesLeftAfter, 'dose restante', 'doses restantes')} depois desta`, last: false };
  })();

  // Registro a menos de 3 dias: provável repetição. Só avisa.
  const near = nearbyRecord(history, stamp);
  const nearNote = (() => {
    if (!near) return null;
    const d = near.at.slice(0, 10);
    if (near.dose_mcg === null) return `A semana de ${ddmm(d)} está marcada como pulada. Se você aplicou, exclua aquele registro no histórico.`;
    const when = d === toDay(new Date()) ? `hoje às ${timeOf(near.at)}` : `em ${weekdayShort(d)} ${ddmm(d)}`;
    return `Já há uma aplicação de ${mg(near.dose_mcg)} registrada ${when}. Confira antes de registrar outra.`;
  })();

  // Nota da dose: conforme o plano, sugestão da próxima etapa ou dose diferente.
  const current = titration.currentMcg ?? settings.plan[0]?.mcg ?? null;
  const inPlan = settings.plan.some((s) => s.mcg === doseMcg);
  let doseNote = '';
  let doseWarn = false;
  if (doseValid && doseMcg === current) {
    doseNote = `Conforme o plano · ${weekOfPlan(defaults.weekAtDose, defaults.plannedWeeks)}`;
  } else if (doseValid && doseMcg === defaults.suggestMcg) {
    doseNote = 'Próxima etapa do plano';
  } else if (doseValid && current !== null) {
    doseNote = `Diferente do plano (${mg(current)}). Tudo bem se foi orientação médica.`;
    doseWarn = true;
  } else if (doseValid && !inPlan) {
    doseNote = 'Fora do plano. Tudo bem se foi orientação médica.';
    doseWarn = true;
  }

  // Local: rodízio, último uso e dica.
  const rot = useMemo(() => rotation(history, settings.sites), [history, settings.sites]);
  const suggested = rot[0]?.site ?? null;
  const lastSite = [...history].reverse().find((i) => i.site && i.dose_mcg !== null)?.site ?? null;
  const fills: Partial<Record<Site, string>> = {};
  for (const s of SITE_ORDER) {
    if (s === site) fills[s] = t.c.med;
    else if (settings.sites.includes(s)) fills[s] = s === suggested ? t.sites[0] : t.sites[3];
  }
  const siteLast = (s: Site) => {
    const at = [...history].reverse().find((i) => i.site === s && i.dose_mcg !== null)?.at;
    return at ? `Último uso: ${ddmm(at)}, ${ago(daysBetween(at, toDay(new Date())))}` : 'Ainda não usado';
  };
  const siteTag = !site
    ? null
    : site === suggested
      ? { label: 'sugerido pelo rodízio', tone: 'med' as const }
      : !settings.sites.includes(site)
        ? { label: 'fora do rodízio', tone: 'neutral' as const }
        : site === lastSite
          ? { label: 'usado na última', tone: 'warn' as const }
          : { label: 'escolhido', tone: 'neutral' as const };

  const toggleFeel = (k: string) =>
    setFeel((cur) => {
      if (k === 'well') return cur.includes('well') ? [] : ['well'];
      const rest = cur.filter((x) => x !== 'well');
      return rest.includes(k) ? rest.filter((x) => x !== k) : [...rest, k];
    });

  const confirm = async () => {
    if (!doseValid || busy) return;
    setBusy(true);
    try {
      if (editing) {
        const SQL = 'UPDATE injections SET at = ?, dose_mcg = ?, site = ?, pen_id = ?, note = ? WHERE id = ?';
        const opening = pen && editing.dose_mcg !== null ? openingDay(pen, stamp.slice(0, 10)) : null;
        const reopen = opening ? pen : null;
        // Trocou de caneta: a antiga, se só esta aplicação a abriu, volta para o estoque.
        const closeOld = editing.pen_id !== penId ? penToClose(pens, editing, history) : null;
        await db.withTransactionAsync(async () => {
          await db.runAsync(SQL, [stamp, editing.dose_mcg === null ? null : doseMcg, site, penId, note.trim() || null, editing.id]);
          if (reopen && opening) await updatePen(db, reopen.id, { opened_on: opening });
          if (closeOld) await updatePen(db, closeOld.id, { opened_on: null, done: 0 });
        });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.show({
          message: 'Aplicação alterada.',
          actionLabel: 'Desfazer',
          onAction: () =>
            void db.withTransactionAsync(async () => {
              if (closeOld) await updatePen(db, closeOld.id, { opened_on: closeOld.opened_on, done: closeOld.done });
              if (reopen) await updatePen(db, reopen.id, { opened_on: reopen.opened_on });
              await db.runAsync(SQL, [editing.at, editing.dose_mcg, editing.site, editing.pen_id, editing.note, editing.id]);
            }),
        });
        router.back();
        return;
      }
      const completedWeeks = titration.currentMcg === doseMcg ? titration.weeksAtDose + 1 : 1;
      const { row, undo, finished, dosesLeft } = await saveInjection(db, {
        stamp,
        doseMcg,
        site,
        pen,
        usedBeforeMcg: pen ? (used.get(pen.id) ?? 0) : 0,
        feel,
        note,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const nextPen = finished ? (pens.find((p) => p.id !== pen?.id && penStatus(p) === 'stock' && canDeliver(p, doseMcg)) ?? null) : null;
      setDone({ row, undo, finished, nextPen, dosesLeft, completedWeeks });
      askToFinishOld();
    } finally {
      setBusy(false);
    }
  };

  // R3: ao mudar a dose, uma caneta de dose fixa ainda aberta com sobra pode ser finalizada.
  const askToFinishOld = () => {
    const old = pens.find(
      (p) => penStatus(p) === 'open' && p.id !== pen?.id && p.dose_mcg !== null && p.dose_mcg !== doseMcg && dosesFrom(p, used.get(p.id) ?? 0, p.dose_mcg) > 0,
    );
    if (!old || old.dose_mcg === null) return;
    const left = dosesFrom(old, used.get(old.id) ?? 0, old.dose_mcg);
    Alert.alert(
      `Finalizar a caneta ${numbers.get(old.id)}?`,
      `A ${penLabel(old)} ainda tem ${plural(left, 'dose', 'doses')} de ${mg(old.dose_mcg)}. Se você não vai mais usá-la, finalize para o estoque ficar certo.`,
      [
        { text: 'Manter', style: 'cancel' },
        { text: 'Finalizar', onPress: () => void updatePen(db, old.id, { done: 1 }) },
      ],
    );
  };

  const skip = () =>
    Alert.alert('Pular esta semana?', 'Fica registrado que não houve aplicação; a próxima segue no dia habitual.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Pulei',
        onPress: () =>
          void addInjection(db, { at: stamp, dose_mcg: null, site: null, pen_id: null, note: note.trim() || null }).then((newId) => {
            toast.show({ message: 'Semana pulada registrada.', actionLabel: 'Desfazer', onAction: () => void deleteRow(db, 'injections', newId) });
            router.back();
          }),
      },
    ]);

  const remove = () =>
    editing &&
    confirmDelete('Excluir esta aplicação?', undefined, () => {
      const close = penToClose(pens, editing, history);
      void db
        .withTransactionAsync(async () => {
          await deleteRow(db, 'injections', editing.id);
          if (close) await updatePen(db, close.id, { opened_on: null, done: 0 });
        })
        .then(() => {
          toast.show({
            message: 'Aplicação excluída',
            actionLabel: 'Desfazer',
            onAction: () =>
              void db.withTransactionAsync(async () => {
                if (close) await updatePen(db, close.id, { opened_on: close.opened_on, done: close.done });
                await insertRows(db, 'injections', [editing]);
              }),
          });
          router.back();
        });
    });

  if (done) {
    return (
      <SavedInjection
        done={done}
        settings={settings}
        numbers={numbers}
        onUndo={async () => {
          await undoSave(db, done.undo);
          setDone(null);
        }}
      />
    );
  }

  const skipped = editing?.dose_mcg === null;

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: t.c.surface }}>
      <View style={{ paddingTop: insets.top + space.s, paddingHorizontal: space.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center', minWidth: 72 }}>
          <Text style={{ fontFamily: fonts.semibold, color: t.c.medStrong }}>Cancelar</Text>
        </Pressable>
        <Text variant="headline" accessibilityRole="header" style={{ fontSize: 17 }}>
          {editing ? (skipped ? 'Semana pulada' : 'Editar aplicação') : 'Aplicação'}
        </Text>
        <View style={{ minWidth: 72 }} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.xl, paddingBottom: insets.bottom + space.xxxl, gap: space.xl }}>
        <DateTimeRow stamp={stamp} onChange={setStamp} maxDate={new Date()} />
        {nearNote ? <InfoNote tone="warn">{nearNote}</InfoNote> : null}

        {!skipped ? (
          <>
            <Section title="Dose" note={doseNote} warn={doseWarn}>
              <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
                {choices.map((m) => (
                  <Chip
                    key={m}
                    role="radio"
                    label={mg(m)}
                    selected={!otherDose && dose === m}
                    onPress={() => {
                      setOtherDose(false);
                      setDose(m);
                      if (pen && !canDeliver(pen, m)) setPenId(pens.find((p) => penStatus(p) !== 'done' && canDeliver(p, m))?.id ?? null);
                    }}
                  />
                ))}
                <Chip role="radio" label="Outra" selected={otherDose} onPress={() => setOtherDose(true)} />
              </View>
              {otherDose ? (
                <TextField label="Dose aplicada" value={custom} onChangeText={setCustom} keyboardType="decimal-pad" suffix="mg" placeholder="0,75" maxLength={5} />
              ) : null}
              {defaults.suggestMcg !== null && !editing && dose === titration.currentMcg && !otherDose ? (
                <View style={{ gap: space.s }}>
                  <InfoNote tone="med">{`Pelo seu plano, a próxima seria ${mg(defaults.suggestMcg)}. Confirme com seu médico.`}</InfoNote>
                  <View style={{ flexDirection: 'row', gap: space.s }}>
                    <View style={{ flex: 1 }}>
                      <Button label={`Usar ${mg(defaults.suggestMcg)}`} variant="soft" onPress={() => setDose(defaults.suggestMcg as number)} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button label={`Manter ${mg(dose)}`} variant="soft" onPress={() => setDose(dose)} />
                    </View>
                  </View>
                </View>
              ) : null}
            </Section>

            <Section title="Local" note="como num espelho">
              <View style={{ flexDirection: 'row', gap: space.l, alignItems: 'center', padding: space.m, borderRadius: radius.tile, backgroundColor: t.c.bg }}>
                <BodyMap fills={fills} width={96} />
                <View style={{ flex: 1, gap: space.s }}>
                  {siteTag ? <Pill label={siteTag.label} tone={siteTag.tone} /> : null}
                  <Text style={{ fontSize: 18, lineHeight: 24, fontFamily: fonts.semibold }}>{site ? SITE_NAME[site].charAt(0).toUpperCase() + SITE_NAME[site].slice(1) : 'Sem local'}</Text>
                  {site ? (
                    <Text variant="label" color="text2" style={{ fontFamily: fonts.regular }}>
                      {siteLast(site)}
                    </Text>
                  ) : null}
                  <Text variant="caption" color="text3" style={{ fontFamily: fonts.regular }}>
                    {site === lastSite ? 'Prefira outro local para a pele descansar.' : 'Mantenha 5 cm do umbigo e varie o ponto dentro da região.'}
                  </Text>
                </View>
              </View>
              <View accessibilityRole="radiogroup" accessibilityLabel="Local da aplicação" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
                {SITE_ORDER.map((s) => (
                  <View key={s} style={{ flexBasis: '48%', flexGrow: 1 }}>
                    <Chip
                      role="radio"
                      label={`${SITE_LABEL[s]}${s === suggested ? ' · sugerido' : ''}`}
                      accessibilityLabel={`${SITE_NAME[s]}${s === suggested ? ', sugerido' : ''}`}
                      selected={site === s}
                      hint={s === suggested}
                      onPress={() => setSite(s)}
                    />
                  </View>
                ))}
              </View>
            </Section>

            <Section title="Caneta">
              {penOptions.length ? (
                <View style={{ gap: space.s }}>
                  {penOptions.map((p) => {
                    const on = p.id === penId;
                    return (
                      <Pressable
                        key={p.id}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: on }}
                        onPress={() => {
                          setPenTouched(true);
                          setPenId(on ? null : p.id);
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: space.m,
                          paddingVertical: 14,
                          paddingHorizontal: space.l,
                          borderRadius: 18,
                          borderWidth: on ? 2 : 1,
                          borderColor: on ? t.c.med : t.c.line,
                        }}
                      >
                        <View style={{ width: 36, height: 36, borderRadius: radius.pill, backgroundColor: t.c.medSoft, alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name="pen" size={18} color={t.c.med} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: fonts.semibold, lineHeight: 20 }}>{`Caneta ${numbers.get(p.id)} · ${penLabel(p)}`}</Text>
                          <Text variant="caption" color="text2" style={{ fontFamily: fonts.regular }}>
                            {on && penNote ? penNote.text : penStatus(p) === 'open' ? `aberta em ${ddmm(p.opened_on as string)}` : 'no estoque'}
                          </Text>
                        </View>
                        {on && penNote?.last ? <Pill label="última" tone="warn" /> : null}
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <InfoNote>{doseValid ? `Nenhuma caneta cadastrada para ${mg(doseMcg)}. A aplicação fica registrada sem caneta.` : 'Escolha a dose.'}</InfoNote>
              )}
              <LinkButton icon="plus" label="Adicionar caneta ao estoque" onPress={() => router.push('/pens/new')} />
            </Section>

            {!editing ? (
              <Section title="Como você está?" note="opcional">
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
                  {FEELINGS.map((k) => (
                    <Chip key={k} label={FEELING_LABEL[k]} selected={feel.includes(k)} onPress={() => toggleFeel(k)} />
                  ))}
                </View>
              </Section>
            ) : null}
          </>
        ) : null}

        <TextField label="Observação (opcional)" value={note} onChangeText={setNote} placeholder="Algo a anotar?" maxLength={200} />

        <View style={{ gap: 6 }}>
          {editing ? (
            <>
              <Button label="Salvar alterações" variant="med" onPress={() => void confirm()} disabled={!doseValid || busy} />
              <Pressable accessibilityRole="button" onPress={remove} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: fonts.semibold, color: t.c.danger }}>{skipped ? 'Excluir registro' : 'Excluir aplicação'}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Button label="Confirmar aplicação" icon="check" variant="med" onPress={() => void confirm()} disabled={!doseValid || busy} />
              <Button label="Pulei esta semana" variant="ghost" onPress={skip} />
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({ title, note, warn = false, children }: { title: string; note?: string; warn?: boolean; children: ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.s }}>
        <Text style={{ fontFamily: fonts.semibold, lineHeight: 20 }} accessibilityRole="header">
          {title}
        </Text>
        {note ? (
          <Text variant="caption" color={warn ? 'warnStrong' : 'text3'} style={{ flexShrink: 1, textAlign: 'right', fontFamily: fonts.semibold }}>
            {note}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function SavedInjection({
  done,
  settings,
  numbers,
  onUndo,
}: {
  done: Done;
  settings: Settings;
  numbers: ReadonlyMap<number, number>;
  onUndo: () => void;
}) {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { row, finished, nextPen, dosesLeft, completedWeeks } = done;
  const today = toDay(new Date());
  const day = row.at.slice(0, 10);
  const next = nextDue(day, settings.schedule.weekday, today > day ? today : day);
  const when = day === today ? `hoje às ${timeOf(row.at)}` : `${ddmm(day)} às ${timeOf(row.at)}`;
  const step = settings.plan.find((s) => s.mcg === row.dose_mcg);
  const stepIndex = settings.plan.findIndex((s) => s.mcg === row.dose_mcg);
  const completes = step && step.weeks !== null && completedWeeks >= step.weeks && stepIndex < settings.plan.length - 1;
  const lines: [string, string][] = [['Próxima', `${WEEKDAYS[settings.schedule.weekday]}, ${ddmm(next.day)} · ${settings.schedule.time}`]];
  if (row.pen_id !== null) {
    lines.push([`Caneta ${numbers.get(row.pen_id)}`, finished ? 'finalizada' : dosesLeft !== null ? plural(dosesLeft, 'dose restante', 'doses restantes') : '—']);
  }
  if (nextPen) lines.push(['Na próxima', `caneta ${numbers.get(nextPen.id)} · ${nextPen.brand}`]);
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{ flex: 1, backgroundColor: t.c.surface, padding: 28, paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28, alignItems: 'center', justifyContent: 'center', gap: space.l }}
    >
      <View style={{ width: 88, height: 88, borderRadius: radius.pill, backgroundColor: t.c.med, alignItems: 'center', justifyContent: 'center', boxShadow: `0px 0px 0px 12px ${t.c.medSoft}` }}>
        <Icon name="check" size={40} color={t.c.onMed} strokeWidth={2.5} />
      </View>
      <Text variant="title2" style={{ marginTop: space.m, fontSize: 24, lineHeight: 30 }} accessibilityRole="header">
        Aplicação registrada
      </Text>
      <Text color="text2" style={{ textAlign: 'center' }}>
        {[row.dose_mcg !== null ? mg(row.dose_mcg) : null, row.site ? SITE_NAME[row.site] : null, when].filter(Boolean).join(' · ')}
      </Text>
      <View style={{ alignSelf: 'stretch', padding: space.l, borderRadius: 20, backgroundColor: t.c.bg, gap: 10 }}>
        {lines.map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.s }}>
            <Text variant="label" color="text2" style={{ fontSize: 14, fontFamily: fonts.regular }}>
              {k}
            </Text>
            <Text variant="label" style={{ fontSize: 14, fontFamily: fonts.semibold, flexShrink: 1, textAlign: 'right' }}>
              {v}
            </Text>
          </View>
        ))}
      </View>
      {completes && row.dose_mcg !== null ? (
        <Text variant="label" color="text2" style={{ textAlign: 'center', fontFamily: fonts.regular, lineHeight: 19 }}>
          {`Você completou ${plural(completedWeeks, 'semana', 'semanas')} em ${mg(row.dose_mcg)}. Na próxima aplicação o Leve vai perguntar se a dose muda; confirme com seu médico.`}
        </Text>
      ) : null}
      <View style={{ alignSelf: 'stretch', gap: space.s, marginTop: space.s }}>
        <Button label="Concluir" onPress={() => router.back()} />
        <Pressable accessibilityRole="button" onPress={onUndo} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: fonts.semibold, color: t.c.medStrong }}>Desfazer</Text>
        </Pressable>
      </View>
    </View>
  );
}
