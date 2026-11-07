import { createAudioPlayer, preload, setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@api';
import { unwrap } from '@shared/api/helpers';
import { API_BASE_URL } from '@shared/constant/config';
import { looksEnglish, splitSentences } from '@shared/vendor/domain/lexicon-text.js';

// Görünen hız etiketleri. Yapay zekâ sesi (audio) doğal hızında üretilir, oynatıcı hızı değişir;
// cihaz sesinin (speech) 1.0'ı okuma için hızlı olduğundan 1× orada 0.88'dir.
export const READ_RATES = [
  { label: '0,8', audio: 0.8, speech: 0.72 },
  { label: '1', audio: 1, speech: 0.88 },
  { label: '1,2', audio: 1.2, speech: 1.04 },
];
// Hız ve ipucu oturum boyunca hatırlanır.
let savedRate = 1;
let tipClosed = false;
// Sıradaki birkaç cümlenin sesi önceden istenir: sunucu üretip saklar, cümle arası beklenmez.
const AHEAD = 2;
// Ses adresi bu kadar dakika kala yenilenir (sunucuda 6 saat geçerli).
const URL_MARGIN_MS = 10 * 60 * 1000;
const voiceCache = new Map();

/** Cihaz sesi (yedek): dil için en iyi ses → { id, tier }. Eğlence sesleri (com.apple.speech.synthesis) seçilmez. */
const voiceFor = (language) => {
  if (!voiceCache.has(language)) {
    const want = language.toLowerCase();
    const score = (v) => {
      const id = String(v.identifier || '').toLowerCase();
      if (id.includes('speech.synthesis') || id.includes('eloquence')) return -1;
      if (id.includes('.premium.')) return 3;
      if (id.includes('.enhanced.') || v.quality === Speech.VoiceQuality.Enhanced) return 2;
      return 0;
    };
    voiceCache.set(language, Speech.getAvailableVoicesAsync()
      .then((voices) => {
        const best = voices
          .filter((v) => String(v.language || '').replace('_', '-').toLowerCase() === want && score(v) > 0)
          .sort((a, b) => score(b) - score(a))[0];
        return best ? { id: best.identifier, tier: score(best) === 3 ? 'premium' : 'enhanced' } : { id: undefined, tier: 'basic' };
      })
      .catch(() => ({ id: undefined, tier: 'basic' })));
  }
  return voiceCache.get(language);
};

/** Bölüm → okunacak birimler (blok blok cümleler). sentence, TapText'in aynı metinden hesapladığı sıradır (vurgu ve sunucu adresi için). */
const unitsOf = (blocks, lang) => {
  const out = [];
  (blocks || []).forEach((b, block) => {
    splitSentences(String(b.x || '')).forEach((s, sentence) => {
      if (/[\p{L}\p{N}]/u.test(s.text)) out.push({ block, sentence, text: s.text, english: lang === 'en' || looksEnglish(s.text) });
    });
  });
  return out;
};

/**
 * React dışı okuma motoru. Cümleler sırayla çalınır: İngilizce cümle sunucunun yapay zekâ sesiyle (expo-audio),
 * diğerleri ve sunucu ulaşılamazsa cihaz sesiyle (expo-speech). Geri çağrılar eski oturumu (gen) tanır ve yok sayar.
 * emit({ status?, at?, rate?, voiceTier?, tipClosed?, mode? }).
 */
const createEngine = (emit) => {
  const s = {
    units: [], lang: 'en', code: null, position: null, title: '', onEnd: null,
    gen: 0, at: -1, status: 'idle', rate: savedRate, mode: 'cloud', base: null, voiceTier: null, player: null, active: null,
  };
  const set = (patch) => {
    Object.assign(s, patch);
    emit(patch);
  };
  const rate = () => READ_RATES[s.rate] || READ_RATES[1];

  // Bölümün ses tabanı (süreli imzalı adres). Alınamazsa null → cihaz sesi.
  const baseUrl = async () => {
    if (s.base && s.base.code === s.code && s.base.position === s.position && s.base.until > Date.now()) return s.base.url;
    const data = unwrap(await api.contentReadingSpeechUrl(s.code, s.position));
    s.base = { code: s.code, position: s.position, url: `${API_BASE_URL}${data.url}`, until: new Date(data.expiresAt).getTime() - URL_MARGIN_MS };
    return s.base.url;
  };
  const uriOf = (base, u) => `${base}/${u.block}/${u.sentence}`;

  const releasePlayer = () => {
    const p = s.player;
    s.player = null;
    if (!p) return;
    try {
      p.pause();
      p.remove();
    } catch { /* zaten bırakılmış */ }
  };

  // Her cümle kendi oynatıcısıyla çalar (iOS'ta boş oynatıcıda replace() yerel istisna fırlatıyor).
  // Önceden yüklenen kaynak (preload) createAudioPlayer'da kullanılır, bekleme olmaz.
  const playUri = (uri, i, g) => {
    releasePlayer();
    const p = createAudioPlayer({ uri }, { updateInterval: 250 });
    s.player = p;
    s.active = { i, g };
    p.addListener('playbackStatusUpdate', (st) => {
      const cur = s.active;
      if (s.player !== p || !cur || cur.g !== s.gen) return;
      if (st.didJustFinish) {
        s.active = null;
        play(cur.i + 1, cur.g);
      } else if (st.error) {
        // Bu cümlenin sesi gelmedi: aynı cümleden cihaz sesiyle sürer.
        s.active = null;
        set({ mode: 'device' });
        play(cur.i, cur.g);
      }
    });
    p.setPlaybackRate(rate().audio, 'high');
    p.play();
  };

  const finish = () => {
    s.gen += 1;
    s.active = null;
    set({ at: -1, status: 'idle' });
    s.onEnd?.();
  };

  const speakDevice = async (i, g) => {
    const u = s.units[i];
    const language = u.english ? 'en-US' : 'tr-TR';
    const voice = await voiceFor(language);
    if (g !== s.gen) return;
    if (language === 'en-US' && s.voiceTier !== voice.tier) set({ voiceTier: voice.tier });
    Speech.speak(u.text, {
      language,
      voice: voice.id,
      rate: rate().speech,
      onDone: () => {
        if (g === s.gen) play(i + 1, g);
      },
      // Dışarıdan durdurma (ör. sözlükte "Dinle") ya da hata: kaldığı cümlede duraklar.
      onStopped: () => {
        if (g !== s.gen) return;
        s.gen += 1;
        set({ status: 'paused' });
      },
      onError: () => {
        if (g !== s.gen) return;
        s.gen += 1;
        set({ status: 'paused' });
      },
    });
  };

  const prefetch = (base, i) => {
    for (let k = i + 1; k <= i + AHEAD && k < s.units.length; k += 1) {
      const u = s.units[k];
      if (u.english) preload({ uri: uriOf(base, u) }).catch(() => fetch(uriOf(base, u)).catch(() => {}));
    }
  };

  async function play(i, g) {
    if (g !== s.gen) return;
    if (i >= s.units.length) {
      finish();
      return;
    }
    set({ at: i });
    const u = s.units[i];
    if (s.mode === 'cloud' && u.english) {
      let base = null;
      try {
        base = await baseUrl();
      } catch {
        base = null;
      }
      if (g !== s.gen) return;
      if (base) {
        playUri(uriOf(base, u), i, g);
        prefetch(base, i);
        return;
      }
      set({ mode: 'device' });
    }
    speakDevice(i, g);
  }

  const silence = () => {
    s.active = null;
    Speech.stop();
    s.player?.pause();
  };

  const start = (index) => {
    if (!s.units.length) return;
    const i = Math.min(Math.max(0, index), s.units.length - 1);
    s.gen += 1;
    const g = s.gen;
    silence();
    // Her başlatmada önce yapay zekâ sesi denenir (önceki bir kesinti kalıcı olmasın).
    set({ at: i, status: 'playing', mode: 'cloud' });
    // Sessiz modda da duyulsun; ekran kilitlenince sürsün (iOS UIBackgroundModes: audio, expo-audio eklentisi).
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true })
      .catch(() => {})
      .finally(() => play(i, g));
  };
  const halt = (status) => {
    s.gen += 1;
    silence();
    if (status === 'idle') releasePlayer();
    set(status === 'idle' ? { status, at: -1 } : { status });
  };

  return {
    configure: ({ units, lang, onEnd, code, position, title }) => {
      Object.assign(s, { units, lang, onEnd, code, position, title });
    },
    playFrom: (blockIndex) => {
      const i = s.units.findIndex((u) => u.block >= blockIndex);
      if (i >= 0) start(i);
      else s.onEnd?.();
    },
    toggle: () => (s.status === 'playing' ? halt('paused') : start(s.at >= 0 ? s.at : 0)),
    skip: (delta) => start((s.at >= 0 ? s.at : 0) + delta),
    setRate: (index) => {
      savedRate = index;
      set({ rate: index });
      if (s.status !== 'playing') return;
      // Yapay zekâ sesinde hız anında değişir; cihaz sesinde cümle yeniden başlar.
      if (s.active) s.player?.setPlaybackRate(READ_RATES[index].audio, 'high');
      else start(s.at);
    },
    pause: () => {
      if (s.status === 'playing') halt('paused');
    },
    stop: () => halt('idle'),
    closeTip: () => {
      tipClosed = true;
      emit({ tipClosed: true });
    },
    dispose: () => {
      s.gen += 1;
      s.active = null;
      Speech.stop();
      releasePlayer();
    },
  };
};

