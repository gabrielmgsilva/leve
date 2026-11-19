import { useRouter } from 'expo-router';
import { useMemo } from 'react';

import { useInjections, usePens } from '@/db/hooks';
import { useSettings } from '@/db/settings';
import { penNumbers } from '@/domain/pens';
import { doseRank } from '@/domain/titration';
import { ddmm, plural } from '@/lib/format';
import { injectionDetail, injectionTitle } from '@/lib/labels';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { Card } from '@/ui/Card';
import { EntryRow } from '@/ui/List';
import { SubScreen } from '@/ui/SubScreen';
import { Text } from '@/ui/Text';

export default function InjectionsScreen() {
  const t = useTheme();
  const injections = useInjections();
  const pens = usePens();
  const { plan } = useSettings();
  const router = useRouter();
  const numbers = useMemo(() => penNumbers(pens), [pens]);
  const list = [...injections].reverse();
  const doses = injections.filter((i) => i.dose_mcg !== null);

  return (
    <SubScreen
      title="Aplicações"
      subtitle={doses.length ? `${plural(doses.length, 'aplicação', 'aplicações')} desde ${ddmm(doses[0].at)}` : undefined}
    >
      <Card style={{ gap: 0, paddingVertical: space.s }}>
        {list.length ? (
          list.map((i, k) => (
            <EntryRow
              key={i.id}
              marker={i.dose_mcg !== null ? t.dose[Math.min(doseRank(i.dose_mcg, plan), t.dose.length - 1)] : t.c.track}
              title={injectionTitle(i)}
              sub={injectionDetail(i, numbers)}
              last={k === list.length - 1}
              accessibilityLabel={`${injectionTitle(i)}: ${injectionDetail(i, numbers)}. Toque para editar.`}
              onPress={() => router.push({ pathname: '/log/injection', params: { id: String(i.id) } })}
            />
          ))
        ) : (
          <Text color="text2" style={{ paddingVertical: space.m }}>
            Nenhuma aplicação registrada ainda.
          </Text>
        )}
      </Card>
    </SubScreen>
  );
}
