// Preço pago em cada caneta (custos do tratamento).

import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';

import { usePens } from '@/db/hooks';
import { updatePen, type PenRow } from '@/db/queries';
import { parseMoney } from '@/domain/costs';
import { penNumbers, penStatus } from '@/domain/pens';
import { ddmm, moneyInput } from '@/lib/format';
import { penLabel } from '@/lib/labels';
import { InfoNote, TextField } from '@/ui/Bits';
import { Button } from '@/ui/Button';
import { SubScreen } from '@/ui/SubScreen';
import { useToast } from '@/ui/Toast';

const statusText = (p: PenRow) =>
  penStatus(p) === 'stock' ? 'no estoque' : penStatus(p) === 'open' ? `aberta em ${ddmm(p.opened_on as string)}` : 'finalizada';

export default function PricesScreen() {
  const pens = usePens();
  if (!pens.length) return null;
  return <PricesForm key={pens.map((p) => p.id).join(',')} pens={pens} />;
}

function PricesForm({ pens }: { pens: PenRow[] }) {
  const db = useSQLiteContext();
  const router = useRouter();
  const toast = useToast();
  const numbers = penNumbers(pens);
  const [values, setValues] = useState<Record<number, string>>(() =>
    Object.fromEntries(pens.map((p) => [p.id, p.price_cents !== null ? moneyInput(p.price_cents) : ''])),
  );
  const parsed = pens.map((p) => {
    const text = values[p.id]?.trim() ?? '';
    return { pen: p, text, cents: text ? parseMoney(text) : null };
  });
  const invalid = parsed.some((x) => x.text && x.cents === null);
  const changed = parsed.filter((x) => x.cents !== x.pen.price_cents && !(x.text && x.cents === null));

  const save = async () => {
    if (invalid) return;
    const before = changed.map((x) => ({ id: x.pen.id, price: x.pen.price_cents }));
    await db.withTransactionAsync(async () => {
      for (const x of changed) await updatePen(db, x.pen.id, { price_cents: x.cents });
    });
    router.back();
    if (before.length) {
      toast.show({
        message: 'Preços salvos.',
        actionLabel: 'Desfazer',
        onAction: () =>
          void db.withTransactionAsync(async () => {
            for (const b of before) await updatePen(db, b.id, { price_cents: b.price });
          }),
      });
    }
  };

  return (
    <SubScreen
      title="Preços das canetas"
      subtitle="Quanto você pagou em cada uma"
      footer={<Button label="Salvar preços" onPress={() => void save()} disabled={invalid || !changed.length} />}
    >
      {parsed.map(({ pen, text, cents }) => (
        <TextField
          key={pen.id}
          label={`Caneta ${numbers.get(pen.id)} · ${penLabel(pen)}`}
          value={values[pen.id] ?? ''}
          onChangeText={(v) => setValues((cur) => ({ ...cur, [pen.id]: v }))}
          keyboardType="decimal-pad"
          placeholder="R$"
          hint={statusText(pen)}
          error={text && cents === null ? 'Use o valor em reais, como 989,90.' : null}
          maxLength={10}
        />
      ))}
      <InfoNote icon={null}>Deixe em branco a caneta que você não lembra o preço; ela fica de fora da conta.</InfoNote>
    </SubScreen>
  );
}
