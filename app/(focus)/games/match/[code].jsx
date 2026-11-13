import { useLocalSearchParams } from 'expo-router';
import { MatchScreen } from '@features/games/MatchScreen';

export default function Route() {
  const { code } = useLocalSearchParams();
  return <MatchScreen code={Array.isArray(code) ? code[0] : code} />;
}
