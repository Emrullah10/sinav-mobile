import { Redirect } from 'expo-router';
import { deepLinks } from '@shared/navigation/deepLinks';

// İlk açılış akışı (AUTH/ONB) sonraki adımda; şimdilik sekme kabuğu.
export default function Index() {
  return <Redirect href={deepLinks.today} />;
}
