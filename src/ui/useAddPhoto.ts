// "Adicionar foto": escolher entre câmera e galeria, reduzir e gravar, com "Desfazer".

import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback } from 'react';
import { Alert, Linking } from 'react-native';

import { savePhoto } from '@/db/photos';
import { deleteRow } from '@/db/queries';
import { toStamp } from '@/lib/dates';

import { useToast } from './Toast';

/** "2026:11:19 08:12:33" (EXIF) → '2026-11-19 08:12'; null se não der para ler. */
function exifStamp(exif: Record<string, unknown> | null | undefined): string | null {
  const raw = exif?.DateTimeOriginal ?? exif?.DateTime;
  if (typeof raw !== 'string') return null;
  const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})/.exec(raw);
  return m ? `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}` : null;
}

export function useAddPhoto(): () => void {
  const db = useSQLiteContext();
  const toast = useToast();

  const pick = useCallback(
    async (source: 'camera' | 'library') => {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Sem acesso à câmera', 'Permita a câmera nas configurações do app, ou escolha uma foto da galeria.', [
            { text: 'Agora não', style: 'cancel' },
            { text: 'Abrir configurações', onPress: () => void Linking.openSettings() },
          ]);
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, exif: source === 'library' };
      const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      const asset = result.canceled ? null : result.assets[0];
      if (!asset) return;
      const now = toStamp(new Date());
      const at = source === 'library' ? (exifStamp(asset.exif) ?? now) : now;
      const id = await savePhoto(db, { uri: asset.uri, width: asset.width, height: asset.height }, at > now ? now : at);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show({ message: 'Foto guardada no Leve.', actionLabel: 'Desfazer', onAction: () => void deleteRow(db, 'photos', id) });
    },
    [db, toast],
  );

  return useCallback(() => {
    const go = (source: 'camera' | 'library') => () =>
      void pick(source).catch(() => toast.show({ message: 'Não deu para guardar a foto. Tente de novo.' }));
    Alert.alert('Foto de progresso', 'Ela fica só no Leve, fora da galeria do celular.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Galeria', onPress: go('library') },
      { text: 'Câmera', onPress: go('camera') },
    ]);
  }, [pick, toast]);
}
