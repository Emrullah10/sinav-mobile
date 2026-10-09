import { Redirect, useLocalSearchParams } from 'expo-router';

// deepLinks.exam(id): form koduyla gelen bağlantı kural ekranına yönlenir.
export default function ExamLink() {
  const { id } = useLocalSearchParams();
  return <Redirect href={`/deneme/form/${id}`} />;
}
