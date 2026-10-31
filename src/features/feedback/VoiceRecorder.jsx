import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
} from 'expo-audio';
import { Mic, Pause, Play, Square, Trash2 } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Banner, Button, IconButton, Text } from '@components';
import { useHaptics } from '@hooks/useHaptics';
import { report } from '@shared/monitoring/report';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';
import { MAX_RECORD_MS, VOICE_PRESET, formatDuration, readBase64 } from './media';

/** Kaydedilen sesi dinleme satırı: oynat/durdur, süre, sil. */
function Preview({ audio, onRemove }) {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const player = useAudioPlayer(audio.uri);
  const status = useAudioPlayerStatus(player);
  const toggle = () => {
    if (status.playing) return player.pause();
    if (status.didJustFinish || (status.duration && status.currentTime >= status.duration - 0.05)) player.seekTo(0);
    return player.play();
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: radius.md, backgroundColor: colors.bg.surface, borderWidth: 1, borderColor: colors.border.default }}>
      <IconButton icon={status.playing ? Pause : Play} variant="tonal" onPress={toggle} accessibilityLabel={t(status.playing ? 'feedback.voice.pause' : 'feedback.voice.play')} />
      <Text variant="body-m" style={{ flex: 1 }}>
        {t('feedback.voice.label', { time: formatDuration(audio.durationMs) })}
      </Text>
      <IconButton icon={Trash2} onPress={onRemove} accessibilityLabel={t('feedback.voice.remove')} />
    </View>
  );
}

/**
 * Sesli anlatım: en çok 2 dakika, AAC/m4a. Bitince onChange({ uri, data(base64), durationMs }); silinince onChange(null).
 * onBusy(true|false): kayıt sürerken gönderim kapalı kalsın.
 */
export function VoiceRecorder({ value, onChange, onBusy }) {
  const { t } = useT();
  const { colors } = useTheme();
  const haptics = useHaptics();
  const recorder = useAudioRecorder(VOICE_PRESET);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState(null);
  const timer = useRef(null);
  const startedAt = useRef(0);
  const stopRef = useRef(null);

  const stop = async () => {
    clearInterval(timer.current);
    if (!recording) return;
    setRecording(false);
    try {
      await recorder.stop();
      const durationMs = Math.min(MAX_RECORD_MS, Date.now() - startedAt.current);
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (recorder.uri) onChange({ uri: recorder.uri, data: await readBase64(recorder.uri), durationMs });
    } catch (e) {
      report(e);
      setError('unsupported');
    } finally {
      onBusy?.(false);
    }
  };
  useEffect(() => {
    stopRef.current = stop;
  });

  const start = async () => {
    setError(null);
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setError('denied');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      haptics.tap();
      startedAt.current = Date.now();
      setElapsed(0);
      setRecording(true);
      onBusy?.(true);
      timer.current = setInterval(() => {
        const ms = Date.now() - startedAt.current;
        setElapsed(ms);
        if (ms >= MAX_RECORD_MS) stopRef.current?.();
      }, 250);
    } catch (e) {
      report(e);
      setError('unsupported');
    }
  };

  // Ekrandan çıkarken süren kayıt bırakılır ve ses modu eski haline döner.
  useEffect(
    () => () => {
      clearInterval(timer.current);
      setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    },
    [],
  );

  if (value) return <Preview audio={value} onRemove={() => onChange(null)} />;
  return (
    <View style={{ gap: 8 }}>
      {recording ? (
        <>
          <Text variant="label-l" style={{ color: colors.danger.fg }} accessibilityLiveRegion="polite">
            {t('feedback.voice.recording', { time: formatDuration(elapsed) })} · {t('feedback.voice.max')}
          </Text>
          <Button title={t('feedback.voice.stop')} variant="destructive" size="md" leftIcon={Square} onPress={stop} />
        </>
      ) : (
        <Button title={t('feedback.voice.record')} variant="secondary" size="md" leftIcon={Mic} onPress={start} />
      )}
      {error ? <Banner tone="warning" message={t(error === 'denied' ? 'feedback.voice.denied' : 'feedback.voice.unsupported')} /> : null}
    </View>
  );
}
