import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { useToday } from '@/db/hooks';
import { deleteRow } from '@/db/queries';
import { weekdayAndDate } from '@/lib/format';
import { SheetScreen } from '@/ui/SheetScreen';
import { SymptomForm } from '@/ui/SymptomForm';
import { useToast } from '@/ui/Toast';

export default function SymptomsSheet() {
  const router = useRouter();
  const db = useSQLiteContext();
  const toast = useToast();
  const today = useToday();
  return (
    <SheetScreen title="Como você está?" subtitle={weekdayAndDate(today)}>
      <SymptomForm
        onSaved={(ids, summary) => {
          router.back();
          toast.show({
            message: `Registrado: ${summary}`,
            actionLabel: 'Desfazer',
            onAction: () => {
              void Promise.all(ids.map((id) => deleteRow(db, 'journal', id)));
            },
          });
        }}
      />
    </SheetScreen>
  );
}
