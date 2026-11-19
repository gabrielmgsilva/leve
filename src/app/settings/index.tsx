import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, AppState, Linking, Pressable, View } from 'react-native';
import { requestPinWidget } from 'react-native-android-widget';

import { exportBackup, pickBackup, restoreBackup } from '@/db/backupFile';
import { askReminderPermission, reminderPermission, type PermissionState } from '@/db/reminders';
import { useInjections, usePens, useToday } from '@/db/hooks';
import { getSetting, wipeAll, type Site } from '@/db/queries';
import { saveSetting, useSettings, type BmiPref } from '@/db/settings';
import { backupCounts } from '@/domain/backup';
import { penStatus } from '@/domain/pens';
import { daysBetween } from '@/lib/dates';
import { ago, ddmm, ddmmyyyy, joinPt, kg, meters, plural, WEEKDAYS } from '@/lib/format';
import { backupSummary, SITE_NAME } from '@/lib/labels';
import { applyThemePref, useTheme, type ThemePref } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';
import { Icon } from '@/ui/Icon';
import { InfoNote, Stepper } from '@/ui/Bits';
import { ListGroup, ListRow, SectionLabel, SwitchRow } from '@/ui/List';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { SubScreen } from '@/ui/SubScreen';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';
import { WIDGET_NAME } from '@/widget/NextWidget';

