import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { LexiconSheet } from './LexiconSheet';

const LexiconContext = createContext(null);

/**
 * Dokun-çevir bağlamı (kökte bir kez). TapText açar:
 *   open({ kind: 'word', word, owner, token, sentence, sentences, index, allowSentence, onAsk })
 *   open({ kind: 'sentence', owner, sentence, sentences, index, onAsk })
 * `active` açık isteği taşır; TapText dokunulan kelimeyi / basılı tutulan cümleyi vurgular.
 * onAsk(metin): verilirse "Öğretmene sor" yeni sohbet yerine bunu çağırır (sohbet ekranında aynı sohbete gönderir).
 */
export function LexiconProvider({ children }) {
  const sheet = useRef(null);
  const [req, setReq] = useState(null);
  const open = useCallback((r) => {
    setReq(r);
    sheet.current?.present();
  }, []);
  const close = useCallback(() => sheet.current?.dismiss(), []);
  const value = useMemo(() => ({ open, close, active: req }), [open, close, req]);
  return (
    <LexiconContext.Provider value={value}>
      {children}
      <LexiconSheet ref={sheet} req={req} onSwitch={setReq} onClose={close} onDismiss={() => setReq(null)} />
    </LexiconContext.Provider>
  );
}

export const useLexicon = () => useContext(LexiconContext);
