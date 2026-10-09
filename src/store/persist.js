import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, persist } from 'zustand/middleware';

/** AsyncStorage'a yazan zustand `persist` sarmalayıcısı. `partialize` ile yalnız veri alanları saklanır. */
export const persisted = (name, creator, partialize) =>
  persist(creator, {
    name: `sinav.${name}`,
    storage: createJSONStorage(() => AsyncStorage),
    partialize,
    version: 1,
  });
