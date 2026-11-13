import { Redirect, useLocalSearchParams } from 'expo-router';
import { bySlug } from '@features/games/games';
import { GameBody } from '@features/games/GameBody';

const one = (v) => (Array.isArray(v) ? v[0] : v);

export default function GameRoute() {
  const { game, kind, level, t } = useLocalSearchParams();
  const g = bySlug(one(game));
  if (!g || !g.ready) return <Redirect href="/games" />;
  const kd = one(kind);
  const k = kd === 'daily' || kd === 'level' || kd === 'marathon' ? kd : 'free';
  const lv = k === 'level' ? Number(one(level)) || 1 : undefined;
  return <GameBody g={g} kind={k} level={lv} tick={one(t) || ''} />;
}
