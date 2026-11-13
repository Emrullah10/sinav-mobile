import { useLocalSearchParams } from 'expo-router';
import { GameLeaderboardScreen } from '@features/games/GameLeaderboardScreen';

export default function Route() {
  const { game } = useLocalSearchParams();
  return <GameLeaderboardScreen slug={Array.isArray(game) ? game[0] : game} />;
}
