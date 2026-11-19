import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { View } from 'react-native';

import { saveSetting, useSettingsState, type Profile } from '@/db/settings';
import { kg } from '@/lib/format';
import { space } from '@/theme/tokens';
import { InfoNote, TextField } from '@/ui/Bits';
import { Button } from '@/ui/Button';
import { SubScreen } from '@/ui/SubScreen';
import { useToast } from '@/ui/Toast';

export default function ProfileScreen() {
  const { settings, loaded } = useSettingsState();
  if (!loaded) return <SubScreen title="Seu perfil" />;
  return <ProfileForm initial={settings.profile} />;
}

const toNumber = (text: string) => Number(text.trim().replace(',', '.'));

function ProfileForm({ initial }: { initial: Profile }) {
  const db = useSQLiteContext();
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(initial.name);
  const [height, setHeight] = useState(initial.heightCm ? String(initial.heightCm) : '');
  const [goal, setGoal] = useState(initial.goalG ? kg(initial.goalG, initial.goalG % 1000 ? 1 : 0) : '');

  const heightCm = height.trim() ? Math.round(toNumber(height)) : null;
  const goalKg = goal.trim() ? toNumber(goal) : null;
  const heightError = heightCm !== null && !(heightCm >= 100 && heightCm <= 230) ? 'Use a altura em centímetros, entre 100 e 230.' : null;
  const goalError = goalKg !== null && !(goalKg >= 30 && goalKg <= 300) ? 'A meta precisa ficar entre 30 e 300 kg.' : null;

  const save = async () => {
    if (heightError || goalError) return;
    await saveSetting(db, 'profile', {
      name: name.trim(),
      heightCm,
      goalG: goalKg !== null ? Math.round(goalKg * 1000) : null,
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toast.show({ message: 'Perfil salvo.' });
    router.back();
  };

  return (
    <SubScreen
      title="Seu perfil"
      footer={<Button label="Salvar" onPress={() => void save()} disabled={!!heightError || !!goalError} />}
    >
      <View style={{ gap: space.l }}>
        <TextField label="Como prefere ser chamada" value={name} onChangeText={setName} placeholder="Opcional" maxLength={40} />
        <TextField
          label="Altura"
          value={height}
          onChangeText={setHeight}
          keyboardType="number-pad"
          suffix="cm"
          placeholder="165"
          maxLength={3}
          error={heightError}
          hint="Usada só para calcular o IMC."
        />
        <TextField
          label="Meta de peso"
          value={goal}
          onChangeText={setGoal}
          keyboardType="decimal-pad"
          suffix="kg"
          placeholder="Opcional"
          maxLength={5}
          error={goalError}
          hint="Sem meta, a Evolução mostra os marcos de −5%, −10% e a cada 5 kg."
        />
      </View>
      <InfoNote>O peso inicial é a primeira pesagem registrada, e o início do tratamento, a primeira aplicação.</InfoNote>
    </SubScreen>
  );
}
