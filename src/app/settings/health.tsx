// Balança inteligente pelo Health Connect: conectar, importar e desligar.

import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { openHealthConnectSettings } from 'react-native-health-connect';

import { connectHealth, healthGranted, healthStatus, importFromHealth, type HealthStatus } from '@/db/health';
import { useToday } from '@/db/hooks';
import { saveSetting, useSettings } from '@/db/settings';
import { daysBetween } from '@/lib/dates';
import { ago, plural, timeOf } from '@/lib/format';
import { space } from '@/theme/tokens';
import { InfoNote } from '@/ui/Bits';
import { Button } from '@/ui/Button';
import { ListGroup, ListRow, SectionLabel, SwitchRow } from '@/ui/List';
import { SubScreen } from '@/ui/SubScreen';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';

const PLAY_HEALTH_CONNECT = 'market://details?id=com.google.android.apps.healthdata';

export default function HealthScreen() {
  const db = useSQLiteContext();
  const toast = useToast();
  const today = useToday();
  const { health } = useSettings();
  const [status, setStatus] = useState<HealthStatus | null>(null);
  const [granted, setGranted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const s = await healthStatus();
      const g = s === 'available' ? await healthGranted().catch(() => false) : false;
      if (alive) {
        setStatus(s);
        setGranted(g);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const importNow = async () => {
    const n = await importFromHealth(db);
    toast.show({ message: n ? `${plural(n, 'pesagem importada', 'pesagens importadas')}.` : 'Nenhuma pesagem nova.' });
  };

  const run = async (task: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await task();
    } catch {
      toast.show({ message: 'Não deu para falar com o Health Connect. Tente de novo.' });
    } finally {
      setBusy(false);
    }
  };

  const connect = () =>
    run(async () => {
      const ok = await connectHealth();
      setGranted(ok);
      if (!ok) {
        toast.show({ message: 'Sem a permissão de leitura do peso, a balança fica desligada.' });
        return;
      }
      await saveSetting(db, 'health', { ...health, enabled: true });
      await importNow();
    });

  const last = health.lastSync
    ? `${daysBetween(health.lastSync, today) === 0 ? `hoje às ${timeOf(health.lastSync)}` : ago(daysBetween(health.lastSync, today))}`
    : 'nunca';

  return (
    <SubScreen title="Balança" subtitle="Pesagens pelo Health Connect">
      <InfoNote icon="activity">
        Se a sua balança inteligente manda o peso para o Health Connect (pelo app dela, como Samsung Health, Zepp, Withings ou
        Eufy), o Leve importa as pesagens sozinho. Ele só lê o peso; nada sai do celular.
      </InfoNote>

      {status === 'unavailable' ? (
        <View style={{ gap: space.s }}>
          <Text color="text2">O Health Connect não está disponível neste celular. No Android 14 ou mais novo ele já vem instalado; antes disso, instale pela Play Store.</Text>
          <Button label="Abrir na Play Store" variant="soft" onPress={() => void Linking.openURL(PLAY_HEALTH_CONNECT)} />
        </View>
      ) : null}

      {status === 'update' ? (
        <View style={{ gap: space.s }}>
          <Text color="text2">O Health Connect precisa ser atualizado antes de conectar.</Text>
          <Button label="Atualizar na Play Store" variant="soft" onPress={() => void Linking.openURL(PLAY_HEALTH_CONNECT)} />
        </View>
      ) : null}

      {status === 'available' && !granted ? (
        <Button label="Conectar a balança" icon="activity" variant="med" onPress={() => void connect()} disabled={busy} />
      ) : null}

      {status === 'available' && granted ? (
        <View style={{ gap: space.s }}>
          <SectionLabel>Importação</SectionLabel>
          <ListGroup>
            <SwitchRow
              title="Importar ao abrir o Leve"
              sub={`última importação: ${last}`}
              value={health.enabled}
              onValueChange={(v) => void saveSetting(db, 'health', { ...health, enabled: v })}
            />
            <ListRow title="Importar agora" onPress={() => void run(importNow)} />
          </ListGroup>
          <ListGroup>
            <ListRow title="Abrir o Health Connect" sub="para ver ou tirar a permissão" onPress={() => openHealthConnectSettings()} />
          </ListGroup>
          <Text variant="caption" color="text3" style={{ marginHorizontal: 4 }}>
            Na primeira vez, entram as pesagens dos últimos 30 dias (o limite do Health Connect). Uma pesagem que você já digitou (até 30 minutos e 100 g de
            diferença) não entra de novo.
          </Text>
        </View>
      ) : null}
    </SubScreen>
  );
}
