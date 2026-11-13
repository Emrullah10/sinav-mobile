import { useLocalSearchParams } from 'expo-router';
import { JoinScreen } from '@features/games/MatchScreen';

export default function Route() {
  const { code } = useLocalSearchParams();
  return <JoinScreen code={Array.isArray(code) ? code[0] : code} />;
}
