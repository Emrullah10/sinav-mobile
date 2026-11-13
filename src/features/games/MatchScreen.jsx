import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Share2 } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Share, View } from 'react-native';
import { Banner, BubbleLoader, Button, Card, Screen, Text, TopBar } from '@components';
import { api } from '@api';
import { errorText, unwrap } from '@shared/api/helpers';
import { useT } from '@shared/translation/useT';
import { registerPushToken } from '@shared/notifications/push';
import { useMatchPlay } from './useMatchPlay';
import { byKey } from './games';
import { GameBody } from './GameBody';

const PUBLIC = process.env.EXPO_PUBLIC_WEB_URL || 'https://odaksinav.com.tr';

function Waiting({ match, onCancel, cancelling }) {
  const { t } = useT();
  const invite = match.origin === 'invite';
  const link = `${PUBLIC}/games/join/${match.inviteCode}`;
  return (
    <Card style={{ gap: 14, alignItems: 'center', marginTop: 16 }}>
      {invite ? (
        <>
          <Text variant="heading-3">{t('games.match.invite')}</Text>
          <Text variant="display-s" style={{ letterSpacing: 6, fontSize: 36, fontWeight: '800' }} accessibilityLabel={t('games.match.codeLabel')}>{match.inviteCode}</Text>
          <Text variant="body-m" color="secondary" align="center">{t('games.match.waitingFriend')}</Text>
          <View style={{ gap: 8, alignSelf: 'stretch' }}>
            <Button title={t('games.match.shareInvite')} leftIcon={Share2} onPress={() => Share.share({ message: link })} />
          </View>
        </>
      ) : (
        <>
          <BubbleLoader label={t('games.match.searching')} />
          <Text variant="body-s" color="secondary" align="center">{t('games.match.searchingNote')}</Text>
        </>
      )}
      <Button title={t('games.match.cancel')} variant="tertiary" loading={cancelling} onPress={onCancel} />
    </Card>
  );
}

/** Maç ekranı: bekleme odası → oyun (mevcut oyun ekranları `matchCode` ile maç modunda çalışır). */
export function MatchScreen({ code }) {
  const { t } = useT();
  const qc = useQueryClient();
  const { match, error } = useMatchPlay(code);
  const isTurn = match?.mode === 'turn';
  // Sıralı maçta rakibin hamlesi için bildirim izni iste (bir kez, maç ekranında).
  useEffect(() => { if (isTurn) registerPushToken({ ask: true, locale: undefined }); }, [isTurn]);
  const cancel = useMutation({
    mutationFn: async () => unwrap(await api.gamesMatchmakeCancel(code)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['games'] }); router.replace('/games'); },
  });
  const header = <TopBar variant="standard" title={t('games.match.label')} onBack={() => router.back()} />;
  if (error) return <Screen header={header}><Banner tone="warning" message={errorText(t, error)} /></Screen>;
  if (!match) return <Screen header={header}><BubbleLoader label={t('games.loading')} /></Screen>;
  const g = byKey(match.game);
  if (!g) return <Screen header={header}><Banner tone="warning" message={t('apiErrors.GAMES_MATCH_NOT_FOUND')} /></Screen>;
  if (match.status === 'waiting') return <Screen header={header}><Waiting match={match} onCancel={() => cancel.mutate()} cancelling={cancel.isPending} /></Screen>;
  if (match.status === 'expired' && !match.me) return <Screen header={header}><Banner tone="warning" message={t('games.match.expired')} /></Screen>;
  return (
    <GameBody g={g} kind="match" matchCode={match.code} />
  );
}

/** /games/join/CODE: davete katıl, maç ekranına geç. */
export function JoinScreen({ code }) {
  const { t } = useT();
  const joined = useRef(false);
  const join = useMutation({
    mutationFn: async () => unwrap(await api.gamesMatchJoin(code)),
    onSuccess: (d) => router.replace(`/games/match/${d.match.code}`),
  });
  useEffect(() => {
    if (!joined.current) { joined.current = true; join.mutate(); }
  }, [join]);
  const header = <TopBar variant="standard" title={t('games.match.label')} onBack={() => router.replace('/games')} />;
  if (join.isError) return <Screen header={header}><Banner tone="warning" message={errorText(t, join.error)} /></Screen>;
  return <Screen header={header}><BubbleLoader label={t('games.match.joining')} /></Screen>;
}
