import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { KeyRound, Search, UserPlus } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { Banner, Button, Card, Screen, Text, TextField, TopBar } from '@components';
import { api } from '@api';
import { apiErrorCode, errorText, unwrap } from '@shared/api/helpers';
import { useT } from '@shared/translation/useT';
import { bySlug } from './games';

/** Çevrimiçi giriş: arkadaş daveti, koda katıl, rastgele rakip. */
export function GameOnlineScreen({ slug }) {
  const { t } = useT();
  const g = bySlug(slug);
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const open = (d) => router.replace(`/games/match/${d.match.code}`);
  const fail = (e) => setError(apiErrorCode(e) === 'QUOTA_EXCEEDED' ? t('games.quotaNone') : errorText(t, e));
  const create = useMutation({ mutationFn: async () => unwrap(await api.gamesMatchCreate(g.key)), onSuccess: open, onError: fail });
  const find = useMutation({ mutationFn: async () => unwrap(await api.gamesMatchmake(g.key)), onSuccess: open, onError: fail });
  const join = useMutation({ mutationFn: async () => unwrap(await api.gamesMatchJoin(code.trim().toUpperCase())), onSuccess: open, onError: fail });
  return (
    <Screen header={<TopBar variant="standard" title={t('games.match.onlineTitle')} onBack={() => router.back()} />}>
      <View style={{ gap: 14 }}>
        <Text variant="body-m" color="secondary">{t('games.match.onlineSub')}</Text>
        {error ? <Banner tone="warning" message={error} /> : null}
        <Card style={{ gap: 10 }}>
          <Text variant="title">{t('games.match.invite')}</Text>
          <Text variant="body-s" color="secondary">{t('games.match.inviteDesc')}</Text>
          <Button title={t('games.match.invite')} leftIcon={UserPlus} loading={create.isPending} onPress={() => { setError(null); create.mutate(); }} />
        </Card>
        <Card style={{ gap: 10 }}>
          <Text variant="title">{t('games.match.findOpponent')}</Text>
          <Text variant="body-s" color="secondary">{t('games.match.findDesc')}</Text>
          <Button title={t('games.match.findOpponent')} leftIcon={Search} loading={find.isPending} onPress={() => { setError(null); find.mutate(); }} />
        </Card>
        <Card style={{ gap: 10 }}>
          <Text variant="title">{t('games.match.joinCode')}</Text>
          <TextField label={t('games.match.codeLabel')} value={code} onChangeText={(v) => setCode(v.toUpperCase())} maxLength={6} autoCapitalize="characters" autoCorrect={false} />
          <Button title={t('games.match.join')} leftIcon={KeyRound} disabled={code.trim().length !== 6} loading={join.isPending} onPress={() => { setError(null); join.mutate(); }} />
        </Card>
      </View>
    </Screen>
  );
}
