import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { saveSetting, useSettingsState } from '@/db/settings';
import { PLAN_DOSES, PLAN_TEMPLATES, type PlanStep } from '@/domain/titration';
import { mg, plural } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';
import { InfoNote, LinkButton, Stepper } from '@/ui/Bits';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { Icon } from '@/ui/Icon';
import { SectionLabel } from '@/ui/List';
import { SubScreen } from '@/ui/SubScreen';
import { Text } from '@/ui/Text';
import { Toggle } from '@/ui/Toggle';
import { useToast } from '@/ui/Toast';

export default function PlanScreen() {
  const { settings, loaded } = useSettingsState();
  if (!loaded) return <SubScreen title="Plano de doses" />;
  return <PlanForm initial={settings.plan} />;
}

const same = (a: readonly PlanStep[], b: readonly PlanStep[]) =>
  a.length === b.length && a.every((s, i) => s.mcg === b[i].mcg && s.weeks === b[i].weeks);

function PlanForm({ initial }: { initial: PlanStep[] }) {
  const t = useTheme();
  const db = useSQLiteContext();
  const router = useRouter();
  const toast = useToast();
  const [steps, setSteps] = useState<PlanStep[]>(initial);
  const [open, setOpen] = useState<number | null>(null);

  const update = (i: number, patch: Partial<PlanStep>) => setSteps((cur) => cur.map((s, k) => (k === i ? { ...s, ...patch } : s)));

  const applyTemplate = (tpl: (typeof PLAN_TEMPLATES)[number]) => {
    const apply = () => {
      setSteps(tpl.steps.map((s) => ({ ...s })));
      setOpen(null);
    };
    if (same(steps, tpl.steps)) return;
    Alert.alert(`Usar o modelo ${tpl.label}?`, 'As etapas atuais do plano serão trocadas pelas do modelo.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Usar modelo', onPress: apply },
    ]);
  };

  // A nova etapa entra no fim como manutenção; a anterior, se era manutenção, ganha 4 semanas.
  const add = () => {
    const last = steps[steps.length - 1];
    const nextDose = PLAN_DOSES.find((d) => d > (last?.mcg ?? 0)) ?? last?.mcg ?? 250;
    const before = steps.map((s, i) => (i === steps.length - 1 && s.weeks === null ? { ...s, weeks: 4 } : s));
    setSteps([...before, { mcg: nextDose, weeks: null }]);
    setOpen(steps.length);
  };

  const remove = (i: number) => {
    setSteps((cur) => cur.filter((_, k) => k !== i));
    setOpen(null);
  };

  const save = async () => {
    await saveSetting(db, 'plan', steps);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toast.show({ message: 'Plano salvo.' });
    router.back();
  };

  return (
    <SubScreen
      title="Plano de doses"
      subtitle="Cadastre as etapas da sua prescrição"
      footer={<Button label="Salvar plano" onPress={() => void save()} disabled={!steps.length || same(steps, initial)} />}
    >
      <View style={{ gap: space.s }}>
        <SectionLabel>Começar de um modelo</SectionLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
          {PLAN_TEMPLATES.map((tpl) => (
            <Chip key={tpl.id} role="radio" label={tpl.label} selected={same(steps, tpl.steps)} onPress={() => applyTemplate(tpl)} />
          ))}
        </View>
      </View>

      <View style={{ gap: space.s }}>
        <SectionLabel>Etapas</SectionLabel>
        <View style={{ borderRadius: 20, backgroundColor: t.c.surface, overflow: 'hidden' }}>
          {steps.map((s, i) => {
            const expanded = open === i;
            const isLast = i === steps.length - 1;
            const summary = `${mg(s.mcg)} · ${s.weeks !== null ? plural(s.weeks, 'semana', 'semanas') : 'manutenção'}`;
            return (
              <View key={i} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: t.c.line }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  accessibilityLabel={`Etapa ${i + 1}: ${summary}`}
                  onPress={() => setOpen(expanded ? null : i)}
                  style={({ pressed }) => ({
                    minHeight: 60,
                    paddingHorizontal: space.l,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.m,
                    backgroundColor: pressed ? t.c.surface2 : 'transparent',
                  })}
                >
                  <View style={{ width: 14, height: 14, borderRadius: radius.pill, backgroundColor: t.dose[Math.min(i, t.dose.length - 1)] }} />
                  <View style={{ flex: 1 }}>
                    <Text variant="caption" color="text3" style={{ fontFamily: fonts.semibold }}>
                      {`Etapa ${i + 1}`}
                    </Text>
                    <Text style={{ fontFamily: fonts.semibold }}>{summary}</Text>
                  </View>
                  <Icon name={expanded ? 'minus' : 'pencil'} size={18} color={t.c.text3} />
                </Pressable>
                {expanded ? (
                  <View style={{ paddingHorizontal: space.l, paddingBottom: space.l, gap: space.l }}>
                    <View style={{ gap: space.s }}>
                      <Text variant="caption" color="text3">
                        Dose
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
                        {PLAN_DOSES.map((d) => (
                          <Chip key={d} role="radio" label={mg(d)} selected={s.mcg === d} onPress={() => update(i, { mcg: d })} />
                        ))}
                      </View>
                    </View>
                    {isLast ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
                        <View style={{ flex: 1 }}>
                          <Text variant="label" style={{ fontSize: 15 }}>
                            Manutenção
                          </Text>
                          <Text variant="caption" color="text3">
                            Sem prazo para mudar de dose
                          </Text>
                        </View>
                        <Toggle label="Manutenção" value={s.weeks === null} onValueChange={(v) => update(i, { weeks: v ? null : 4 })} />
                      </View>
                    ) : null}
                    {s.weeks !== null ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text variant="caption" color="text3">
                          Semanas previstas
                        </Text>
                        <Stepper
                          label="semanas"
                          value={s.weeks}
                          min={1}
                          max={24}
                          onChange={(v) => update(i, { weeks: v })}
                          format={(v) => plural(v, 'semana', 'semanas')}
                        />
                      </View>
                    ) : null}
                    {steps.length > 1 ? <LinkButton icon="trash" label="Remover esta etapa" onPress={() => remove(i)} /> : null}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
        <LinkButton icon="plus" label="Adicionar etapa" onPress={add} />
      </View>

      <InfoNote>
        O plano segue a sua prescrição. O Leve não muda a dose sozinho: ao fim das semanas previstas, ele só lembra qual seria a próxima etapa e pede para confirmar com o médico.
      </InfoNote>
    </SubScreen>
  );
}
