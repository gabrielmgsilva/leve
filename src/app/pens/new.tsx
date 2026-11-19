import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { View } from 'react-native';

import { addPens } from '@/db/queries';
import { parseMoney } from '@/domain/costs';
import { DEFAULT_DAYS_OPEN, PEN_CATALOG, type PenModel } from '@/domain/pens';
import { mg, plural } from '@/lib/format';
import { space } from '@/theme/tokens';
import { InfoNote, Stepper, TextField } from '@/ui/Bits';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { SectionLabel } from '@/ui/List';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { SubScreen } from '@/ui/SubScreen';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';

const BRANDS = ['Wegovy', 'Ozivy', 'Ozempic', 'Outra'] as const;
type Brand = (typeof BRANDS)[number];

const toNumber = (text: string) => Number(text.trim().replace(',', '.'));

function modelHint(m: PenModel): string {
  if (m.doseMcg !== null) return `${Math.floor(m.totalMcg / m.doseMcg)} doses de ${mg(m.doseMcg)}`;
  return `${mg(m.totalMcg)}, dose ajustável`;
}

export default function NewPenScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const toast = useToast();
  const [brand, setBrand] = useState<Brand>('Wegovy');
  const [model, setModel] = useState<PenModel | null>(null);
  const [otherName, setOtherName] = useState('');
  const [total, setTotal] = useState('');
  const [doseKind, setDoseKind] = useState<'fixed' | 'adjustable'>('fixed');
  const [dose, setDose] = useState('');
  const [weeks, setWeeks] = useState(DEFAULT_DAYS_OPEN / 7);
  const [count, setCount] = useState(1);
  const [price, setPrice] = useState('');
  const priceCents = price.trim() ? parseMoney(price) : null;
  const priceError = price.trim() && priceCents === null ? 'Use o valor em reais, como 989,90.' : null;

  const models = PEN_CATALOG.filter((m) => m.brand === brand);
  const custom = brand === 'Outra';
  const totalMcg = Math.round(toNumber(total) * 1000);
  const doseMcg = Math.round(toNumber(dose) * 1000);
  const customError =
    custom && total.trim() && !(totalMcg > 0 && totalMcg <= 50000)
      ? 'Informe o conteúdo total da caneta em mg.'
      : custom && doseKind === 'fixed' && dose.trim() && !(doseMcg > 0 && doseMcg <= totalMcg)
        ? 'A dose precisa ser menor que o conteúdo.'
        : null;
  const ready =
    (custom ? totalMcg > 0 && (doseKind === 'adjustable' || doseMcg > 0) && !customError : model !== null) && !priceError;

  const save = async () => {
    if (!ready) return;
    const row = custom
      ? {
          brand: otherName.trim() || 'Outra',
          total_mcg: totalMcg,
          dose_mcg: doseKind === 'fixed' ? doseMcg : null,
        }
      : { brand: (model as PenModel).brand, total_mcg: (model as PenModel).totalMcg, dose_mcg: (model as PenModel).doseMcg };
    await addPens(
      db,
      Array.from({ length: count }, () => ({ ...row, days_open: weeks * 7, opened_on: null, done: 0, price_cents: priceCents })),
    );
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toast.show({ message: `${plural(count, 'caneta adicionada', 'canetas adicionadas')} ao estoque.` });
    router.back();
  };

  return (
    <SubScreen
      title="Adicionar caneta"
      subtitle="Ela entra no estoque, fechada"
      footer={<Button label={count > 1 ? `Adicionar ${count} canetas` : 'Adicionar ao estoque'} onPress={() => void save()} disabled={!ready} />}
    >
      <View style={{ gap: space.s }}>
        <SectionLabel>Marca</SectionLabel>
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
          {BRANDS.map((b) => (
            <Chip
              key={b}
              role="radio"
              label={b}
              selected={brand === b}
              onPress={() => {
                setBrand(b);
                setModel(null);
              }}
            />
          ))}
        </View>
      </View>

      {custom ? (
        <View style={{ gap: space.l }}>
          <TextField label="Nome da caneta" value={otherName} onChangeText={setOtherName} placeholder="Ex.: semaglutida genérica" maxLength={30} />
          <TextField label="Conteúdo total" value={total} onChangeText={setTotal} keyboardType="decimal-pad" suffix="mg" placeholder="4" maxLength={5} />
          <SegmentedControl
            options={[
              { value: 'fixed', label: 'Dose fixa' },
              { value: 'adjustable', label: 'Dose ajustável' },
            ]}
            value={doseKind}
            onChange={setDoseKind}
            accessibilityLabel="Tipo de dose"
          />
          {doseKind === 'fixed' ? (
            <TextField label="Dose de cada aplicação" value={dose} onChangeText={setDose} keyboardType="decimal-pad" suffix="mg" placeholder="1" maxLength={4} error={customError} />
          ) : customError ? (
            <Text variant="caption" color="warnStrong">
              {customError}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={{ gap: space.s }}>
          <SectionLabel>Modelo</SectionLabel>
          <View accessibilityRole="radiogroup" style={{ gap: space.s }}>
            {models.map((m) => (
              <Chip
                key={m.model}
                role="radio"
                label={`${m.model} · ${modelHint(m)}`}
                selected={model === m}
                onPress={() => setModel(m)}
              />
            ))}
          </View>
        </View>
      )}

      <View style={{ gap: space.m }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.m }}>
          <View style={{ flex: 1 }}>
            <Text variant="label" style={{ fontSize: 15 }}>
              Validade depois de aberta
            </Text>
            <Text variant="caption" color="text3">
              {brand === 'Ozivy' ? 'Confira na bula do Ozivy' : 'Wegovy e Ozempic: 6 semanas'}
            </Text>
          </View>
          <Stepper label="semanas de validade" value={weeks} min={1} max={12} onChange={setWeeks} format={(v) => `${v} sem`} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.m }}>
          <View style={{ flex: 1 }}>
            <Text variant="label" style={{ fontSize: 15 }}>
              Quantidade
            </Text>
            <Text variant="caption" color="text3">
              Canetas iguais compradas juntas
            </Text>
          </View>
          <Stepper label="canetas" value={count} min={1} max={6} onChange={setCount} />
        </View>
      </View>

      <TextField
        label={count > 1 ? 'Preço de cada caneta (opcional)' : 'Preço pago (opcional)'}
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        placeholder="989,90"
        hint="Em reais. Entra no resumo de custos do Tratamento."
        error={priceError}
        maxLength={10}
      />

      <InfoNote>Confira o conteúdo e a dose na embalagem. O Leve conta só as doses nominais, sem o excedente do teste de fluxo.</InfoNote>
    </SubScreen>
  );
}
