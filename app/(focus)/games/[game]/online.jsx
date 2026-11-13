import { useLocalSearchParams } from 'expo-router';
import { GameOnlineScreen } from '@features/games/GameOnlineScreen';

export default function Route() {
  const { game } = useLocalSearchParams();
  return <GameOnlineScreen slug={Array.isArray(game) ? game[0] : game} />;
}