/**
 * Kitabı cümle cümle sesli okur: İngilizce cümleler sunucunun yapay zekâ sesiyle (önceden istenir, sunucuda saklanır),
 * Türkçe cümleler ve sunucu ulaşılamazsa cihaz sesiyle.
 * blocks: bölüm blokları; lang: 'en' | 'auto'; code/position: kitap ve bölüm (ses adresi için); title: kilit ekranı başlığı.
 * onEnd: bölümün son cümlesi bitti (okuyucu sonraki bölüme geçip playFrom(0) ile sürdürür).
 * → { status: 'idle'|'playing'|'paused', current: { block, sentence } | null, rate (READ_RATES sırası), showVoiceTip, playFrom, toggle, skip, setRate, pause, stop, closeTip }
 */
export function useReadAloud({ blocks, lang, onEnd, code, position, title }) {
  const units = useMemo(() => unitsOf(blocks, lang), [blocks, lang]);
  const [view, setView] = useState({ status: 'idle', at: -1, rate: savedRate, voiceTier: null, tipClosed, mode: 'cloud' });
  const [engine] = useState(() => createEngine((patch) => setView((v) => ({ ...v, ...patch }))));
  useEffect(() => {
    engine.configure({ units, lang, onEnd, code, position, title });
  }, [engine, units, lang, onEnd, code, position, title]);
  // Ekrandan çıkınca susar.
  useEffect(() => () => engine.dispose(), [engine]);

  const u = view.at >= 0 ? units[view.at] : null;
  return {
    ...engine,
    status: view.status,
    rate: view.rate,
    current: u ? { block: u.block, sentence: u.sentence } : null,
    // Yalnız cihaz sesine düşüldüyse ve cihazda kaliteli İngilizce ses yoksa indirme yolu gösterilir.
    showVoiceTip: view.mode === 'device' && view.voiceTier === 'basic' && !view.tipClosed,
  };
}
