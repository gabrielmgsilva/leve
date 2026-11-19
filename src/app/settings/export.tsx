// Relatório em PDF para a consulta e planilhas em CSV.

import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { useInjections, useJournal, useMeasures, usePens, useToday, useWeights } from '@/db/hooks';
import { useSettings } from '@/db/settings';
import { periodStart, type Period } from '@/domain/progress';
import { toStamp } from '@/lib/dates';
import { injectionsCsv, journalCsv, measuresCsv, weightsCsv } from '@/lib/csv';
import { ddmmyyyy, plural } from '@/lib/format';
import { reportHtml } from '@/lib/report';
import { space } from '@/theme/tokens';
import { InfoNote } from '@/ui/Bits';
import { Button } from '@/ui/Button';
import { ListGroup, ListRow, SectionLabel, SwitchRow } from '@/ui/List';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { SubScreen } from '@/ui/SubScreen';
import { Text } from '@/ui/Text';

const PERIODS: { value: Period; label: string; accessibilityLabel: string }[] = [
  { value: '1M', label: '1M', accessibilityLabel: 'Último mês' },
  { value: '3M', label: '3M', accessibilityLabel: 'Últimos 3 meses' },
  { value: '6M', label: '6M', accessibilityLabel: 'Últimos 6 meses' },
  { value: 'all', label: 'Tudo', accessibilityLabel: 'Desde o início' },
];

/** Grava no cache com um nome legível e abre o menu de compartilhar. */
async function shareFile(name: string, write: (file: File) => Promise<void>, mimeType: string, dialogTitle: string): Promise<void> {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  await write(file);
  if (!(await Sharing.isAvailableAsync())) {
    Alert.alert('Não há como compartilhar', 'Este aparelho não tem um app para receber o arquivo.');
    return;
  }
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle });
}

export default function ExportScreen() {
  const today = useToday();
  const settings = useSettings();
  const weights = useWeights();
  const injections = useInjections();
  const pens = usePens();
  const journal = useJournal();
  const measures = useMeasures();
  const [period, setPeriod] = useState<Period>('3M');
  const [notes, setNotes] = useState(false);
  const [busy, setBusy] = useState(false);

  const firstDay = [weights[0]?.at, injections[0]?.at, journal[0]?.at, measures[0]?.at]
    .filter((d): d is string => !!d)
    .map((d) => d.slice(0, 10))
    .sort()[0] ?? today;
  const from = periodStart(period, today, firstDay);

  const run = async (task: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await task();
    } catch {
      Alert.alert('Não deu para gerar o arquivo', 'Tente de novo.');
    } finally {
      setBusy(false);
    }
  };

  const html = () =>
    reportHtml({
      name: settings.profile.name.trim(),
      today,
      generatedAt: toStamp(new Date()),
      from,
      heightCm: settings.profile.heightCm,
      goalG: settings.profile.goalG,
      plan: settings.plan,
      weights,
      injections,
      pens,
      journal,
      measures,
      includeNotes: notes,
    });

  const sharePdf = () =>
    run(async () => {
      // A4 em pontos (72 por polegada).
      const pdf = await Print.printToFileAsync({ html: html(), width: 595, height: 842 });
      await shareFile(
        `leve-relatorio-${today}.pdf`,
        async (file) => new File(pdf.uri).copy(file),
        'application/pdf',
        'Compartilhar o relatório',
      );
    });

  const printPdf = () => run(() => Print.printAsync({ html: html() }));

  const csv = (name: string, content: () => string) => () =>
    run(() =>
      shareFile(
        `leve-${name}-${today}.csv`,
        async (file) => {
          file.create();
          await file.write(content());
        },
        'text/csv',
        'Compartilhar a planilha',
      ),
    );

  const measured = new Set(measures.map((m) => m.at)).size;

  return (
    <SubScreen title="Relatório e planilhas" subtitle="Para a consulta ou para guardar">
      <View style={{ gap: space.s }}>
        <SectionLabel>Relatório para a consulta (PDF)</SectionLabel>
        <SegmentedControl options={PERIODS} value={period} onChange={setPeriod} height={40} accessibilityLabel="Período do relatório" />
        <Text variant="caption" color="text3" style={{ marginHorizontal: 4 }}>
          {`De ${ddmmyyyy(from)} a ${ddmmyyyy(today)}: resumo do peso, gráfico, fases de dose, aplicações, sintomas e medidas.`}
        </Text>
        <ListGroup>
          <SwitchRow title="Incluir as notas do Diário" sub="o texto livre que você escreveu" value={notes} onValueChange={setNotes} />
        </ListGroup>
        <View style={{ gap: space.s }}>
          <Button label="Compartilhar PDF" icon="share" variant="med" onPress={() => void sharePdf()} disabled={busy} />
          <Button label="Imprimir" icon="file" variant="soft" onPress={() => void printPdf()} disabled={busy} />
        </View>
      </View>

      <View style={{ gap: space.s }}>
        <SectionLabel>Planilhas (CSV)</SectionLabel>
        <ListGroup>
          <ListRow title="Pesagens" value={String(weights.length)} onPress={csv('pesagens', () => weightsCsv(weights))} />
          <ListRow title="Aplicações" value={String(injections.length)} onPress={csv('aplicacoes', () => injectionsCsv(injections, pens))} />
          <ListRow title="Sintomas e notas" value={String(journal.length)} onPress={csv('diario', () => journalCsv(journal))} />
          <ListRow title="Medidas" value={plural(measured, 'medição', 'medições')} onPress={csv('medidas', () => measuresCsv(measures))} />
        </ListGroup>
        <InfoNote icon={null}>
          Os arquivos usam ponto e vírgula e vírgula decimal, o padrão do Excel e do Google Planilhas em português. O backup continua sendo o jeito de guardar tudo.
        </InfoNote>
      </View>
    </SubScreen>
  );
}
