// Fotos de progresso: antes e agora, a grade de fotos e a foto aberta em tela cheia.

import { useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePhotos, useWeights } from '@/db/hooks';
import { photoFile } from '@/db/photos';
import type { PhotoRow, WeightRow } from '@/db/queries';
import { dayNum } from '@/lib/dates';
import { ddmmyyyy, kgUnit, plural, weekdayShort } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space, viewer } from '@/theme/tokens';
import { InfoNote } from '@/ui/Bits';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/Icon';
import { IconButton } from '@/ui/IconButton';
import { SubScreen } from '@/ui/SubScreen';
import { Text } from '@/ui/Text';
import { useAddPhoto } from '@/ui/useAddPhoto';
import { confirmDelete, useDeleteWithUndo } from '@/ui/useDeleteWithUndo';

/** Pesagem mais próxima da foto, até 7 dias de distância. */
function weightNear(weights: readonly WeightRow[], at: string): WeightRow | null {
  let best: WeightRow | null = null;
  let gap = 8;
  for (const w of weights) {
    const d = Math.abs(dayNum(w.at.slice(0, 10)) - dayNum(at.slice(0, 10)));
    if (d < gap || (d === gap && best && w.at > best.at)) {
      best = w;
      gap = d;
    }
  }
  return best;
}

export default function PhotosScreen() {
  const t = useTheme();
  const photos = usePhotos();
  const weights = useWeights();
  const addPhoto = useAddPhoto();
  const [openId, setOpenId] = useState<number | null>(null);
  const list = useMemo(() => [...photos].reverse(), [photos]);
  const first = photos[0] ?? null;
  const latest = photos[photos.length - 1] ?? null;
  const open = photos.find((p) => p.id === openId) ?? null;

  const caption = (p: PhotoRow) => {
    const w = weightNear(weights, p.at);
    return `${weekdayShort(p.at)} ${ddmmyyyy(p.at.slice(0, 10))}${w ? ` · ${kgUnit(w.g)}` : ''}`;
  };

  return (
    <SubScreen
      title="Fotos de progresso"
      subtitle={photos.length ? `${plural(photos.length, 'foto', 'fotos')} · só no Leve` : 'Só no Leve, fora da galeria'}
      right={<IconButton icon="camera" label="Adicionar foto" onPress={addPhoto} />}
    >
      {first && latest && first.id !== latest.id ? (
        <Card style={{ gap: space.m }}>
          <Text variant="headline" accessibilityRole="header">
            Antes e agora
          </Text>
          <Compare left={first} right={latest} caption={caption} />
        </Card>
      ) : null}

      {list.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
          {list.map((p) => (
            <Pressable
              key={p.id}
              accessibilityRole="imagebutton"
              accessibilityLabel={`Foto de ${caption(p)}. Toque para abrir.`}
              onPress={() => setOpenId(p.id)}
              style={{ width: '31.5%', aspectRatio: 3 / 4, borderRadius: radius.field, overflow: 'hidden', backgroundColor: t.c.surface2 }}
            >
              <Image source={{ uri: photoFile(p.file).uri }} style={{ flex: 1 }} resizeMode="cover" />
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={{ gap: space.m }}>
          <InfoNote icon="camera">
            Uma foto por mês, na mesma luz, roupa e posição, mostra mudanças que a balança não conta. Elas ficam só aqui, fora da
            galeria, e vão junto no backup.
          </InfoNote>
          <Button label="Adicionar a primeira foto" icon="camera" variant="med" onPress={addPhoto} />
        </View>
      )}

      <Viewer photo={open} first={first} caption={caption} onClose={() => setOpenId(null)} />
    </SubScreen>
  );
}

function Compare({ left, right, caption }: { left: PhotoRow; right: PhotoRow; caption: (p: PhotoRow) => string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: space.s }}>
      {[left, right].map((p) => (
        <View key={p.id} style={{ flex: 1, gap: 6 }}>
          <View style={{ aspectRatio: 3 / 4, borderRadius: radius.field, overflow: 'hidden', backgroundColor: t.c.surface2 }}>
            <Image source={{ uri: photoFile(p.file).uri }} style={{ flex: 1 }} resizeMode="cover" accessibilityLabel={`Foto de ${caption(p)}`} />
          </View>
          <Text variant="caption" color="text2" style={{ textAlign: 'center' }}>
            {caption(p)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Viewer({
  photo,
  first,
  caption,
  onClose,
}: {
  photo: PhotoRow | null;
  first: PhotoRow | null;
  caption: (p: PhotoRow) => string;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const remove = useDeleteWithUndo();
  const [compare, setCompare] = useState(false);
  const canCompare = !!first && !!photo && first.id !== photo.id;
  const ink = viewer.ink;

  return (
    <Modal visible={!!photo} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {photo ? (
        <View style={{ flex: 1, backgroundColor: viewer.bg, paddingTop: insets.top + space.s, paddingBottom: insets.bottom + space.m }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.l }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={onClose} hitSlop={12} style={{ padding: 6 }}>
              <Icon name="close" size={24} color={ink} />
            </Pressable>
            <Text style={{ color: ink, fontFamily: fonts.semibold }}>{caption(photo)}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Excluir foto"
              hitSlop={12}
              style={{ padding: 6 }}
              onPress={() =>
                confirmDelete('Excluir esta foto?', undefined, () => {
                  void remove('photos', [photo.id], 'Foto excluída');
                  onClose();
                })
              }
            >
              <Icon name="trash" size={22} color={ink} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: space.l }}>
            {compare && canCompare && first ? (
              <View style={{ flexDirection: 'row', gap: space.s }}>
                {[first, photo].map((p) => (
                  <View key={p.id} style={{ flex: 1, gap: 6 }}>
                    <Image source={{ uri: photoFile(p.file).uri }} style={{ width: '100%', aspectRatio: 3 / 4 }} resizeMode="contain" />
                    <Text variant="caption" style={{ color: ink, textAlign: 'center' }}>
                      {caption(p)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Image source={{ uri: photoFile(photo.file).uri }} style={{ width: '100%', aspectRatio: 3 / 4 }} resizeMode="contain" accessibilityLabel={`Foto de ${caption(photo)}`} />
            )}
          </ScrollView>
          {canCompare ? (
            <View style={{ paddingHorizontal: space.xl }}>
              <Button label={compare ? 'Ver só esta foto' : 'Comparar com a primeira'} variant="soft" onPress={() => setCompare((v) => !v)} />
            </View>
          ) : null}
        </View>
      ) : null}
    </Modal>
  );
}
