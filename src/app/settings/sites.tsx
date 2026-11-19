import { useSQLiteContext } from 'expo-sqlite';
import { View } from 'react-native';

import type { Site } from '@/db/queries';
import { saveSetting, useSettings } from '@/db/settings';
import { SITE_ORDER } from '@/domain/sites';
import { SITE_LABEL, SITE_NAME } from '@/lib/labels';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { InfoNote } from '@/ui/Bits';
import { BodyMap } from '@/ui/BodyMap';
import { Chip } from '@/ui/Chip';
import { SectionLabel } from '@/ui/List';
import { SubScreen } from '@/ui/SubScreen';
import { useToast } from '@/ui/Toast';

const GROUPS: { title: string; sites: Site[] }[] = [
  { title: 'Abdômen', sites: ['AE', 'AD'] },
  { title: 'Coxas (frente)', sites: ['CE', 'CD'] },
  { title: 'Braços (parte de cima)', sites: ['BE', 'BD'] },
];

export default function SitesScreen() {
  const t = useTheme();
  const db = useSQLiteContext();
  const toast = useToast();
  const { sites } = useSettings();

  const toggle = (site: Site) => {
    const on = sites.includes(site);
    if (on && sites.length === 1) {
      toast.show({ message: 'Deixe pelo menos um local no rodízio.' });
      return;
    }
    const next = on ? sites.filter((s) => s !== site) : SITE_ORDER.filter((s) => s === site || sites.includes(s));
    void saveSetting(db, 'sites', next);
  };

  const fills: Partial<Record<Site, string>> = {};
  for (const s of sites) fills[s] = t.c.med;

  return (
    <SubScreen title="Locais que uso" subtitle="O rodízio sugere sempre o local que descansou mais">
      <View style={{ flexDirection: 'row', gap: space.xl, alignItems: 'center' }}>
        <BodyMap fills={fills} width={120} />
        <View style={{ flex: 1, gap: space.l }}>
          {GROUPS.map((g) => (
            <View key={g.title} style={{ gap: space.s }}>
              <SectionLabel>{g.title}</SectionLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
                {g.sites.map((s) => (
                  <Chip
                    key={s}
                    label={SITE_LABEL[s].endsWith('E') ? 'Esquerdo' : 'Direito'}
                    accessibilityLabel={SITE_NAME[s]}
                    selected={sites.includes(s)}
                    onPress={() => toggle(s)}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      </View>
      <InfoNote>
        A bula indica abdômen (a 5 cm do umbigo), coxas (frente) e braços (parte de cima). No mapa, o lado esquerdo do corpo aparece à esquerda, como num espelho.
      </InfoNote>
    </SubScreen>
  );
}
