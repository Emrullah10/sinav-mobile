import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { Banner, Button, Chip, Screen, Text, TextField, TopBar } from '@components';
import { api } from '@api';
import { errorText } from '@shared/api/helpers';
import { useAuthStore } from '@shared/auth/authStore';
import { APP_VERSION, PLATFORM } from '@shared/constant/config';
import { useT } from '@shared/translation/useT';

const TOPICS = ['account', 'payment', 'plan', 'tutor', 'exam_info', 'content_error', 'other'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Yardım ve destek: iletişim formu (misafir de gönderebilir). */
export default function Support() {
  const { t } = useT();
  const user = useAuthStore((s) => s.user);
  const authed = useAuthStore((s) => s.status === 'authenticated');
  const isGuest = useAuthStore((s) => s.isGuest);
  const [email, setEmail] = useState(user?.email || '');
  const [topic, setTopic] = useState('other');
  const [body, setBody] = useState('');
  const send = useMutation({
    mutationFn: async () => {
      const payload = {
        email: email.trim(),
        topic,
        body: body.trim(),
        platform: PLATFORM,
        appVersion: APP_VERSION,
      };
      return authed && !isGuest
        ? api.identityContactSend(payload)
        : api.identityPublicContactSend(payload);
    },
  });
  const valid = EMAIL.test(email.trim()) && body.trim().length >= 5;
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (send.isSuccess) {
    return (
      <Screen header={<TopBar title={t('support.title')} onBack={back} />} edges={['bottom']}>
        <View style={{ gap: 16 }}>
          <Banner tone="success" title={t('support.sentTitle')} message={t('support.sentBody')} />
          <Button title={t('support.done')} onPress={back} />
        </View>
      </Screen>
    );
  }
  return (
    <Screen
      header={<TopBar title={t('support.title')} onBack={back} />}
      edges={['bottom']}
      footer={
        <Button
          title={t('support.send')}
          disabled={!valid}
          loading={send.isPending}
          onPress={() => send.mutate()}
        />
      }
    >
      <View style={{ gap: 16 }}>
        <Text variant="body-m" color="secondary">
          {t('support.intro')}
        </Text>
        {send.isError ? <Banner tone="danger" message={errorText(t, send.error)} /> : null}
        <TextField
          label={t('support.email')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <View style={{ gap: 8 }}>
          <Text variant="label-m" color="secondary">
            {t('support.topic')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TOPICS.map((k) => (
              <Chip
                key={k}
                label={t(`support.topic.${k}`)}
                selected={topic === k}
                onPress={() => setTopic(k)}
              />
            ))}
          </View>
        </View>
        <TextField
          label={t('support.body')}
          value={body}
          onChangeText={setBody}
          multiline
          maxLength={5000}
        />
      </View>
    </Screen>
  );
}
