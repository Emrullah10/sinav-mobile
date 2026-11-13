import { useMutation } from '@tanstack/react-query';
import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Camera, ImagePlus, X } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Banner, Button, Chip, Screen, Text, TextField, TopBar, useToast } from '@components';
import { api } from '@api';
import { errorText } from '@shared/api/helpers';
import { APP_VERSION, PLATFORM } from '@shared/constant/config';
import { report } from '@shared/monitoring/report';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';
import { useFeedbackStore } from '@features/feedback/feedbackStore';
import { MAX_IMAGES, compressImage } from '@features/feedback/media';
import { VoiceRecorder } from '@features/feedback/VoiceRecorder';

const KINDS = ['bug', 'suggestion', 'other'];

const deviceContext = () => ({
  model: [Device.manufacturer, Device.modelName].filter(Boolean).join(' '),
  os: `${Device.osName || PLATFORM} ${Device.osVersion || ''}`.trim(),
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
});

/** Geri bildirim (hata / öneri / diğer): metin, en çok 3 fotoğraf (sallayınca alınan ekran görüntüsü dahil), 1 sesli kayıt. */
export default function FeedbackScreen() {
  const { t, i18n } = useT();
  const { colors, radius } = useTheme();
  const toast = useToast();
  const [ctx] = useState(() => useFeedbackStore.getState().take()); // { image, screen } | null (sallayınca)
  const [kind, setKind] = useState('bug');
  const [message, setMessage] = useState('');
  // Sallayınca yakalanan (önceden küçültülmüş) ekran görüntüsü ilk ek olarak gelir.
  const [images, setImages] = useState(() => (ctx?.image ? [{ id: 'screenshot', ...ctx.image, source: 'screenshot' }] : [])); // { id, uri, data, source }
  const [audio, setAudio] = useState(null);
  const [recording, setRecording] = useState(false);
  const [working, setWorking] = useState(false);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const addImage = async (asset, source) => {
    try {
      const img = await compressImage(asset);
      setImages((list) => (list.length >= MAX_IMAGES ? list : [...list, { id: `${Date.now()}-${list.length}`, ...img, source }]));
    } catch (e) {
      report(e);
      toast.show({ message: t('feedback.attach.unreadable'), tone: 'danger' });
    }
  };

  const pick = async (source) => {
    if (images.length >= MAX_IMAGES) return toast.show({ message: t('feedback.attach.limit') });
    setWorking(true);
    try {
      const camera = source === 'camera';
      const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : { granted: true };
      if (!perm.granted) return toast.show({ message: t('feedback.camera.denied'), tone: 'danger' });
      const opts = { mediaTypes: ['images'], quality: 0.9, exif: false };
      const res = camera
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync({ ...opts, allowsMultipleSelection: true, selectionLimit: MAX_IMAGES - images.length });
      if (res.canceled) return undefined;
      for (const a of res.assets.slice(0, MAX_IMAGES - images.length)) await addImage(a, source);
    } catch (e) {
      report(e);
      toast.show({ message: t('feedback.attach.unreadable'), tone: 'danger' });
    } finally {
      setWorking(false);
    }
    return undefined;
  };

  const send = useMutation({
    mutationFn: () =>
      api.identityFeedbackSend(
        {
          kind,
          message: message.trim(),
          screen: ctx?.screen || null,
          platform: PLATFORM,
          appVersion: APP_VERSION,
          locale: i18n.language,
          context: deviceContext(),
          attachments: [
            ...images.map((i) => ({ data: i.data, source: i.source })),
            ...(audio ? [{ data: audio.data, durationMs: audio.durationMs }] : []),
          ],
        },
        { timeout: 90000 },
      ),
  });
  const valid = message.trim().length >= 3 || images.length > 0 || !!audio;
  const full = images.length >= MAX_IMAGES;

  if (send.isSuccess) {
    return (
      <Screen header={<TopBar title={t('feedback.title')} onBack={back} />} edges={['bottom']}>
        <View style={{ gap: 16 }}>
          <Banner tone="success" title={t('feedback.sent.title')} message={t('feedback.sent.body')} />
          <Button title={t('feedback.sent.done')} onPress={back} />
        </View>
      </Screen>
    );
  }
  return (
    <Screen
      header={<TopBar title={t('feedback.title')} onBack={back} />}
      edges={['bottom']}
      footer={
        <Button title={t('feedback.send')} disabled={!valid || recording || working} loading={send.isPending} onPress={() => send.mutate()} />
      }
    >
      <View style={{ gap: 16 }}>
        <Text variant="body-m" color="secondary">
          {t('feedback.intro')}
        </Text>
        {send.isError ? <Banner tone="danger" message={errorText(t, send.error)} /> : null}

        <View style={{ gap: 8 }}>
          <Text variant="label-m" color="secondary">
            {t('feedback.kindLabel')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {KINDS.map((k) => (
              <Chip key={k} label={t(`feedback.kind.${k}`)} selected={kind === k} onPress={() => setKind(k)} />
            ))}
          </View>
        </View>

        <TextField label={t(`feedback.message.${kind}`)} value={message} onChangeText={setMessage} multiline maxLength={5000} />

        <View style={{ gap: 8 }}>
          <Text variant="label-m" color="secondary">
            {t('feedback.attach.title')}
          </Text>
          {images.some((i) => i.source === 'screenshot') ? (
            <Text variant="caption" color="tertiary">
              {t('feedback.attach.auto')}
            </Text>
          ) : null}
          {images.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {images.map((img, i) => (
                <View key={img.id} style={{ width: 96, height: 96, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border.default }}>
                  <Image source={{ uri: img.uri }} style={{ width: '100%', height: '100%' }} accessibilityLabel={t('feedback.attach.photo', { n: i + 1 })} />
                  <Pressable
                    onPress={() => setImages((list) => list.filter((x) => x.id !== img.id))}
                    accessibilityRole="button"
                    accessibilityLabel={t('feedback.attach.remove')}
                    hitSlop={8}
                    style={{ position: 'absolute', top: 4, right: 4, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg.scrim }}
                  >
                    <X size={16} color={colors.text.inverse} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title={t('feedback.attach.camera')} variant="secondary" size="md" leftIcon={Camera} disabled={full || working} onPress={() => pick('camera')} style={{ flex: 1 }} />
            <Button title={t('feedback.attach.library')} variant="secondary" size="md" leftIcon={ImagePlus} disabled={full || working} onPress={() => pick('library')} style={{ flex: 1 }} />
          </View>
          <VoiceRecorder value={audio} onChange={setAudio} onBusy={setRecording} />
          <Text variant="caption" color="tertiary">
            {t('feedback.attach.hint')}
          </Text>
        </View>

        <Text variant="caption" color="tertiary">
          {t('feedback.context')}
        </Text>
      </View>
    </Screen>
  );
}
