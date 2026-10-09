import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { Banner, Button, Card, Divider, QueryBoundary, Screen, Text, TextField, TopBar, useToast } from '@components';
import { api } from '@api';
import { errorText, formatDate, unwrap } from '@shared/api/helpers';
import { signOut } from '@shared/auth/session';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { useT } from '@shared/translation/useT';

function NameCard({ account }) {
  const { t } = useT();
  const toast = useToast();
  const qc = useQueryClient();
  const [name, setName] = useState(account.displayName || '');
  const save = useMutation({
    mutationFn: async () => unwrap(await api.identityAccountUpdate({ displayName: name.trim() })),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.account.get(), (cur) => ({ ...cur, ...data }));
      toast.show({ message: t('settings.saved'), tone: 'success' });
    },
    onError: (e) => toast.show({ message: errorText(t, e), tone: 'danger' }),
  });
  return (
    <Card style={{ gap: 12 }}>
      <TextField label={t('account.name')} value={name} onChangeText={setName} maxLength={60} autoComplete="name" />
      <TextField label={t('account.email')} value={account.email || ''} disabled />
      <Button title={t('account.saveName')} size="md" fullWidth={false} loading={save.isPending} disabled={!name.trim() || name.trim() === account.displayName} onPress={() => save.mutate()} />
    </Card>
  );
}

function PasswordCard({ account }) {
  const { t } = useT();
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState(null);
  const save = useMutation({
    mutationFn: async () => api.identityAccountPasswordSet({ ...(account.hasPassword ? { currentPassword: current } : {}), newPassword: next }),
    onSuccess: () => {
      setCurrent('');
      setNext('');
      toast.show({ message: t('account.password.done'), tone: 'success' });
    },
    onError: (e) => setError(errorText(t, e)),
  });
  return (
    <Card style={{ gap: 12 }}>
      <Text variant="heading-3">{t('account.password')}</Text>
      {error ? <Banner tone="danger" message={error} /> : null}
      {account.hasPassword ? (
        <TextField label={t('account.password.current')} value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" />
      ) : null}
      <TextField label={t('account.password.new')} value={next} onChangeText={setNext} secureTextEntry autoComplete="new-password" helperText={t('auth.passwordShort')} />
      <Button
        title={account.hasPassword ? t('account.password.change') : t('account.password.set')}
        size="md"
        fullWidth={false}
        loading={save.isPending}
        disabled={next.length < 8 || (account.hasPassword && !current)}
        onPress={() => { setError(null); save.mutate(); }}
      />
    </Card>
  );
}

function DataCard() {
  const { t } = useT();
  const toast = useToast();
  const qc = useQueryClient();
  const exportQuery = useQuery({
    queryKey: ['account', 'dataExport'],
    queryFn: async () => {
      const d = unwrap(await api.identityDataExportGet());
      return d?.export ?? d ?? null;
    },
  });
  const request = useMutation({
    mutationFn: async () => unwrap(await api.identityDataExportRequest()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account', 'dataExport'] });
      toast.show({ message: t('account.export.sent'), tone: 'success' });
    },
    onError: (e) => toast.show({ message: errorText(t, e), tone: 'danger' }),
  });
  const status = exportQuery.data?.status;
  return (
    <Card style={{ gap: 8 }}>
      <Text variant="heading-3">{t('account.data')}</Text>
      {status ? <Text variant="body-s" color="secondary">{t('account.export.status', { status: t(`account.export.status.${status}`) })}</Text> : null}
      <Button title={t('account.export')} variant="secondary" size="md" fullWidth={false} loading={request.isPending} disabled={status === 'requested' || status === 'processing'} onPress={() => request.mutate()} />
    </Card>
  );
}

function DeleteCard({ account }) {
  const { t, language } = useT();
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [scheduled, setScheduled] = useState(account.deletionScheduledFor || null);
  const send = useMutation({
    mutationFn: async () => api.identityAccountDeletionCode(),
    onSuccess: () => setSent(true),
    onError: (e) => setError(errorText(t, e)),
  });
  const confirm = useMutation({
    mutationFn: async () => unwrap(await api.identityAccountDeletionRequest({ code: code.replace(/\s/g, '') })),
    onSuccess: async (res) => {
      setScheduled(res.scheduledFor);
      await signOut();
      router.replace('/giris');
    },
    onError: (e) => setError(errorText(t, e)),
  });
  return (
    <Card style={{ gap: 12 }}>
      <Text variant="heading-3" color="danger">{t('account.delete')}</Text>
      <Text variant="body-s" color="secondary">{t('account.delete.warn')}</Text>
      <Text variant="caption" color="tertiary">{t('account.delete.storeNote')}</Text>
      {scheduled ? <Banner tone="warning" message={t('account.delete.scheduled', { date: formatDate(scheduled, language, { day: 'numeric', month: 'long', year: 'numeric' }) })} /> : null}
      {error ? <Banner tone="danger" message={error} /> : null}
      {sent ? (
        <>
          <TextField label={t('account.delete.code')} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={7} />
          <Button title={t('account.delete.confirm')} variant="destructive" size="md" fullWidth={false} loading={confirm.isPending} disabled={code.replace(/\s/g, '').length < 6} onPress={() => { setError(null); confirm.mutate(); }} />
        </>
      ) : (
        <Button title={t('account.delete.sendCode')} variant="secondary" size="md" fullWidth={false} loading={send.isPending} onPress={() => { setError(null); send.mutate(); }} />
      )}
    </Card>
  );
}

export default function AccountScreen() {
  const { t } = useT();
  const query = useQuery({
    queryKey: queryKeys.account.get(),
    queryFn: async () => unwrap(await api.identityAccountGet()),
  });
  return (
    <Screen header={<TopBar title={t('account.title')} onBack={() => router.back()} />} edges={['bottom']}>
      <QueryBoundary query={query}>
        {(account) =>
          account.isGuest ? (
            <Banner tone="info" message={t('account.guestNote')} />
          ) : (
            <View style={{ gap: 16 }}>
              <NameCard account={account} />
              <PasswordCard account={account} />
              <DataCard />
              <Divider />
              <DeleteCard account={account} />
            </View>
          )
        }
      </QueryBoundary>
    </Screen>
  );
}
