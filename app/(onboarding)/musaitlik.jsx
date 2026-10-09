import { router } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Minus, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { Banner, Button, IconButton, QueryBoundary, Screen, Text, TopBar } from '@components';
import { api } from '@api';
import { errorText, unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { deepLinks } from '@shared/navigation/deepLinks';
import { useT } from '@shared/translation/useT';

const STEP = 15;
const MAX = 240;
const DEFAULT_DAYS = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, minutes: weekday > 5 ? 60 : 30 }));

export default function Availability() {
  const { t } = useT();
  const [edited, setDays] = useState(null);
  const [error, setError] = useState(null);
  const query = useQuery({
    queryKey: queryKeys.learning.availability(),
    queryFn: async () => unwrap(await api.learningAvailabilityGet()).days,
  });
  const days = edited ?? (query.data ? (query.data.length ? query.data : DEFAULT_DAYS) : null);

  const save = useMutation({
    mutationFn: async () => api.learningAvailabilitySave(days),
    onSuccess: () => router.replace(deepLinks.diagnostic),
    onError: (e) => setError(errorText(t, e)),
  });

  const total = (days || []).reduce((s, d) => s + d.minutes, 0);
  const change = (weekday, delta) =>
    setDays((cur) => (cur ?? days).map((d) => (d.weekday === weekday ? { ...d, minutes: Math.max(0, Math.min(MAX, d.minutes + delta)) } : d)));

  return (
    <Screen
      header={<TopBar title={t('onb.step', { n: 2, total: 3 })} onBack={() => router.back()} />}
      edges={['bottom']}
      footer={<Button title={t('onb.save')} onPress={() => { setError(null); save.mutate(); }} loading={save.isPending} disabled={!days || total === 0} />}
    >
      <View style={{ gap: 4, marginBottom: 16 }}>
        <Text variant="display-m" accessibilityRole="header">
          {t('onb.avail.title')}
        </Text>
        <Text variant="body-l" color="secondary">
          {t('onb.avail.subtitle')}
        </Text>
      </View>
      {error ? <Banner tone="danger" message={error} style={{ marginBottom: 12 }} /> : null}
      <QueryBoundary query={query}>
        {() => (
          <View style={{ gap: 4 }}>
            {(days || []).map((d) => (
              <View key={d.weekday} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 56, gap: 8 }}>
                <Text variant="title" style={{ flex: 1 }}>
                  {t(`day.${d.weekday}`)}
                </Text>
                <IconButton icon={Minus} accessibilityLabel={t('onb.avail.less', { day: t(`day.${d.weekday}`) })} onPress={() => change(d.weekday, -STEP)} disabled={d.minutes <= 0} />
                <Text variant="numeric-m" style={{ minWidth: 72, textAlign: 'center' }}>
                  {d.minutes === 0 ? t('onb.avail.rest') : t('onb.avail.minutes', { n: d.minutes })}
                </Text>
                <IconButton icon={Plus} accessibilityLabel={t('onb.avail.more', { day: t(`day.${d.weekday}`) })} onPress={() => change(d.weekday, STEP)} disabled={d.minutes >= MAX} />
              </View>
            ))}
            <Text variant="label-m" color="secondary" style={{ marginTop: 12 }}>
              {t('onb.avail.total', { h: Math.floor(total / 60), m: total % 60 })}
            </Text>
          </View>
        )}
      </QueryBoundary>
    </Screen>
  );
}
