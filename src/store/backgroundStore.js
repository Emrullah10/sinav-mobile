import { create } from 'zustand';
import { BG_DEFAULT_SELECTION } from '@shared/vendor/domain/index.js';
import { persisted } from './persist';

/**
 * Uygulama arka planı (sunucuda da saklanır: identity preferences). Açılışta titreme olmasın diye yerelde de tutulur.
 * draft: Desen stüdyosundayken ekranlarda canlı önizleme; kalıcı değildir, stüdyodan çıkınca temizlenir.
 */
export const useBackgroundStore = create(
  persisted(
    'background',
    (set) => ({
      selection: BG_DEFAULT_SELECTION,
      custom: [],
      locked: false,
      draft: null,
      apply: (p) => {
        if (!p || !('background' in p)) return;
        set({
          selection: p.background || BG_DEFAULT_SELECTION,
          custom: p.customBackgrounds || [],
          locked: !!p.backgroundLocked,
        });
      },
      setSelection: (selection) => set({ selection }),
      setDraft: (draft) => set({ draft }),
    }),
    (s) => ({ selection: s.selection, custom: s.custom, locked: s.locked }),
  ),
);
