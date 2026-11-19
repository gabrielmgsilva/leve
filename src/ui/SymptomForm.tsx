import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { View } from 'react-native';

import { addJournalEntries } from '@/db/queries';
import { toStamp } from '@/lib/dates';
import { LEVEL_LABEL, SYMPTOM_LABEL } from '@/lib/labels';
import { space } from '@/theme/tokens';

import { LinkButton, TextField } from './Bits';
import { Button } from './Button';
import { Chip } from './Chip';
import { SegmentedControl } from './SegmentedControl';
import { Text } from './Text';

// "Bem" exclui os sintomas; os mais comuns primeiro, o resto em "Mais sintomas" (R6).
const MAIN = ['well', 'nausea', 'low_appetite', 'fatigue', 'heartburn', 'constipation', 'headache', 'other'];
const MORE = ['vomiting', 'diarrhea', 'abdominal_pain', 'dizziness', 'site_reaction', 'early_satiety'];
const LEVELS = [
  { value: '1', label: 'Leve' },
  { value: '2', label: 'Moderada' },
  { value: '3', label: 'Forte' },
] as const;

const chipLabel = (kind: string) => (kind === 'well' ? 'Bem' : SYMPTOM_LABEL[kind]);

/** Registro rápido de como ela está: sintomas com intensidade, ou "Bem". */
export function SymptomForm({ onSaved }: { onSaved: (ids: number[], summary: string) => void }) {
  const db = useSQLiteContext();
  const [selected, setSelected] = useState<string[]>([]);
  const [level, setLevel] = useState<'1' | '2' | '3'>('1');
  const [other, setOther] = useState('');
  const [more, setMore] = useState(false);
  const [saving, setSaving] = useState(false);

  const symptoms = selected.filter((k) => k !== 'well');
  const toggle = (kind: string) => {
    setSelected((cur) => {
      if (kind === 'well') return cur.includes('well') ? [] : ['well'];
      const rest = cur.filter((k) => k !== 'well');
      return rest.includes(kind) ? rest.filter((k) => k !== kind) : [...rest, kind];
    });
  };

  const save = async () => {
    if (!selected.length || saving) return;
    setSaving(true);
    const at = toStamp(new Date());
    const lv = Number(level);
    const rows = selected.includes('well')
      ? [{ at, kind: 'well', level: null, text: null }]
      : symptoms.map((kind) => ({ at, kind, level: lv, text: kind === 'other' ? other.trim() || null : null }));
    const ids = await addJournalEntries(db, rows);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const summary = selected.includes('well')
      ? 'tudo bem hoje'
      : `${symptoms.map((k) => (k === 'other' && other.trim() ? other.trim() : SYMPTOM_LABEL[k]).toLowerCase()).join(', ')} · ${LEVEL_LABEL[lv]}`;
    setSelected([]);
    setOther('');
    setLevel('1');
    setSaving(false);
    onSaved(ids, summary);
  };

  const shown = more ? [...MAIN, ...MORE] : MAIN;

  return (
    <View style={{ gap: 14 }}>
      <View accessibilityRole="list" accessibilityLabel="Sintomas" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
        {shown.map((kind) => (
          <Chip key={kind} label={chipLabel(kind)} selected={selected.includes(kind)} onPress={() => toggle(kind)} />
        ))}
      </View>
      {!more ? <LinkButton label="Mais sintomas" icon="plus" onPress={() => setMore(true)} /> : null}

      {selected.includes('other') ? (
        <TextField label="Qual sintoma?" value={other} onChangeText={setOther} placeholder="Opcional" maxLength={80} />
      ) : null}

      {symptoms.length ? (
        <View style={{ gap: space.s }}>
          <Text variant="caption" color="text3">
            Intensidade
          </Text>
          <SegmentedControl options={LEVELS} value={level} onChange={setLevel} accessibilityLabel="Intensidade" />
        </View>
      ) : null}

      <Button label="Registrar" onPress={() => void save()} disabled={!selected.length || saving} />
    </View>
  );
}
