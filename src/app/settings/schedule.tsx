import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useSQLiteContext } from 'expo-sqlite';
import { View } from 'react-native';

import { useInjections, useToday } from '@/db/hooks';
import { saveSetting, useSettings } from '@/db/settings';
import { nextDue } from '@/domain/schedule';
import { dayShort, WEEKDAYS } from '@/lib/format';
import { space } from '@/theme/tokens';
import { InfoNote } from '@/ui/Bits';
import { Chip } from '@/ui/Chip';
import { ListGroup, ListRow, SectionLabel } from '@/ui/List';
import { SubScreen } from '@/ui/SubScreen';
import { Text } from '@/ui/Text';

const SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function ScheduleScreen() {
  const db = useSQLiteContext();
  const today = useToday();
  const injections = useInjections();
  const { schedule } = useSettings();

  const last = injections[injections.length - 1];
  const next = nextDue(last ? last.at.slice(0, 10) : null, schedule.weekday, today);

  const pickTime = () => {
    const [h, m] = schedule.time.split(':').map(Number);
    const value = new Date();
    value.setHours(h, m, 0, 0);
    DateTimePickerAndroid.open({
      value,
      mode: 'time',
      is24Hour: true,
      onValueChange: (_event, date) => {
        const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        void saveSetting(db, 'schedule', { ...schedule, time });
      },
    });
  };

  return (
    <SubScreen title="Dia e horário" subtitle="Quando você aplica a caneta">
      <View style={{ gap: space.s }}>
        <SectionLabel>Dia da semana</SectionLabel>
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
          {SHORT.map((label, weekday) => (
            <Chip
              key={label}
              role="radio"
              label={label}
              accessibilityLabel={WEEKDAYS[weekday]}
              selected={schedule.weekday === weekday}
              onPress={() => void saveSetting(db, 'schedule', { ...schedule, weekday })}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: space.s }}>
        <SectionLabel>Horário</SectionLabel>
        <ListGroup>
          <ListRow title="Horário da aplicação" value={schedule.time} onPress={pickTime} accessibilityHint="Abre o relógio" />
        </ListGroup>
        <Text variant="caption" color="text3" style={{ marginHorizontal: 4 }}>
          É a hora do lembrete da aplicação.
        </Text>
      </View>

      <InfoNote tone={next.state === 'overdue' ? 'warn' : 'med'} icon="calendar">
        {next.state === 'overdue'
          ? `A aplicação prevista para ${dayShort(next.day)} ainda não foi registrada.`
          : next.state === 'today'
            ? 'A próxima aplicação é hoje.'
            : `Próxima aplicação prevista: ${dayShort(next.day)}.`}
      </InfoNote>
      <InfoNote>
        Ao trocar o dia, o Leve mantém pelo menos 3 dias (72 h) desde a última aplicação, como orienta a bula. Confirme a troca com seu médico.
      </InfoNote>
    </SubScreen>
  );
}