const THEMES: { value: ThemePref; label: string }[] = [
  { value: 'auto', label: 'Automático' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
];

const BMI_OPTIONS: { value: BmiPref; label: string; accessibilityLabel: string }[] = [
  { value: 'off', label: 'Ocultar', accessibilityLabel: 'Não mostrar o IMC' },
  { value: 'number', label: 'Número', accessibilityLabel: 'Mostrar só o número do IMC' },
  { value: 'band', label: 'Com faixa', accessibilityLabel: 'Mostrar o IMC com a faixa da OMS' },
];

const REGIONS: { sites: [Site, Site]; name: string }[] = [
  { sites: ['AE', 'AD'], name: 'abdômen' },
  { sites: ['CE', 'CD'], name: 'coxas' },
  { sites: ['BE', 'BD'], name: 'braços' },
];

/** "abdômen e coxas", "abdômen, coxa esquerda e braços" */
function describeSites(sites: readonly Site[]): string {
  const parts: string[] = [];
  for (const r of REGIONS) {
    const on = r.sites.filter((s) => sites.includes(s));
    if (on.length === 2) parts.push(r.name);
    else parts.push(...on.map((s) => SITE_NAME[s]));
  }
  return joinPt(parts);
}

export default function SettingsScreen() {
  const t = useTheme();
  const db = useSQLiteContext();
  const router = useRouter();
  const toast = useToast();
  const today = useToday();
  const settings = useSettings();
  const pens = usePens();
  const injections = useInjections();
  const [busy, setBusy] = useState(false);
  const [permission, setPermission] = useState<PermissionState>('granted');

  useEffect(() => {
    const check = () => void reminderPermission().then(setPermission);
    check();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && check());
    return () => sub.remove();
  }, []);

  const { profile, schedule, plan, sites, reminders } = settings;
  const firstDay = injections.find((i) => i.dose_mcg !== null)?.at.slice(0, 10) ?? null;
  const profileSub =
    [
      profile.heightCm ? meters(profile.heightCm) : null,
      profile.goalG ? `meta ${kg(profile.goalG, profile.goalG % 1000 ? 1 : 0)} kg` : 'sem meta',
      firstDay ? `início ${ddmm(firstDay)}` : null,
    ]
      .filter(Boolean)
      .join(' · ') || 'altura e meta';

  const open = pens.filter((p) => penStatus(p) === 'open').length;
  const stock = pens.filter((p) => penStatus(p) === 'stock').length;
  const pensValue = pens.length
    ? [open ? `${open} em uso` : null, stock ? `${stock} no estoque` : null].filter(Boolean).join(', ') || 'todas finalizadas'
    : 'nenhuma';

  const lastBackup = settings.lastBackup ? `último: ${ago(daysBetween(settings.lastBackup, today))}` : 'nunca feito';

  const run = async (task: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await task();
    } finally {
      setBusy(false);
    }
  };

  const onExport = () =>
    run(async () => {
      try {
        const result = await exportBackup(db);
        if (result === 'unavailable') toast.show({ message: 'Este celular não tem como compartilhar o arquivo.' });
      } catch {
        toast.show({ message: 'Não foi possível gerar o backup. Tente de novo.' });
      }
    });

  const onRestore = () =>
    run(async () => {
      const result = await pickBackup();
      if (!result) return;
      if (!result.ok) {
        Alert.alert('Não deu para restaurar', result.error);
        return;
      }
      const n = backupCounts(result.backup);
      const summary = backupSummary(n);
      Alert.alert(
        `Restaurar o backup de ${ddmmyyyy(result.backup.exportedAt)}?`,
        `${summary}\n\nIsso substitui todos os dados que estão no celular agora.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Restaurar',
            style: 'destructive',
            onPress: () =>
              void run(async () => {
                try {
                  await restoreBackup(db, result.backup);
                  applyThemePref(await getSetting<ThemePref>(db, 'theme', 'auto'));
                  toast.show({ message: 'Backup restaurado.' });
                } catch {
                  Alert.alert('Não deu para restaurar', 'Nada foi alterado. Tente de novo.');
                }
              }),
          },
        ],
      );
    });

  const onWipe = () =>
    Alert.alert(
      'Apagar todos os dados?',
      'Pesagens, aplicações, canetas, diário, medidas, fotos e ajustes saem do celular. Faça um backup antes, se quiser guardar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar tudo',
          style: 'destructive',
          onPress: () =>
            void run(async () => {
              await wipeAll(db);
              applyThemePref('auto');
              toast.show({ message: 'Todos os dados foram apagados.' });
              router.back();
            }),
        },
      ],
    );

  return (
    <SubScreen title="Ajustes">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Seu perfil: ${profileSub}`}
        onPress={() => router.push('/settings/profile')}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          padding: space.l,
          borderRadius: radius.tile,
          backgroundColor: pressed ? t.c.surface2 : t.c.surface,
        })}
      >
        <View style={{ width: 48, height: 48, borderRadius: radius.pill, backgroundColor: t.c.medSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="user" size={24} color={t.c.med} />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text variant="headline">{profile.name ? profile.name : 'Seu perfil'}</Text>
          <Text variant="label" color="text2" style={{ fontFamily: fonts.regular }}>
            {profileSub}
          </Text>
        </View>
        <Icon name="chevronRight" size={18} color={t.c.text3} strokeWidth={2} />
      </Pressable>

      <View style={{ gap: space.s }}>
        <SectionLabel>Tratamento</SectionLabel>
        <ListGroup>
          <ListRow title="Canetas e estoque" value={pensValue} onPress={() => router.push('/pens')} />
          <ListRow
            title="Dia e horário"
            value={`${WEEKDAYS[schedule.weekday]}, ${schedule.time}`}
            onPress={() => router.push('/settings/schedule')}
          />
          <ListRow title="Plano de doses" value={plural(plan.length, 'etapa', 'etapas')} onPress={() => router.push('/settings/plan')} />
          <ListRow title="Locais que uso" value={describeSites(sites)} onPress={() => router.push('/settings/sites')} />
        </ListGroup>
      </View>

      <View style={{ gap: space.s }}>
        <SectionLabel>Lembretes</SectionLabel>
        <ListGroup>
          <SwitchRow
            title="Aplicação"
            sub={`${WEEKDAYS[schedule.weekday]} às ${schedule.time}${reminders.followUpHours ? `, de novo ${reminders.followUpHours} h depois se não registrar` : ''}`}
            value={reminders.injection}
            onValueChange={(v) => void saveSetting(db, 'reminders', { ...reminders, injection: v })}
          />
          <SwitchRow
            title="Caneta"
            sub="véspera da última dose e 7 dias antes de vencer"
            value={reminders.pen}
            onValueChange={(v) => void saveSetting(db, 'reminders', { ...reminders, pen: v })}
          />
          <SwitchRow
            title="Backup"
            sub="um aviso quando fizer 30 dias do último"
            value={reminders.backup}
            onValueChange={(v) => void saveSetting(db, 'reminders', { ...reminders, backup: v })}
          />
          <View style={{ minHeight: 64, paddingHorizontal: space.l, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: space.m }}>
            <View style={{ flex: 1, gap: 1 }}>
              <Text variant="label" style={{ fontSize: 15, lineHeight: 20 }}>
                Reforço
              </Text>
              <Text variant="caption" color="text3">
                se a aplicação não for registrada
              </Text>
            </View>
            <Stepper
              label="horas do reforço"
              value={reminders.followUpHours}
              min={0}
              max={8}
              format={(v) => (v ? `${v} h` : 'sem')}
              onChange={(v) => void saveSetting(db, 'reminders', { ...reminders, followUpHours: v })}
            />
          </View>
        </ListGroup>
        {permission !== 'granted' ? (
          <View style={{ gap: space.s }}>
            <InfoNote tone="warn">
              {permission === 'ask'
                ? 'Os lembretes precisam da permissão de notificações.'
                : 'As notificações do Leve estão desligadas no Android. Ligue nas configurações do app para receber os lembretes.'}
            </InfoNote>
            <ListGroup>
              <ListRow
                title={permission === 'ask' ? 'Permitir notificações' : 'Abrir configurações do app'}
                onPress={() => (permission === 'ask' ? void askReminderPermission().then(() => reminderPermission().then(setPermission)) : void Linking.openSettings())}
              />
            </ListGroup>
          </View>
        ) : null}
        <ListGroup>
          <ListRow
            title="Se os lembretes atrasarem"
            onPress={() =>
              Alert.alert(
                'Lembretes atrasados',
                'Alguns celulares seguram as notificações para economizar bateria. Nas configurações do app, em Bateria, escolha "Sem restrições" (ou tire o Leve da otimização de bateria).',
                [
                  { text: 'Agora não', style: 'cancel' },
                  { text: 'Abrir configurações', onPress: () => void Linking.openSettings() },
                ],
              )
            }
          />
        </ListGroup>
      </View>

      <View style={{ gap: space.s }}>
        <SectionLabel>Widget</SectionLabel>
        <ListGroup>
          <ListRow
            title="Adicionar à tela inicial"
            sub="próxima aplicação e caneta, sem o peso"
            onPress={() =>
              void requestPinWidget({ widgetName: WIDGET_NAME }).then((ok) => {
                if (!ok) {
                  Alert.alert(
                    'Adicione pelo celular',
                    'Toque e segure num espaço vazio da tela inicial, escolha Widgets e procure o Leve.',
                  );
                }
              })
            }
          />
        </ListGroup>
      </View>

      <View style={{ gap: space.s }}>
        <SectionLabel>Aparência</SectionLabel>
        <SegmentedControl
          options={THEMES}
          value={settings.theme}
          height={40}
          accessibilityLabel="Aparência"
          onChange={(v) => {
            applyThemePref(v);
            void saveSetting(db, 'theme', v);
          }}
        />
      </View>

      <View style={{ gap: space.s }}>
        <SectionLabel>IMC na Evolução</SectionLabel>
        <SegmentedControl
          options={BMI_OPTIONS}
          value={settings.bmi}
          height={40}
          accessibilityLabel="IMC na Evolução"
          onChange={(v) => void saveSetting(db, 'bmi', v)}
        />
        <Text variant="caption" color="text3" style={{ marginHorizontal: 4 }}>
          A faixa segue a classificação da OMS. Precisa da altura no perfil.
        </Text>
      </View>

      <View style={{ gap: space.s }}>
        <SectionLabel>Seus dados</SectionLabel>
        <ListGroup>
          <ListRow title="Exportar backup" value={lastBackup} onPress={() => void onExport()} />
          <ListRow title="Restaurar backup" onPress={() => void onRestore()} />
        </ListGroup>
        <Text variant="caption" color="text3" style={{ marginHorizontal: 4 }}>
          Sem conta e sem nuvem: o backup é um arquivo que você guarda onde quiser (Drive, WhatsApp, Arquivos). As fotos vão junto.
        </Text>
        <ListGroup>
          <ListRow title="Relatório para a consulta" sub="PDF com peso, doses, aplicações e sintomas" onPress={() => router.push('/settings/export')} />
          <ListRow title="Planilhas (CSV)" sub="para abrir no Excel ou no Google Planilhas" onPress={() => router.push('/settings/export')} />
          <ListRow
            title="Balança (Health Connect)"
            value={settings.health.enabled ? 'ligada' : 'desligada'}
            onPress={() => router.push('/settings/health')}
          />
        </ListGroup>
        <ListGroup>
          <ListRow title="Apagar todos os dados" danger onPress={onWipe} />
        </ListGroup>
      </View>

      <View style={{ alignItems: 'center', gap: 4, paddingTop: space.s }}>
        <Text variant="label" color="text2" style={{ fontFamily: fonts.semibold }}>
          {`Leve ${Constants.expoConfig?.version ?? ''} · feito com carinho, só para você`}
        </Text>
        <Text variant="caption" color="text3" style={{ textAlign: 'center' }}>
          O Leve registra e lembra. Não substitui orientação médica; doses e mudanças de dose seguem a prescrição.
        </Text>
      </View>
    </SubScreen>
  );
}
