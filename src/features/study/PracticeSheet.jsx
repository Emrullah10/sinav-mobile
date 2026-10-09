import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { forwardRef, useState } from 'react';
import { View } from 'react-native';
import { Banner, Button, Chip, Sheet, Skeleton, Text } from '@components';
import { api } from '@api';
import { apiErrorCode, errorText, unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { deepLinks } from '@shared/navigation/deepLinks';
import { useT } from '@shared/translation/useT';

/**
 * Alıştırma ayarı alt sayfası. Props: questionTypeKeys, skillKeys (boşsa karışık). Başlatınca /soru/<kod>.
 */
export const PracticeSheet = forwardRef(function PracticeSheet({ questionTypeKeys, skillKeys }, ref) {
  const { t } = useT();
  const options = useQuery({
    queryKey: queryKeys.learning.practiceOptions(),
    queryFn: async () => unwrap(await api.learningPracticeOptionsGet()),
  });
  const [count, setCount] = useState(null);
  const [mode, setMode] = useState(null);
  const [difficulty, setDifficulty] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const o = options.data;

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = unwrap(
        await api.learningPracticeSessionCreate({
          ...(questionTypeKeys?.length ? { questionTypeKeys } : {}),
          ...(skillKeys?.length ? { skillKeys } : {}),
          count: count ?? o.defaults.count,
          mode: mode ?? o.defaults.mode,
          difficulty: difficulty ?? o.defaults.difficulty,
        }),
      );
      ref.current?.dismiss();
      router.push(deepLinks.question(res.code));
    } catch (e) {
      const code = apiErrorCode(e);
      setError(
        code === 'QUOTA_EXCEEDED' ? t('practice.quota') : code === 'PRACTICE_NO_QUESTIONS' ? t('practice.noQuestions') : errorText(t, e),
      );
    } finally {
      setBusy(false);
    }
  };

  const currentMode = mode ?? o?.defaults.mode;
  return (
    <Sheet ref={ref} title={t('practice.title')}>
      {options.isPending ? (
        <Skeleton height={160} />
      ) : options.isError ? (
        <Banner tone="danger" message={errorText(t, options.error)} />
      ) : (
        <View style={{ gap: 16 }}>
          {error ? <Banner tone="warning" message={error} /> : null}
          <Text variant="body-s" color="secondary">
            {t('practice.remaining', { n: o.usage?.remaining ?? '∞' })}
          </Text>
          <View style={{ gap: 8 }}>
            <Text variant="label-m" color="secondary">{t('practice.count')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {o.counts.map((c) => (
                <Chip key={c} label={String(c)} selected={(count ?? o.defaults.count) === c} onPress={() => setCount(c)} />
              ))}
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <Text variant="label-m" color="secondary">{t('practice.mode')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {o.modes.map((m) => (
                <Chip key={m} label={t(`enums.study_mode.${m}`)} selected={currentMode === m} onPress={() => setMode(m)} />
              ))}
            </View>
            <Text variant="caption" color="tertiary">
              {currentMode === 'learning' ? t('practice.modeHint.learning') : t('practice.modeHint.other')}
            </Text>
          </View>
          <View style={{ gap: 8 }}>
            <Text variant="label-m" color="secondary">{t('practice.difficulty')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {o.difficulties.map((d) => (
                <Chip key={d} label={t(`difficulty.${d}`)} selected={(difficulty ?? o.defaults.difficulty) === d} onPress={() => setDifficulty(d)} />
              ))}
            </View>
          </View>
          <Button title={t('practice.start')} onPress={start} loading={busy} />
        </View>
      )}
    </Sheet>
  );
});
