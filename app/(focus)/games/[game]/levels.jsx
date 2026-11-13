import { useLocalSearchParams } from 'expo-router';
import { GameLevelsScreen } from '@features/games/GameLevelsScreen';

export default function Route() {
  const { game } = useLocalSearchParams();
  return <GameLevelsScreen slug={Array.isArray(game) ? game[0] : game} />;
}
