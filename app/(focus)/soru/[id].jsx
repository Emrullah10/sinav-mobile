import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { OptionBubble, Screen, Text, TopBar } from '@components';

export default function QuestionPlaceholder() {
  const { id } = useLocalSearchParams();
  return (
    <Screen
      header={
        <TopBar
          variant="focus"
          onClose={() => router.back()}
          progress={0.3}
          counter="3 / 10"
          timer="12:30"
        />
      }
    >
      <Text variant="reading-m">{`Soru ${id}`}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
        {['A', 'B', 'C', 'D', 'E'].map((l) => (
          <OptionBubble key={l} letter={l} />
        ))}
      </View>
    </Screen>
  );
}
