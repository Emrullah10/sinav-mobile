import { create } from 'zustand';

/**
 * Geri bildirim ekranına taşınan bağlam: sallanınca yakalanan ekran görüntüsü ve o anki rota.
 * Ekran açılınca `take()` ile bir kez alınır.
 */
export const useFeedbackStore = create((set, get) => ({
  pending: null, // { image?: { uri, data(base64 JPEG) }, screen }
  setPending: (pending) => set({ pending }),
  take: () => {
    const p = get().pending;
    set({ pending: null });
    return p;
  },
}));
