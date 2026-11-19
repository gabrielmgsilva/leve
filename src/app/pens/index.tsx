import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';
import { Alert, View } from 'react-native';

import { useInjections, usePens, useToday } from '@/db/hooks';
import { penInUse, updatePen, type PenRow } from '@/db/queries';
import { useSettings } from '@/db/settings';
import { nextDoseFor, penNumbers, penState, penStatus, usedMcgByPen } from '@/domain/pens';
import { titrationState } from '@/domain/titration';
import { ddmm, mg, plural } from '@/lib/format';
import { penLabel } from '@/lib/labels';
import { space } from '@/theme/tokens';
import { InfoNote, LinkButton } from '@/ui/Bits';
import { Button } from '@/ui/Button';
import { ListGroup, ListRow, SectionLabel } from '@/ui/List';
import { SubScreen } from '@/ui/SubScreen';
import { useToast } from '@/ui/Toast';
import { useDeleteWithUndo } from '@/ui/useDeleteWithUndo';

export default function PensScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const toast = useToast();
  const remove = useDeleteWithUndo();
  const today = useToday();
  const pens = usePens();
  const injections = useInjections();
  const { plan } = useSettings();

  const info = useMemo(() => {
    const used = usedMcgByPen(injections);
    const current = titrationState(plan, injections).currentMcg;
    const lastUse = new Map<number, string>();
    for (const i of injections) if (i.pen_id !== null && i.dose_mcg !== null) lastUse.set(i.pen_id, i.at.slice(0, 10));
    return { used, current, lastUse, numbers: penNumbers(pens) };
  }, [injections, plan, pens]);

  const name = (p: PenRow) => `Caneta ${info.numbers.get(p.id) ?? '?'} · ${penLabel(p)}`;

  const describe = (p: PenRow): string => {
    const status = penStatus(p);
    if (status === 'stock') {
      const weeks = p.days_open % 7 === 0 ? plural(p.days_open / 7, 'semana', 'semanas') : plural(p.days_open, 'dia', 'dias');
      return `fechada · vale ${weeks} depois de aberta`;
    }
    if (status === 'done') {
      const last = info.lastUse.get(p.id);
      return last ? `finalizada · última dose em ${ddmm(last)}` : 'finalizada';
    }
    const dose = nextDoseFor(p, info.current);
    const st = dose !== null ? penState(p, info.used.get(p.id) ?? 0, dose, today) : null;
    const doses = st && dose !== null ? ` · ${plural(st.dosesLeft, 'dose', 'doses')} de ${mg(dose)}` : '';
    return `aberta em ${ddmm(p.opened_on as string)}${doses}${st?.useBy ? ` · usar até ${ddmm(st.useBy)}` : ''}`;
  };

  // Abre a caneta do estoque; se outra ainda estiver em uso, pergunta se ela acabou (R3).
  const start = (p: PenRow) => {
    const open = () =>
      void updatePen(db, p.id, { opened_on: today }).then(() =>
        toast.show({
          message: 'Caneta em uso a partir de hoje.',
          actionLabel: 'Desfazer',
          onAction: () => void updatePen(db, p.id, { opened_on: null }),
        }),
      );
    const current = pens.find((x) => penStatus(x) === 'open');
    if (!current) return open();
    Alert.alert(`Finalizar a ${name(current)}?`, 'Ela ainda está marcada como em uso.', [
      { text: 'Manter as duas', onPress: open },
      {
        text: 'Finalizar',
        onPress: () => void updatePen(db, current.id, { done: 1 }).then(open),
      },
    ]);
  };

  const act = (p: PenRow) => {
    const status = penStatus(p);
    const title = name(p);
    if (status === 'open') {
      Alert.alert(title, 'Finalize quando ela acabar ou for descartada.', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Finalizar caneta',
          onPress: () =>
            void updatePen(db, p.id, { done: 1 }).then(() =>
              toast.show({ message: 'Caneta finalizada.', actionLabel: 'Desfazer', onAction: () => void updatePen(db, p.id, { done: 0 }) }),
            ),
        },
      ]);
    } else if (status === 'stock') {
      Alert.alert(title, 'Ela está fechada no estoque.', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () =>
            void penInUse(db, p.id).then((busy) =>
              busy
                ? toast.show({ message: 'Esta caneta já tem aplicações e não pode ser excluída.' })
                : remove('pens', [p.id], 'Caneta excluída'),
            ),
        },
        { text: 'Começar a usar', onPress: () => start(p) },
      ]);
    } else {
      Alert.alert(title, 'Ela está finalizada.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Voltar para em uso', onPress: () => void updatePen(db, p.id, { done: 0 }) },
      ]);
    }
  };

  const groups: { title: string; pens: PenRow[] }[] = [
    { title: 'Em uso', pens: pens.filter((p) => penStatus(p) === 'open') },
    { title: 'No estoque', pens: pens.filter((p) => penStatus(p) === 'stock') },
    { title: 'Finalizadas', pens: pens.filter((p) => penStatus(p) === 'done').reverse() },
  ];

  return (
    <SubScreen title="Canetas" subtitle="Wegovy, Ozivy ou outra, na ordem em que você comprou">
      <Button label="Adicionar caneta" icon="plus" onPress={() => router.push('/pens/new')} />
      {pens.length ? <LinkButton icon="wallet" label="Preços das canetas" onPress={() => router.push('/pens/prices')} /> : null}
      {groups.map((g) =>
        g.pens.length ? (
          <View key={g.title} style={{ gap: space.s }}>
            <SectionLabel>{g.title}</SectionLabel>
            <ListGroup>
              {g.pens.map((p) => (
                <ListRow key={p.id} title={name(p)} sub={describe(p)} onPress={() => act(p)} />
              ))}
            </ListGroup>
          </View>
        ) : null,
      )}
      {!pens.length ? <InfoNote>Nenhuma caneta cadastrada. Adicione as que você tem em casa, abertas ou fechadas.</InfoNote> : null}
      <InfoNote>
        Uma caneta fica em uso a partir da primeira aplicação com ela. A validade depois de aberta vem da bula (6 semanas para Wegovy e Ozempic); confira sempre na embalagem.
      </InfoNote>
    </SubScreen>
  );
}
